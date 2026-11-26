import { convexQuery } from '@convex-dev/react-query'
import { useQuery, useSuspenseQuery } from '@tanstack/react-query'
import { useNavigate } from '@tanstack/react-router'
import {
  ArrowLeftIcon,
  SaveIcon,
  SkipBackIcon,
  SkipForwardIcon,
  TriangleAlertIcon,
} from 'lucide-react'
import { Suspense, useState } from 'react'
import { api } from '../../../convex/_generated/api'
import type { Id } from '../../../convex/_generated/dataModel'
import {
  AutoscrollControl,
  DockDivider,
  StageDock,
  useAutoscrollState,
  useForceDark,
  useSectionKeys,
} from '@/components/play/play-view'
import {
  KeyControls,
  LayerToggles,
  LayoutToggle,
  TextSizeControl,
  PartsFilter,
} from '@/components/sheet/sheet-controls'
import { sheetPasses } from '@/components/sheet/passes'
import { ContextMark } from '@/components/app/context-mark'
import { SheetSkeleton } from '@/components/app/route-states'
import { UpNext } from '@/components/app/up-next'
import {
  SectionNav,
  SongSheet,
  useSectionCursor,
  VersionCaption,
  VersionStats,
} from '@/components/sheet/song-sheet'
import type { SheetEntry, SheetSettings } from '@/components/sheet/types'
import {
  useSheetLayers,
  useSheetPrefs,
} from '@/components/sheet/use-sheet-prefs'
import { Button, ButtonLink } from '@/components/ui/button'
import { usePersonalCapo } from '@/lib/use-capo'
import { useNotation } from '@/lib/use-notation'
import { useVersionActions } from '@/components/version/version-actions'
import { useWakeLock } from '@/lib/use-wake-lock'
import type { Workspace } from '@/lib/workspace'
import type { PlaySearch } from '@/lib/play-search'
import { previewTabShift } from '@/lib/music/tab'
import { m } from '@/paraglide/messages'

export function PlayPage({
  versionId,
  search,
  workspace,
}: {
  versionId: Id<'versions'>
  search: PlaySearch
  workspace?: Workspace
}) {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-background px-4 pt-6">
          <SheetSkeleton />
        </div>
      }
    >
      <PlayView versionId={versionId} search={search} workspace={workspace} />
    </Suspense>
  )
}

function PlayView({
  versionId,
  search,
  workspace,
}: {
  versionId: Id<'versions'>
  search: PlaySearch
  workspace?: Workspace
}) {
  const navigate = useNavigate()
  const bundle = useSuspenseQuery(
    convexQuery(api.versions.getBundle, { versionId }),
  )
  const { version, song, shapes, canEdit, ownerBandId, ownerName } = bundle.data
  const timeline = bundle.data.timeline as Array<SheetEntry>
  const notation = useNotation()
  const actions = useVersionActions()
  const [capo, setCapo] = usePersonalCapo(versionId, version.suggestedCapo)
  const [transpose, setTranspose] = useState(0)
  const [trackIds, setTrackIds] = useState<Array<string>>([])
  const prefs = useSheetPrefs('play', 1.3)
  const { layers, available } = useSheetLayers(prefs.layers, timeline, trackIds)
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
      to: workspace
        ? '/$workspace/versions/$versionId/play'
        : '/versions/$versionId/play',
      params: workspace
        ? { workspace: workspace.key, versionId: target.version._id }
        : { versionId: target.version._id },
      search: { setlist: search.setlist, index },
    })
    window.scrollTo({ top: 0 })
  }

  const measures = timeline.flatMap((entry) =>
    entry.lines.flatMap((line) => line.measures ?? []),
  )
  const blocked =
    transpose !== 0 && !previewTabShift(measures, transpose).applied

  const settings: SheetSettings = {
    capo,
    transpose,
    notation,
    layers,
    scale: prefs.scale,
  }

  const setlistLinkOptions = {
    to: workspace ? '/$workspace/setlists/$setlistId' : '/setlists/$setlistId',
    params: workspace
      ? {
          workspace: workspace.key,
          setlistId: search.setlist as Id<'setlists'>,
        }
      : { setlistId: search.setlist as Id<'setlists'> },
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
              {...setlistLinkOptions}
            >
              <ArrowLeftIcon />
            </ButtonLink>
          ) : (
            <ButtonLink
              variant="ghost"
              size="icon"
              aria-label={m.back()}
              {...{
                to: workspace
                  ? '/$workspace/versions/$versionId'
                  : '/versions/$versionId',
                params: workspace
                  ? { workspace: workspace.key, versionId: version._id }
                  : { versionId: version._id },
              }}
            >
              <ArrowLeftIcon />
            </ButtonLink>
          )}
          <div className="min-w-0 flex-1">
            <h1 className="flex min-w-0 items-center gap-2 text-base font-semibold">
              <ContextMark bandId={ownerBandId} name={ownerName} />
              <span className="truncate">{song.title}</span>
            </h1>
            {song.subTitle?.trim() ? (
              <p className="truncate text-xs text-muted-foreground">
                {song.subTitle}
              </p>
            ) : null}
            <VersionCaption
              name={version.name}
              artist={version.artist}
              className="truncate text-xs"
            />
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
        <div className="mx-auto max-w-5xl space-y-2 px-3 pb-2">
          <VersionStats version={version} />
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
          visiblePartIds={trackIds}
          highlightEntryId={active}
          layout={prefs.layout}
          showHeader={false}
          versionId={version._id}
          canEdit={canEdit}
        />
        {search.setlist && upNext ? (
          <UpNext
            title={upNext.song.title}
            versionName={upNext.version.name}
            artist={upNext.version.artist}
            mark={
              <ContextMark
                bandId={upNext.ownerBandId}
                name={upNext.ownerName}
              />
            }
            onClick={() => goTo(position + 1)}
          />
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
        <LayerToggles
          layers={layers}
          available={available}
          onLayers={prefs.setLayers}
          iconOnly
        />
        {hasRepeats ? (
          <LayoutToggle layout={prefs.layout} onLayout={prefs.setLayout} />
        ) : null}
        <TextSizeControl scale={prefs.scale} onScale={prefs.setScale} />
        <PartsFilter
          timeline={timeline}
          parts={version.parts}
          visiblePartIds={trackIds}
          onVisiblePartIds={setTrackIds}
          iconOnly
        />
      </StageDock>
    </div>
  )
}
