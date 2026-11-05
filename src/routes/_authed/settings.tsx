import { convexQuery } from '@convex-dev/react-query'
import { createFileRoute } from '@tanstack/react-router'
import { useAction, useMutation } from 'convex/react'
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
import { messageFor } from '@/lib/errors'
import { useLiveQuery } from '@/lib/live'
import { loadQuery } from '@/lib/load'
import { displayChord } from '@/lib/music/chords'
import { m } from '@/paraglide/messages'
import { changeLocale, currentLocale } from '@/lib/locale'
import type { Lang } from '@/lib/locale'

export const Route = createFileRoute('/_authed/settings')({
  loader: async ({ context }) => {
    await loadQuery(context.queryClient, convexQuery(api.users.me, {}))
  },
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
        <ApiKeyCard last4={me?.ai?.last4} />
      </div>
    </div>
  )
}

function ApiKeyCard({ last4 }: { last4?: string }) {
  const saveKey = useMutation(api.users.saveAiKey)
  const deleteKey = useMutation(api.users.deleteAiKey)
  const testKey = useAction(api.importDrafts.testKey)
  const [apiKey, setApiKey] = useState('')
  const [busy, setBusy] = useState<'save' | 'test' | null>(null)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const fail = (error: unknown) => toast.error(messageFor(error))

  return (
    <SettingsCard
      icon={KeyRoundIcon}
      title={m.apiKey()}
      description={m.apiKeyHelp()}
      control={
        last4 ? (
          <Chip tone="success">
            <CheckCircle2Icon className="size-3" />
            {m.keyLast4({ last4 })}
          </Chip>
        ) : (
          <Chip>{m.notConnected()}</Chip>
        )
      }
    >
      <form
        className="flex flex-col gap-2 sm:flex-row"
        onSubmit={(event) => {
          event.preventDefault()
          if (!apiKey.trim()) return
          setBusy('save')
          saveKey({ apiKey: apiKey.trim() })
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
          aria-label={m.apiKey()}
          value={apiKey}
          autoComplete="off"
          placeholder={last4 ? m.replaceKeyPlaceholder() : 'AIza…'}
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
              testKey({})
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
        title={m.deleteKeyConfirm()}
        description={m.deleteKeyHint()}
        onConfirm={() => deleteKey({})}
      />
    </SettingsCard>
  )
}
