import { convexQuery } from '@convex-dev/react-query'
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useMutation } from 'convex/react'
import { cn } from 'cn'
import {
  ClipboardPasteIcon,
  FileImageIcon,
  KeyRoundIcon,
  LinkIcon,
  SparklesIcon,
  UploadIcon,
  MonitorPlayIcon,
  XIcon,
} from 'lucide-react'
import { useRef, useState } from 'react'
import { toast } from 'sonner'
import { api } from '../../../../convex/_generated/api'
import type { Id } from '../../../../convex/_generated/dataModel'
import { ContextMark } from '@/components/app/context-mark'
import { EmptyState } from '@/components/app/empty-state'
import { Field } from '@/components/app/field'
import { HeaderButton, PageHeader } from '@/components/app/page-header'
import { versionLine } from '@/components/sheet/song-sheet'
import { Segmented } from '@/components/app/segmented'
import { Button, ButtonLink } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { PROVIDER_LABELS } from '@/lib/import/models'
import { messageFor } from '@/lib/errors'
import { useLiveQuery } from '@/lib/live'
import { m } from '@/paraglide/messages'

export const Route = createFileRoute('/_authed/import/')({
  loader: ({ context }) => context.load(convexQuery(api.songs.catalog, {})),
  component: ImportPage,
})

type Source = 'paste' | 'file' | 'url' | 'youtube'

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
  const bands = useLiveQuery(convexQuery(api.bands.list, {}))
  const create = useMutation(api.importDrafts.create)
  const uploadUrl = useMutation(api.importDrafts.generateUploadUrl)
  const navigate = useNavigate()
  const fileInput = useRef<HTMLInputElement>(null)
  const [source, setSource] = useState<Source>('paste')
  const [text, setText] = useState('')
  const [url, setUrl] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [dragOver, setDragOver] = useState(false)
  const [youtube, setYoutube] = useState('')
  const [description, setDescription] = useState('')
  const [transcript, setTranscript] = useState('')
  const [target, setTarget] = useState('new')
  const [busy, setBusy] = useState(false)

  const ai = me.data?.ai
  if (!ai) {
    return (
      <div>
        <PageHeader title={m.importLabel()} subtitle={m.importHint()} />
        <EmptyState
          icon={KeyRoundIcon}
          title={m.noApiKey()}
          description={m.noApiKeyHint()}
          action={
            <ButtonLink to="/settings">
              <KeyRoundIcon />
              {m.addApiKey()}
            </ButtonLink>
          }
        />
      </div>
    )
  }

  const unsupported =
    source === 'file' &&
    file !== null &&
    (file.type === 'application/pdf' ? !ai.pdf : !ai.vision)

  const videoId = youtubeIdOf(youtube)
  const ready =
    !unsupported &&
    ((source === 'paste' && text.trim().length > 0) ||
      (source === 'file' && file !== null) ||
      (source === 'url' && /^https?:\/\/\S+$/.test(url.trim())) ||
      (source === 'youtube' && videoId !== null))

  const pickFile = (next: File | undefined) => {
    if (!next) return
    if (!next.type.startsWith('image/') && next.type !== 'application/pdf') {
      toast.error(m.unsupportedFile())
      return
    }
    setFile(next)
  }

  const start = async () => {
    setBusy(true)
    try {
      const homeBandId = target.startsWith('band:')
        ? (target.slice(5) as Id<'bands'>)
        : undefined
      const targetVersionId =
        target === 'new' || homeBandId ? undefined : (target as Id<'versions'>)
      let draftId: Id<'importDrafts'>
      if (source === 'paste') {
        draftId = await create({
          sourceKind: 'paste',
          sourceText: text,
          targetVersionId,
          homeBandId,
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
          homeBandId,
        })
      } else if (source === 'youtube') {
        draftId = await create({
          sourceKind: 'youtube',
          youtubeId: videoId ?? undefined,
          sourceText: [description, transcript].filter(Boolean).join('\n\n'),
          targetVersionId,
          homeBandId,
        })
      } else {
        draftId = await create({
          sourceKind: 'url',
          sourceText: url.trim(),
          targetVersionId,
          homeBandId,
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
              accept="image/*,application/pdf"
              className="sr-only"
              tabIndex={-1}
              onChange={(event) => pickFile(event.target.files?.[0])}
            />
            {file ? (
              <div className="flex items-center gap-3 rounded-2xl border bg-background/50 p-4">
                <div className="grid size-11 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">
                  <FileImageIcon className="size-5" />
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
                  onPress={() => {
                    setFile(null)
                    if (fileInput.current) fileInput.current.value = ''
                  }}
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
                  pickFile(event.dataTransfer.files[0])
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

        {unsupported ? (
          <p className="rounded-2xl border border-destructive/30 bg-destructive/5 p-4 text-sm">
            {m.errorModelUnsupported()}
          </p>
        ) : null}

        <div className="flex items-end gap-3">
          <div className="min-w-0 flex-1">
            <Select
              label={m.targetVersion()}
              value={target}
              onChange={setTarget}
              options={[
                {
                  id: 'new',
                  label: m.newSongFromImport(),
                  description: m.personal(),
                },
                ...bands.data
                  .filter((row) => row.membership.role !== 'viewer')
                  .map((row) => ({
                    id: `band:${row.band._id}`,
                    label: m.newSongFromImport(),
                    description: row.band.name,
                  })),
                ...catalog.data.flatMap((row) =>
                  row.versions
                    .filter((version) => version.canEdit)
                    .map((version) => ({
                      id: version._id,
                      label: row.song.title,
                      description: versionLine(version.name, version.artist),
                    })),
                ),
              ]}
            />
          </div>
          <ImportTargetMark
            target={target}
            bands={bands.data}
            catalog={catalog.data}
          />
        </div>

        <div className="flex items-center justify-between gap-4 border-t pt-5">
          <p className="text-xs text-muted-foreground">
            {m.importPrivacy({ provider: PROVIDER_LABELS[ai.provider] })}
          </p>
          <HeaderButton type="submit" isDisabled={!ready || busy}>
            <SparklesIcon />
            {busy ? m.starting() : m.startImport()}
          </HeaderButton>
        </div>
      </form>
    </div>
  )
}

function ImportTargetMark({
  target,
  bands,
  catalog,
}: {
  target: string
  bands: Array<{ band: { _id: string; name: string } }>
  catalog: Array<{
    versions: Array<{
      _id: string
      ownerBandId: string | null
      ownerName: string | null
    }>
  }>
}) {
  if (target.startsWith('band:')) {
    const band = bands.find((row) => `band:${row.band._id}` === target)
    return (
      <ContextMark
        bandId={band?.band._id}
        name={band?.band.name}
        className="mb-1.5"
      />
    )
  }
  for (const row of catalog) {
    const version = row.versions.find((item) => item._id === target)
    if (version) return <ContextMark {...version} className="mb-1.5" />
  }
  return <ContextMark className="mb-1.5" />
}
