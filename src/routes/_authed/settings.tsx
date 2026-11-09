import { convexQuery } from '@convex-dev/react-query'
import { createFileRoute } from '@tanstack/react-router'
import { useAction, useMutation } from 'convex/react'
import { cn } from 'cn'
import {
  CheckCircle2Icon,
  KeyRoundIcon,
  LanguagesIcon,
  MonitorIcon,
  MoonIcon,
  MusicIcon,
  PaletteIcon,
  SunIcon,
} from 'lucide-react'
import { useTheme } from 'next-themes'
import { useEffect, useState } from 'react'
import type * as React from 'react'
import { toast } from 'sonner'
import { api } from '../../../convex/_generated/api'
import { Chip } from '@/components/app/chip'
import { ConfirmDialog } from '@/components/app/confirm-dialog'
import { PageHeader } from '@/components/app/page-header'
import { Segmented } from '@/components/app/segmented'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { messageFor } from '@/lib/errors'
import { AI_MODELS, AI_PROVIDERS, PROVIDER_LABELS } from '@/lib/import/models'
import type { AiProvider } from '@/lib/import/models'
import { useLiveQuery } from '@/lib/live'
import { displayChord } from '@/lib/music/chords'
import { m } from '@/paraglide/messages'
import { changeLocale, currentLocale } from '@/lib/locale'
import type { Lang } from '@/lib/locale'

export const Route = createFileRoute('/_authed/settings')({
  component: SettingsPage,
})

function SettingsCard({
  icon: Icon,
  title,
  description,
  control,
  children,
}: {
  icon: React.ComponentType<{ className?: string }>
  title: React.ReactNode
  description?: React.ReactNode
  control?: React.ReactNode
  children?: React.ReactNode
}) {
  return (
    <section className="rounded-2xl border bg-card p-5 sm:p-6">
      <div className="flex flex-wrap items-center gap-4">
        <div className="grid size-10 shrink-0 place-items-center rounded-xl bg-muted text-foreground">
          <Icon className="size-5" />
        </div>
        <div className="min-w-0 flex-1 basis-48">
          <h2 className="font-semibold">{title}</h2>
          {description ? (
            <p className="text-sm text-muted-foreground">{description}</p>
          ) : null}
        </div>
        {control}
      </div>
      {children ? <div className="mt-5">{children}</div> : null}
    </section>
  )
}

type ThemeChoice = 'dark' | 'light' | 'system'

function SettingsPage() {
  const me = useLiveQuery(convexQuery(api.users.me, {})).data
  const setPreferences = useMutation(api.users.setPreferences)
  const { theme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])

  const fail = (error: unknown) => toast.error(messageFor(error))
  const notation = me?.notation ?? 'en'

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader title={m.settings()} subtitle={m.settingsHint()} />
      <div className="space-y-4">
        <SettingsCard
          icon={PaletteIcon}
          title={m.appearance()}
          description={m.appearanceHint()}
          control={
            <Segmented
              aria-label={m.appearance()}
              value={(mounted ? theme : 'dark') as ThemeChoice}
              onChange={setTheme}
              options={[
                { id: 'dark', label: m.themeDark(), icon: MoonIcon },
                { id: 'light', label: m.themeLight(), icon: SunIcon },
                { id: 'system', label: m.themeSystem(), icon: MonitorIcon },
              ]}
            />
          }
        />
        <SettingsCard
          icon={LanguagesIcon}
          title={m.language()}
          description={m.languageHint()}
          control={
            <Segmented
              aria-label={m.language()}
              value={currentLocale()}
              onChange={(locale: Lang) => {
                void setPreferences({ locale })
                  .catch(fail)
                  .finally(() => changeLocale(locale))
              }}
              options={[
                { id: 'en', label: 'English' },
                { id: 'de', label: 'Deutsch' },
              ]}
            />
          }
        />
        <SettingsCard
          icon={MusicIcon}
          title={m.notation()}
          description={m.notationHint()}
          control={
            <Segmented
              aria-label={m.notation()}
              value={notation}
              onChange={(next: Lang) =>
                void setPreferences({ notation: next }).catch(fail)
              }
              options={[
                { id: 'en', label: m.englishNotes() },
                { id: 'de', label: m.germanNotes() },
              ]}
            />
          }
        >
          <div className="flex flex-wrap gap-1.5 font-mono text-sm">
            {['C', 'E', 'F#m', 'Bb', 'B7', 'Bm'].map((symbol) => (
              <span
                key={symbol}
                className="rounded-md border bg-background/50 px-2 py-1 font-semibold text-chord"
              >
                {displayChord(symbol, 0, 0, notation)}
              </span>
            ))}
          </div>
        </SettingsCard>
        <AiCard model={me?.ai?.model ?? null} keys={me?.aiKeys ?? []} />
      </div>
    </div>
  )
}

const KEY_PLACEHOLDER: Record<AiProvider, string> = {
  google: 'AIza…',
  openai: 'sk-…',
  anthropic: 'sk-ant-…',
}

const PROVIDER_HINTS: Record<AiProvider, () => string> = {
  google: m.providerGoogleHint,
  openai: m.providerOpenaiHint,
  anthropic: m.providerAnthropicHint,
}

function AiCard({
  model,
  keys,
}: {
  model: string | null
  keys: Array<{ provider: AiProvider; last4: string }>
}) {
  const setAiModel = useMutation(api.users.setAiModel)
  const withKey = new Set(keys.map((key) => key.provider))

  return (
    <SettingsCard
      icon={KeyRoundIcon}
      title={m.apiKey()}
      description={m.apiKeyHelp()}
    >
      <div className="space-y-5">
        {keys.length > 0 ? (
          <div className="space-y-1.5">
            <Select
              label={m.aiModel()}
              value={model}
              onChange={(next) =>
                void setAiModel({ model: next }).catch((error: unknown) =>
                  toast.error(messageFor(error)),
                )
              }
              options={AI_MODELS.map((item) => ({
                id: item.id,
                label: item.label,
                description:
                  item.provider === 'google'
                    ? `${PROVIDER_LABELS[item.provider]} · ${m.freeTier()}`
                    : PROVIDER_LABELS[item.provider],
                isDisabled: !withKey.has(item.provider),
              }))}
            />
            <p className="text-xs text-muted-foreground">{m.aiModelHint()}</p>
          </div>
        ) : null}
        {AI_PROVIDERS.map((provider, index) => (
          <ProviderKeyRow
            key={provider}
            divided={index > 0 || keys.length > 0}
            provider={provider}
            last4={keys.find((key) => key.provider === provider)?.last4}
          />
        ))}
      </div>
    </SettingsCard>
  )
}

function ProviderKeyRow({
  provider,
  last4,
  divided,
}: {
  provider: AiProvider
  last4?: string
  divided: boolean
}) {
  const saveKey = useMutation(api.users.saveAiKey)
  const deleteKey = useMutation(api.users.deleteAiKey)
  const testKey = useAction(api.importDrafts.testKey)
  const [apiKey, setApiKey] = useState('')
  const [busy, setBusy] = useState<'save' | 'test' | null>(null)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const fail = (error: unknown) => toast.error(messageFor(error))
  const label = PROVIDER_LABELS[provider]

  return (
    <div className={cn(divided && 'border-t pt-5')}>
      <div className="mb-2 flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <h3 className="text-sm font-semibold">{label}</h3>
          <p className="text-xs text-muted-foreground">
            {PROVIDER_HINTS[provider]()}
          </p>
        </div>
        {last4 ? (
          <Chip tone="success">
            <CheckCircle2Icon className="size-3" />
            {m.keyLast4({ last4 })}
          </Chip>
        ) : (
          <Chip>{m.notConnected()}</Chip>
        )}
      </div>
      <form
        className="flex flex-col gap-2 sm:flex-row"
        onSubmit={(event) => {
          event.preventDefault()
          if (!apiKey.trim()) return
          setBusy('save')
          saveKey({ provider, apiKey: apiKey.trim() })
            .then(() => {
              setApiKey('')
              toast.success(m.keySaved())
            })
            .catch(fail)
            .finally(() => setBusy(null))
        }}
      >
        <Input
          type="password"
          aria-label={label}
          value={apiKey}
          autoComplete="off"
          placeholder={
            last4 ? m.replaceKeyPlaceholder() : KEY_PLACEHOLDER[provider]
          }
          onChange={(event) => setApiKey(event.target.value)}
          className="h-10 font-mono"
        />
        <Button
          type="submit"
          className="h-10"
          isDisabled={busy !== null || !apiKey.trim()}
        >
          {m.saveKey()}
        </Button>
      </form>
      {last4 ? (
        <div className="mt-3 flex flex-wrap gap-2">
          <Button
            variant="outline"
            isDisabled={busy !== null}
            onPress={() => {
              setBusy('test')
              testKey({ provider })
                .then(() => toast.success(m.keyWorks()))
                .catch(fail)
                .finally(() => setBusy(null))
            }}
          >
            {busy === 'test' ? m.testing() : m.testKey()}
          </Button>
          <Button
            variant="ghost"
            className="text-muted-foreground hover:text-destructive"
            onPress={() => setConfirmDelete(true)}
          >
            {m.deleteKey()}
          </Button>
        </div>
      ) : null}
      <ConfirmDialog
        isOpen={confirmDelete}
        onOpenChange={setConfirmDelete}
        title={m.deleteKeyConfirm({ provider: label })}
        description={m.deleteKeyHint()}
        onConfirm={() => deleteKey({ provider })}
      />
    </div>
  )
}
