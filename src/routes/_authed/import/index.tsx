import { convexQuery } from '@convex-dev/react-query'
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useMutation } from 'convex/react'
import { cn } from 'cn'
import {
  ArrowRightIcon,
  ClipboardPasteIcon,
  FileImageIcon,
  FileTextIcon,
  KeyRoundIcon,
  LinkIcon,
  SparklesIcon,
  UploadIcon,
  MonitorPlayIcon,
  XIcon,
} from 'lucide-react'
import { useMemo, useRef, useState } from 'react'
import { toast } from 'sonner'
import { api } from '../../../../convex/_generated/api'
import type { Id } from '../../../../convex/_generated/dataModel'
import { Field } from '@/components/app/field'
import { PageHeader } from '@/components/app/page-header'
import { Segmented } from '@/components/app/segmented'
import { Button, ButtonLink } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { Textarea } from '@/components/ui/textarea'
import { normalizeDraft } from '@/lib/import/normalize'
import { parseSongText } from '@/lib/import/text'
import { messageFor } from '@/lib/errors'
import { useLiveQuery } from '@/lib/live'
import { loadQuery } from '@/lib/load'
import { currentLocale } from '@/lib/locale'
import { m } from '@/paraglide/messages'

export const Route = createFileRoute('/_authed/import/')({
  loader: async ({ context }) => {
    await Promise.all([
      loadQuery(context.queryClient, convexQuery(api.users.me, {})),
      loadQuery(context.queryClient, convexQuery(api.songs.catalog, {})),
    ])
  },
  component: ImportPage,
})

type Source = 'paste' | 'file' | 'url' | 'youtube'

const TEXT_FILE = /\.(?:cho|chopro|chordpro|crd|pro|txt)$/i
const MAX_TEXT_FILE = 200_000

function isTextFile(file: File) {
  return TEXT_FILE.test(file.name) || file.type.startsWith('text/')
}

function youtubeIdOf(value: string) {
  const trimmed = value.trim()
  const fromUrl = trimmed.match(
    /(?:youtu\.be\/|[?&]v=|\/embed\/|\/shorts\/)([A-Za-z0-9_-]{11})/,
  )
  if (fromUrl) return fromUrl[1]
  return /^[A-Za-z0-9_-]{11}$/.test(trimmed) ? trimmed : null
}

function ImportPage() {
  const me = useLiveQuery(convexQuery(api.users.me, {}))
  const catalog = useLiveQuery(convexQuery(api.songs.catalog, {}))
  const create = useMutation(api.importDrafts.create)
  const createParsed = useMutation(api.importDrafts.createParsed)
  const uploadUrl = useMutation(api.importDrafts.generateUploadUrl)
  const navigate = useNavigate()
  const fileInput = useRef<HTMLInputElement>(null)
  const [source, setSource] = useState<Source>('paste')
  const [text, setText] = useState('')
  const [url, setUrl] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [fileText, setFileText] = useState<string | null>(null)
  const [dragOver, setDragOver] = useState(false)
  const [youtube, setYoutube] = useState('')
  const [description, setDescription] = useState('')
  const [transcript, setTranscript] = useState('')
  const [target, setTarget] = useState('new')
  const [aiChoice, setAiChoice] = useState<boolean | null>(null)
  const [busy, setBusy] = useState(false)

  const hasKey = Boolean(me.data?.ai)
  const sourceText =
    source === 'paste' ? text : source === 'file' ? fileText : null
  const locale = currentLocale()
  const analysis = useMemo(
    () => (sourceText?.trim() ? parseSongText(sourceText, locale) : null),
    [sourceText, locale],
  )
  const aiOnly =
    source === 'url' ||
    source === 'youtube' ||
    (source === 'file' && file !== null && fileText === null)
  const useAi = analysis ? hasKey && (aiChoice ?? !analysis.strong) : aiOnly
  const needsKey = useAi && !hasKey

  const videoId = youtubeIdOf(youtube)
  const ready =
    !needsKey &&
    ((source === 'paste' && text.trim().length > 0) ||
      (source === 'file' && file !== null) ||
      (source === 'url' && /^https?:\/\/\S+$/.test(url.trim())) ||
      (source === 'youtube' && videoId !== null))

  const clearFile = () => {
    setFile(null)
    setFileText(null)
    if (fileInput.current) fileInput.current.value = ''
  }

  const pickFile = async (next: File | undefined) => {
    if (!next) return
    if (isTextFile(next)) {
      if (next.size > MAX_TEXT_FILE) {
        toast.error(m.unsupportedFile())
        return
      }
      setFile(next)
      setFileText(await next.text())
      return
    }
    if (!next.type.startsWith('image/') && next.type !== 'application/pdf') {
      toast.error(m.unsupportedFile())
      return
    }
    setFile(next)
    setFileText(null)
  }

  const start = async () => {
    setBusy(true)
    try {
      const targetVersionId =
        target === 'new' ? undefined : (target as Id<'versions'>)
      let draftId: Id<'importDrafts'>
      if (analysis && sourceText && !useAi) {
        const normalized = normalizeDraft(analysis.draft)
        draftId = await createParsed({
          sourceText,
          output: normalized.output,
          warnings: [...analysis.warnings, ...normalized.warnings],
          targetVersionId,
        })
      } else if (sourceText !== null) {
        draftId = await create({
          sourceKind: 'paste',
          sourceText,
          targetVersionId,
        })
      } else if (source === 'file' && file) {
        const postUrl = await uploadUrl({})
        const response = await fetch(postUrl, {
          method: 'POST',
          headers: { 'Content-Type': file.type || 'application/octet-stream' },
          body: file,
        })
        const payload = (await response.json()) as {
          storageId: Id<'_storage'>
        }
        draftId = await create({
          sourceKind: file.type === 'application/pdf' ? 'pdf' : 'photo',
          storageId: payload.storageId,
          targetVersionId,
        })
      } else if (source === 'youtube') {
        draftId = await create({
          sourceKind: 'youtube',
          youtubeId: videoId ?? undefined,
          sourceText: [description, transcript].filter(Boolean).join('\n\n'),
          targetVersionId,
        })
      } else {
        draftId = await create({
          sourceKind: 'url',
          sourceText: url.trim(),
          targetVersionId,
        })
      }
      await navigate({ to: '/import/$draftId', params: { draftId } })
    } catch (error) {
      toast.error(messageFor(error))
      setBusy(false)
    }
  }

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader title={m.importLabel()} subtitle={m.importHint()} />
      <form
        className="space-y-6 rounded-3xl border bg-card p-5 sm:p-7"
        onSubmit={(event) => {
          event.preventDefault()
          if (ready && !busy) void start()
        }}
      >
        <div className="-mx-1 overflow-x-auto px-1">
          <Segmented
            aria-label={m.importSource()}
            value={source}
            onChange={setSource}
            className="w-full min-w-max"
            options={[
              { id: 'paste', label: m.paste(), icon: ClipboardPasteIcon },
              { id: 'file', label: m.photo(), icon: FileImageIcon },
              { id: 'url', label: m.url(), icon: LinkIcon },
              { id: 'youtube', label: m.youtube(), icon: MonitorPlayIcon },
            ]}
          />
        </div>

        {source === 'paste' ? (
          <Field label={m.sourceText()} hint={m.pasteHint()}>
            <Textarea
              autoFocus
              value={text}
              rows={12}
              placeholder={m.pastePlaceholder()}
              onChange={(event) => setText(event.target.value)}
              className="font-mono text-sm leading-relaxed"
            />
          </Field>
        ) : null}

        {source === 'file' ? (
          <div>
            <input
              ref={fileInput}
              type="file"
              accept="image/*,application/pdf,text/plain,.cho,.chopro,.chordpro,.crd,.pro,.txt"
              className="sr-only"
              tabIndex={-1}
              onChange={(event) => void pickFile(event.target.files?.[0])}
            />
            {file ? (
              <div className="flex items-center gap-3 rounded-2xl border bg-background/50 p-4">
                <div className="grid size-11 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">
                  {fileText === null ? (
                    <FileImageIcon className="size-5" />
                  ) : (
                    <FileTextIcon className="size-5" />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="truncate font-medium">{file.name}</div>
                  <div className="text-xs text-muted-foreground">
                    {(file.size / 1024 / 1024).toFixed(1)} MB
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label={m.remove()}
                  onPress={clearFile}
                >
                  <XIcon />
                </Button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => fileInput.current?.click()}
                onDragOver={(event) => {
                  event.preventDefault()
                  setDragOver(true)
                }}
                onDragLeave={() => setDragOver(false)}
                onDrop={(event) => {
                  event.preventDefault()
                  setDragOver(false)
                  void pickFile(event.dataTransfer.files[0])
                }}
                className={cn(
                  'flex w-full flex-col items-center gap-3 rounded-2xl border-2 border-dashed px-6 py-12 text-center transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring',
                  dragOver
                    ? 'border-primary bg-primary/10'
                    : 'border-border hover:border-primary/50 hover:bg-muted/30',
                )}
              >
                <div className="grid size-12 place-items-center rounded-2xl bg-muted text-foreground">
                  <UploadIcon className="size-5" />
                </div>
                <div>
                  <div className="font-medium">{m.dropFile()}</div>
                  <div className="text-sm text-muted-foreground">
                    {m.dropFileHint()}
                  </div>
                </div>
              </button>
            )}
          </div>
        ) : null}

        {source === 'url' ? (
          <Field label={m.url()} hint={m.urlHint()}>
            <Input
              autoFocus
              type="url"
              value={url}
              placeholder="https://"
              onChange={(event) => setUrl(event.target.value)}
            />
          </Field>
        ) : null}

        {source === 'youtube' ? (
          <div className="grid gap-4">
            <Field label={m.youtubeId()} hint={m.youtubeHint()}>
              <Input
                autoFocus
                value={youtube}
                placeholder="https://youtu.be/…"
                onChange={(event) => setYoutube(event.target.value)}
                aria-invalid={youtube.trim() !== '' && videoId === null}
              />
            </Field>
            <Field label={m.description()}>
              <Textarea
                value={description}
                rows={3}
                onChange={(event) => setDescription(event.target.value)}
              />
            </Field>
            <Field label={m.transcript()}>
              <Textarea
                value={transcript}
                rows={5}
                onChange={(event) => setTranscript(event.target.value)}
              />
            </Field>
          </div>
        ) : null}

        {analysis ? (
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border bg-background/50 p-4 text-sm">
            <div className="min-w-0">
              <div className="font-medium">
                {m.textAnalysis({
                  sections: analysis.stats.sections,
                  chords: analysis.stats.chords,
                  tabs: analysis.stats.tabMeasures,
                })}
              </div>
              <div className="text-muted-foreground">
                {useAi
                  ? analysis.strong
                    ? m.useAiHint()
                    : m.textWeakAi()
                  : analysis.strong
                    ? m.textReadsFree()
                    : m.textWeakNoKey()}
              </div>
            </div>
            {hasKey ? (
              <Switch
                isSelected={useAi}
                onChange={setAiChoice}
                className="gap-2"
              >
                {m.useAi()}
              </Switch>
            ) : null}
          </div>
        ) : null}

        {needsKey ? (
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-primary/30 bg-primary/5 p-4">
            <div className="flex min-w-0 items-start gap-3">
              <KeyRoundIcon className="mt-0.5 size-5 shrink-0 text-primary" />
              <div>
                <div className="font-medium">{m.noApiKey()}</div>
                <p className="text-sm text-muted-foreground">
                  {m.noApiKeyHint()}
                </p>
              </div>
            </div>
            <ButtonLink to="/settings" variant="outline">
              {m.addApiKey()}
            </ButtonLink>
          </div>
        ) : null}

        <Select
          label={m.targetVersion()}
          value={target}
          onChange={setTarget}
          options={[
            {
              id: 'new',
              label: m.newSongFromImport(),
              description: m.newSongFromImportHint(),
            },
            ...catalog.data.flatMap((row) =>
              row.versions.map((version) => ({
                id: version._id,
                label: row.song.title,
                description: version.name,
              })),
            ),
          ]}
        />

        <div className="flex items-center justify-between gap-4 border-t pt-5">
          <p className="text-xs text-muted-foreground">
            {useAi ? m.importPrivacy() : m.importPrivacyLocal()}
          </p>
          <Button type="submit" size="lg" isDisabled={!ready || busy}>
            {useAi ? <SparklesIcon /> : <ArrowRightIcon />}
            {busy ? m.starting() : m.startImport()}
          </Button>
        </div>
      </form>
    </div>
  )
}
