import { convexQuery } from '@convex-dev/react-query'
import { useQuery } from '@tanstack/react-query'
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import {
  ArrowLeftIcon,
  SaveIcon,
  SkipBackIcon,
  SkipForwardIcon,
  TriangleAlertIcon,
} from 'lucide-react'
import { useState } from 'react'
import { api } from '../../../../../convex/_generated/api'
import type { Id } from '../../../../../convex/_generated/dataModel'
import {
  AutoscrollControl,
  DockDivider,
  StageDock,
  useAutoscrollState,
  useForceDark,
  useSectionKeys,
} from '@/components/play-view'
import {
  DisplayModeToggle,
  KeyControls,
  LayoutToggle,
  PartsFilter,
  TextSizeControl,
} from '@/components/sheet/sheet-controls'
import { sheetPasses } from '@/components/sheet/passes'
import {
  SectionNav,
  SongSheet,
  useSectionCursor,
} from '@/components/sheet/song-sheet'
import type { SheetEntry, SheetSettings } from '@/components/sheet/types'
import { useSheetPrefs } from '@/components/sheet/use-sheet-prefs'
import { Button, ButtonLink } from '@/components/ui/button'
import { usePersonalCapo } from '@/components/use-capo'
import { useNotation } from '@/components/use-notation'
import { useVersionActions } from '@/components/version-actions'
import { useWakeLock } from '@/components/use-wake-lock'
import { useLiveQuery } from '@/lib/live'
import { loadQuery } from '@/lib/load'
import { previewTabShift } from '@/lib/music/tab'
import { m } from '@/paraglide/messages'

type PlaySearch = { setlist?: string; index?: number }

export const Route = createFileRoute('/_authed/versions/$versionId/play')({
  validateSearch: (search: Record<string, unknown>): PlaySearch => ({
    setlist: typeof search.setlist === 'string' ? search.setlist : undefined,
    index:
      search.index !== undefined && Number.isFinite(Number(search.index))
        ? Number(search.index)
        : undefined,
  }),
  loader: async ({ context, params }) => {
    await loadQuery(
      context.queryClient,
      convexQuery(api.versions.getBundle, {
        versionId: params.versionId as Id<'versions'>,
      }),
    )
  },
  component: PlayPage,
})

function PlayPage() {
  const versionId = Route.useParams().versionId as Id<'versions'>
  const search = Route.useSearch()
  const navigate = useNavigate()
  const bundle = useLiveQuery(
    convexQuery(api.versions.getBundle, { versionId }),
  )
  const { version, song, shapes, canEdit } = bundle.data
  const timeline = bundle.data.timeline as Array<SheetEntry>
  const notation = useNotation()
  const actions = useVersionActions()
  const [capo, setCapo] = usePersonalCapo(versionId, version.suggestedCapo)
  const [transpose, setTranspose] = useState(0)
  const [parts, setParts] = useState<Array<string>>([])
  const prefs = useSheetPrefs('play', 1.3)
  const scroll = useAutoscrollState()
  const passes = sheetPasses(timeline)
  const entryIds = passes.map((item) => item.id)
  const hasRepeats = passes.length > timeline.length
  const { active, move } = useSectionCursor(entryIds, prefs.layout)
  useForceDark()
  useWakeLock(true)
  useSectionKeys(entryIds, active, move)

  const setlist = useQuery({
    ...convexQuery(
      api.setlists.get,
      search.setlist ? { setlistId: search.setlist as Id<'setlists'> } : 'skip',
    ),
    enabled: Boolean(search.setlist),
  })
  const entries = setlist.data?.entries ?? []
  const position = search.index ?? 0
  const upNext = entries.at(position + 1)
  const goTo = (index: number) => {
    const target = entries.at(index)
    if (!target?.version || !search.setlist) return
    void navigate({
      to: '/versions/$versionId/play',
      params: { versionId: target.version._id },
      search: { setlist: search.setlist, index },
    })
    window.scrollTo({ top: 0 })
  }

  const measures = timeline.flatMap((entry) =>
    entry.parts.flatMap((part) =>
      part.kind === 'tab' ? (part.measures ?? []) : [],
    ),
  )
  const blocked =
    transpose !== 0 && !previewTabShift(measures, transpose).applied

  const settings: SheetSettings = {
    capo,
    transpose,
    notation,
    mode: prefs.mode,
    scale: prefs.scale,
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="sticky top-0 z-30 border-b bg-background/85 backdrop-blur-xl">
        <div className="mx-auto flex max-w-5xl items-center gap-3 px-3 py-2">
          {search.setlist ? (
            <ButtonLink
              variant="ghost"
              size="icon"
              aria-label={m.back()}
              to="/setlists/$setlistId"
              params={{ setlistId: search.setlist }}
            >
              <ArrowLeftIcon />
            </ButtonLink>
          ) : (
            <ButtonLink
              variant="ghost"
              size="icon"
              aria-label={m.back()}
              to="/versions/$versionId"
              params={{ versionId }}
            >
              <ArrowLeftIcon />
            </ButtonLink>
          )}
          <div className="min-w-0 flex-1">
            <div className="truncate font-semibold">{song.title}</div>
            <div className="truncate text-xs text-muted-foreground">
              {version.artist ?? song.artist} · {version.name}
            </div>
          </div>
          {search.setlist && entries.length > 0 ? (
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="icon"
                aria-label={m.previousSong()}
                isDisabled={position <= 0}
                onPress={() => goTo(position - 1)}
              >
                <SkipBackIcon />
              </Button>
              <span className="min-w-12 text-center font-mono text-xs text-muted-foreground tabular-nums">
                {position + 1} / {entries.length}
              </span>
              <Button
                variant="ghost"
                size="icon"
                aria-label={m.nextSong()}
                isDisabled={position >= entries.length - 1}
                onPress={() => goTo(position + 1)}
              >
                <SkipForwardIcon />
              </Button>
            </div>
          ) : null}
        </div>
        <div className="mx-auto max-w-5xl px-3 pb-2">
          <SectionNav passes={passes} activeEntryId={active} onJump={move} />
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-5 pt-6 pb-[70vh] sm:px-8">
        <SongSheet
          version={version}
          song={song}
          timeline={timeline}
          shapes={shapes}
          settings={settings}
          visiblePartIds={parts}
          highlightEntryId={active}
          layout={prefs.layout}
          versionId={version._id}
          canEdit={canEdit}
        />
        {search.setlist && upNext ? (
          <button
            type="button"
            onClick={() => goTo(position + 1)}
            className="mt-12 flex w-full items-center justify-between gap-4 rounded-2xl border bg-card p-5 text-left transition-colors hover:border-primary/50"
          >
            <span>
              <span className="block text-xs font-semibold tracking-widest text-primary uppercase">
                {m.upNext()}
              </span>
              <span className="mt-1 block text-lg font-semibold">
                {upNext.song.title}
              </span>
            </span>
            <SkipForwardIcon className="size-5 text-muted-foreground" />
          </button>
        ) : null}
      </main>

      <StageDock>
        <KeyControls
          capo={capo}
          onCapo={setCapo}
          transpose={transpose}
          onTranspose={setTranspose}
          concertKey={version.concertKey}
          notation={notation}
        />
        {blocked ? (
          <span
            className="flex shrink-0 items-center gap-1 text-xs text-destructive"
            title={m.outOfRange()}
          >
            <TriangleAlertIcon className="size-4" />
          </span>
        ) : null}
        {canEdit && transpose !== 0 && !blocked ? (
          <Button
            variant="secondary"
            size="icon"
            aria-label={m.saveWrittenKey()}
            onPress={() =>
              void actions
                .saveKey(version._id, transpose)
                .then((saved) => saved && setTranspose(0))
            }
          >
            <SaveIcon />
          </Button>
        ) : null}
        <DockDivider />
        <AutoscrollControl
          running={scroll.running}
          onRunning={scroll.setRunning}
          speed={scroll.speed}
          onSpeed={scroll.setSpeed}
        />
        <DockDivider />
        <DisplayModeToggle mode={prefs.mode} onMode={prefs.setMode} iconOnly />
        {hasRepeats ? (
          <LayoutToggle layout={prefs.layout} onLayout={prefs.setLayout} />
        ) : null}
        <TextSizeControl scale={prefs.scale} onScale={prefs.setScale} />
        <PartsFilter
          timeline={timeline}
          visiblePartIds={parts}
          onVisiblePartIds={setParts}
        />
      </StageDock>
    </div>
  )
}
