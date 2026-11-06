import { convexQuery } from '@convex-dev/react-query'
import { useQuery } from '@tanstack/react-query'
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useMutation } from 'convex/react'
import { ConvexError } from 'convex/values'
import { cn } from 'cn'
import {
  CheckIcon,
  CircleAlertIcon,
  LoaderCircleIcon,
  SaveIcon,
  SparklesIcon,
  Trash2Icon,
  TriangleAlertIcon,
} from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'
import { api } from '../../../../convex/_generated/api'
import type { Doc, Id } from '../../../../convex/_generated/dataModel'
import { ConfirmDialog } from '@/components/app/confirm-dialog'
import { Field } from '@/components/app/field'
import { Crumb, PageHeader, SectionTitle } from '@/components/app/page-header'
import { SongSheet } from '@/components/sheet/song-sheet'
import type { SheetEntry } from '@/components/sheet/types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { useNotation } from '@/components/use-notation'
import { messageFor } from '@/lib/errors'
import { useLiveQuery } from '@/lib/live'
import { loadQuery } from '@/lib/load'
import { m } from '@/paraglide/messages'

export const Route = createFileRoute('/_authed/import/$draftId')({
  loader: async ({ context, params }) => {
    await Promise.all([
      loadQuery(
        context.queryClient,
        convexQuery(api.importDrafts.get, {
          draftId: params.draftId as Id<'importDrafts'>,
        }),
      ),
      loadQuery(context.queryClient, convexQuery(api.users.me, {})),
    ])
  },
  component: ReviewPage,
})

type Draft = Doc<'importDrafts'>
type Output = NonNullable<Draft['output']>

const STEPS = ['queued', 'reading', 'structuring', 'ready'] as const

function stepLabel(step: (typeof STEPS)[number]) {
  if (step === 'queued') return m.statusQueued()
  if (step === 'reading') return m.statusReading()
  if (step === 'structuring') return m.statusStructuring()
  return m.statusReady()
}

function warningText(warning: string) {
  if (warning === 'outOfRange') return m.outOfRange()
  if (warning === 'noChords') return m.noChordsFound()
  return warning
}

function StatusSteps({ status }: { status: Draft['status'] }) {
  const failed = status === 'failed'
  const current = failed ? -1 : STEPS.indexOf(status)
  return (
    <ol className="flex flex-wrap items-center gap-x-2 gap-y-3">
      {STEPS.map((step, index) => {
        const done = index < current || status === 'ready'
        const active = index === current && status !== 'ready'
        return (
          <li key={step} className="flex items-center gap-2">
            {index > 0 ? (
              <span
                className={cn(
                  'h-px w-6 sm:w-10',
                  done || active ? 'bg-primary/60' : 'bg-border',
                )}
              />
            ) : null}
            <span
              className={cn(
                'grid size-7 place-items-center rounded-full border text-xs font-semibold',
                done && 'border-primary bg-primary text-primary-foreground',
                active && 'border-primary text-primary',
                !done && !active && 'text-muted-foreground',
              )}
            >
              {done ? (
                <CheckIcon className="size-3.5" />
              ) : active ? (
                <LoaderCircleIcon className="size-3.5 animate-spin" />
              ) : (
                index + 1
              )}
            </span>
            <span
              className={cn(
                'text-sm',
                active
                  ? 'font-medium text-foreground'
                  : 'text-muted-foreground',
              )}
            >
              {stepLabel(step)}
            </span>
          </li>
        )
      })}
    </ol>
  )
}

function previewTimeline(output: Output): Array<SheetEntry> {
  return output.sections.map((section, sectionIndex) => ({
    entryId: `draft-${sectionIndex}`,
    section: {
      _id: `draft-section-${sectionIndex}`,
      name: section.name,
      notes: section.notes,
    },
    parts: section.parts.map((part, partIndex) => ({
      _id: `draft-${sectionIndex}-${partIndex}`,
      kind: part.kind,
      label: part.label,
      chartBody: part.chartBody,
      strumming: part.strumming,
      measures: part.measures,
    })),
  }))
}

function ReviewPage() {
  const draftId = Route.useParams().draftId as Id<'importDrafts'>
  const draft = useLiveQuery(
    convexQuery(api.importDrafts.get, { draftId }),
  ).data
  const me = useLiveQuery(convexQuery(api.users.me, {})).data
  const discard = useMutation(api.importDrafts.discard)
  const retryWithAi = useMutation(api.importDrafts.retryWithAi)
  const navigate = useNavigate()
  const working = draft.status !== 'ready' && draft.status !== 'failed'
  const videoId = draft.youtubeId?.match(/[A-Za-z0-9_-]{11}/)?.[0]

  return (
    <div>
      <PageHeader
        breadcrumbs={[
          <Crumb key="import" to="/import">
            {m.importLabel()}
          </Crumb>,
          <span key="review" className="text-foreground">
            {m.review()}
          </span>,
        ]}
        title={draft.output?.title ?? m.review()}
        subtitle={draft.output?.artist}
      />

      <div className="mb-8 rounded-2xl border bg-card p-4 sm:p-5">
        {draft.parser === 'text' ? (
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-start gap-3">
              <CheckIcon className="mt-0.5 size-5 shrink-0 text-primary" />
              <div>
                <div className="font-medium">{m.readWithoutAi()}</div>
                <p className="text-sm text-muted-foreground">
                  {m.readWithoutAiHint()}
                </p>
              </div>
            </div>
            {me?.ai ? (
              <Button
                variant="outline"
                onPress={() =>
                  void retryWithAi({ draftId }).catch((error: unknown) =>
                    toast.error(messageFor(error)),
                  )
                }
              >
                <SparklesIcon />
                {m.tryWithAi()}
              </Button>
            ) : null}
          </div>
        ) : (
          <StatusSteps status={draft.status} />
        )}
        {draft.status === 'failed' ? (
          <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-destructive/30 bg-destructive/5 p-4">
            <div className="flex items-start gap-3">
              <CircleAlertIcon className="mt-0.5 size-5 shrink-0 text-destructive" />
              <div>
                <div className="font-medium">{m.statusFailed()}</div>
                {draft.error ? (
                  <p className="text-sm text-muted-foreground">
                    {messageFor(new ConvexError(draft.error))}
                  </p>
                ) : null}
              </div>
            </div>
            <Button
              variant="outline"
              onPress={() =>
                void discard({ draftId }).then(() =>
                  navigate({ to: '/import' }),
                )
              }
            >
              {m.startOver()}
            </Button>
          </div>
        ) : working ? (
          <p className="mt-3 text-sm text-muted-foreground">
            {m.importWorkingHint()}
          </p>
        ) : null}
      </div>

      {videoId ? (
        <iframe
          className="mb-8 aspect-video w-full max-w-3xl rounded-2xl border"
          src={`https://www.youtube.com/embed/${videoId}`}
          title={m.youtube()}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        />
      ) : null}

      {draft.output ? (
        <ReadyReview
          key={draft.output.title}
          draft={draft}
          output={draft.output}
        />
      ) : working ? (
        <div className="space-y-4 rounded-3xl border bg-card p-6 sm:p-10">
          <Skeleton className="h-9 w-1/2" />
          <Skeleton className="h-5 w-1/3" />
          <div className="flex gap-3 pt-4">
            {Array.from({ length: 4 }, (_, index) => (
              <Skeleton key={index} className="h-24 w-20" />
            ))}
          </div>
          <Skeleton className="h-40 w-full" />
        </div>
      ) : null}
    </div>
  )
}

function ReadyReview({ draft, output }: { draft: Draft; output: Output }) {
  const updateOutput = useMutation(api.importDrafts.updateOutput)
  const save = useMutation(api.importDrafts.save)
  const discard = useMutation(api.importDrafts.discard)
  const navigate = useNavigate()
  const notation = useNotation()
  const [title, setTitle] = useState(output.title)
  const [artist, setArtist] = useState(output.artist)
  const [mapping, setMapping] = useState<Array<string | null>>(draft.mapping)
  const [busy, setBusy] = useState(false)
  const [duplicate, setDuplicate] = useState<{
    existing: Id<'songs'>
    title: string
  } | null>(null)
  const target = useQuery({
    ...convexQuery(
      api.versions.getBundle,
      draft.targetVersionId ? { versionId: draft.targetVersionId } : 'skip',
    ),
    enabled: Boolean(draft.targetVersionId),
  })
  const targetTimeline = (target.data?.timeline ?? []) as Array<SheetEntry>
  const targetSections = [
    ...new Map(
      targetTimeline.map((entry) => [entry.section._id, entry.section]),
    ).values(),
  ]

  const commit = async (intoSongId?: Id<'songs'>) => {
    setBusy(true)
    try {
      await updateOutput({
        draftId: draft._id,
        output: { ...output, title, artist },
        mapping,
      })
      const saved = await save({ draftId: draft._id, intoSongId })
      if (!saved.versionId) {
        if (saved.existing)
          setDuplicate({ existing: saved.existing, title: saved.title })
        setBusy(false)
        return
      }
      toast.success(
        intoSongId && duplicate
          ? m.addedAsVersion({ title: duplicate.title })
          : m.importSaved(),
      )
      await navigate({
        to: '/versions/$versionId/edit',
        params: { versionId: saved.versionId },
      })
    } catch (error) {
      toast.error(messageFor(error))
      setBusy(false)
    }
  }

  return (
    <div className="grid items-start gap-8 lg:grid-cols-[22rem_minmax(0,1fr)]">
      <aside className="space-y-5 lg:sticky lg:top-6">
        <div className="space-y-4 rounded-2xl border bg-card p-5">
          <Field label={m.title()}>
            <Input
              value={title}
              onChange={(event) => setTitle(event.target.value)}
            />
          </Field>
          <Field label={m.artist()}>
            <Input
              value={artist}
              onChange={(event) => setArtist(event.target.value)}
            />
          </Field>
        </div>

        {draft.warnings.length > 0 ? (
          <div className="rounded-2xl border border-destructive/30 bg-destructive/5 p-4">
            <div className="mb-2 flex items-center gap-2 text-sm font-medium">
              <TriangleAlertIcon className="size-4 text-destructive" />
              {m.warnings()}
            </div>
            <ul className="list-disc space-y-1 pl-5 text-sm text-muted-foreground">
              {draft.warnings.map((warning) => (
                <li key={warning}>{warningText(warning)}</li>
              ))}
            </ul>
          </div>
        ) : null}

        {draft.targetVersionId ? (
          <div className="space-y-3 rounded-2xl border bg-card p-5">
            <SectionTitle className="mb-1">{m.mapSection()}</SectionTitle>
            <p className="text-xs text-muted-foreground">
              {m.mapSectionHint()}
            </p>
            {output.sections.map((section, index) => (
              <Select
                key={`${section.name}-${index}`}
                label={section.name}
                value={mapping[index] ?? 'new'}
                onChange={(value) => {
                  const next = [...mapping]
                  next[index] = value === 'new' ? null : value
                  setMapping(next)
                }}
                options={[
                  { id: 'new', label: m.newSection() },
                  ...targetSections.map((item) => ({
                    id: item._id,
                    label: item.name,
                  })),
                ]}
              />
            ))}
          </div>
        ) : null}

        <div className="flex flex-col gap-2">
          <Button size="lg" isDisabled={busy} onPress={() => void commit()}>
            <SaveIcon />
            {m.saveToLibrary()}
          </Button>
          <Button
            variant="ghost"
            isDisabled={busy}
            onPress={() =>
              void discard({ draftId: draft._id }).then(() =>
                navigate({ to: '/import' }),
              )
            }
            className="text-muted-foreground hover:text-destructive"
          >
            <Trash2Icon />
            {m.discardImport()}
          </Button>
        </div>
        <ConfirmDialog
          isOpen={duplicate !== null}
          onOpenChange={(open) => {
            if (!open) setDuplicate(null)
          }}
          title={m.duplicateSong({ title: duplicate?.title ?? '' })}
          description={m.importDuplicateHint()}
          confirmLabel={m.addAsVersion()}
          destructive={false}
          onConfirm={() => commit(duplicate?.existing)}
        />
      </aside>

      <section className="min-w-0 rounded-3xl border bg-card p-5 sm:p-8 [--sheet-bg:var(--card)]">
        <SongSheet
          version={{
            name: m.importPreview(),
            concertKey: output.concertKey,
            timeSignature: output.timeSignature,
            bpm: output.bpm,
            tuning: output.tuning,
            suggestedCapo: output.suggestedCapo,
          }}
          song={{ title, artist }}
          timeline={previewTimeline(output)}
          shapes={[]}
          settings={{
            capo: output.suggestedCapo,
            transpose: 0,
            notation,
            mode: 'both',
            scale: 1,
          }}
        />
      </section>
    </div>
  )
}
