import { convexQuery } from '@convex-dev/react-query'
import { createFileRoute } from '@tanstack/react-router'
import {
  EllipsisIcon,
  PencilIcon,
  PlayIcon,
  SaveIcon,
  TriangleAlertIcon,
} from 'lucide-react'
import { useState } from 'react'
import { api } from '../../../../../convex/_generated/api'
import type { Id } from '../../../../../convex/_generated/dataModel'
import { ContextMark } from '@/components/app/context-mark'
import {
  Breadcrumbs,
  HeaderActions,
  HeaderButton,
  HeaderButtonLink,
} from '@/components/app/page-header'
import { songCrumbs } from '@/components/app/song-crumbs'
import {
  ControlBar,
  KeyControls,
  LayerToggles,
  LayoutToggle,
  TextSizeControl,
  TracksFilter,
} from '@/components/sheet/sheet-controls'
import { sheetPasses } from '@/components/sheet/passes'
import {
  SectionNav,
  SheetHeader,
  SongSheet,
  useSectionCursor,
} from '@/components/sheet/song-sheet'
import type { SheetEntry, SheetSettings } from '@/components/sheet/types'
import {
  useSheetLayers,
  useSheetPrefs,
} from '@/components/sheet/use-sheet-prefs'
import { Button } from '@/components/ui/button'
import { usePersonalCapo } from '@/components/use-capo'
import { useNotation } from '@/components/use-notation'
import { useVersionActions } from '@/components/version-actions'
import { VersionMenu } from '@/components/version-menu'
import { useLiveQuery } from '@/lib/live'
import { previewTabShift } from '@/lib/music/tab'
import { m } from '@/paraglide/messages'

export const Route = createFileRoute('/_authed/versions/$versionId/')({
  loader: ({ context, params }) =>
    context.load(
      convexQuery(api.versions.getBundle, {
        versionId: params.versionId as Id<'versions'>,
      }),
    ),
  component: ReadPage,
})

function ReadPage() {
  const versionId = Route.useParams().versionId as Id<'versions'>
  const bundle = useLiveQuery(
    convexQuery(api.versions.getBundle, { versionId }),
  )
  const {
    version,
    song,
    shapes,
    canEdit,
    versionCount,
    ownerBandId,
    ownerName,
    shared,
  } = bundle.data
  const timeline = bundle.data.timeline as Array<SheetEntry>
  const notation = useNotation()
  const actions = useVersionActions()
  const [capo, setCapo] = usePersonalCapo(versionId, version.suggestedCapo)
  const [transpose, setTranspose] = useState(0)
  const [trackIds, setTrackIds] = useState<Array<string>>([])
  const prefs = useSheetPrefs('read')
  const { layers, available } = useSheetLayers(
    prefs.layers,
    timeline,
    version.tracks,
    trackIds,
  )
  const passes = sheetPasses(timeline)
  const { active, move } = useSectionCursor(
    passes.map((item) => item.id),
    prefs.layout,
  )

  const blocked =
    transpose !== 0 &&
    !previewTabShift(
      timeline.flatMap((entry) =>
        entry.parts.flatMap((part) =>
          part.kind === 'tab' ? (part.measures ?? []) : [],
        ),
      ),
      transpose,
    ).applied

  const settings: SheetSettings = {
    capo,
    transpose,
    notation,
    layers,
    scale: prefs.scale,
  }

  return (
    <div className="space-y-6">
      <div className="space-y-3">
        <Breadcrumbs>
          {songCrumbs({
            songId: song._id,
            title: song.title,
            band: ownerBandId
              ? { id: ownerBandId, name: ownerName ?? '' }
              : null,
          })}
          <span className="truncate text-foreground">{version.name}</span>
        </Breadcrumbs>

        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <SheetHeader
            song={song}
            version={version}
            settings={settings}
            className="min-w-0 md:flex-1"
            mark={<ContextMark bandId={ownerBandId} name={ownerName} />}
          />
          <HeaderActions>
            <HeaderButtonLink
              to="/versions/$versionId/play"
              params={{ versionId }}
            >
              <PlayIcon className="fill-current" />
              {m.play()}
            </HeaderButtonLink>
            {canEdit ? (
              <HeaderButtonLink
                variant="outline"
                to="/versions/$versionId/edit"
                params={{ versionId }}
              >
                <PencilIcon />
                <span className="hidden sm:inline">{m.edit()}</span>
              </HeaderButtonLink>
            ) : null}
            <VersionMenu
              version={{ ...version, canEdit, ownerBandId, shared }}
              songTitle={song.title}
              isOnlyVersion={versionCount <= 1}
              redirectToSong
              trigger={
                <HeaderButton
                  size="icon-lg"
                  variant="outline"
                  aria-label={m.more()}
                >
                  <EllipsisIcon />
                </HeaderButton>
              }
            />
          </HeaderActions>
        </div>
      </div>

      <div className="sticky top-15.25 z-9000 -mx-4 space-y-3 border-b bg-background/85 px-4 py-3 backdrop-blur-lg sm:-mx-8 sm:px-8 lg:top-0">
        <ControlBar>
          <KeyControls
            capo={capo}
            onCapo={setCapo}
            transpose={transpose}
            onTranspose={setTranspose}
            concertKey={version.concertKey}
            notation={notation}
          />
          {blocked ? (
            <span className="flex items-center gap-1.5 text-xs text-destructive">
              <TriangleAlertIcon className="size-4 shrink-0" />
              {m.outOfRange()}
            </span>
          ) : null}
          {canEdit && transpose !== 0 && !blocked ? (
            <Button
              variant="secondary"
              onPress={() =>
                void actions
                  .saveKey(version._id, transpose)
                  .then((saved) => saved && setTranspose(0))
              }
            >
              <SaveIcon />
              {m.saveWrittenKey()}
            </Button>
          ) : null}
          <div className="flex flex-wrap items-center gap-2 sm:ml-auto">
            <LayerToggles
              layers={layers}
              available={available}
              onLayers={prefs.setLayers}
            />
            {passes.length > timeline.length ? (
              <LayoutToggle layout={prefs.layout} onLayout={prefs.setLayout} />
            ) : null}
            <TextSizeControl scale={prefs.scale} onScale={prefs.setScale} />
            <TracksFilter
              timeline={timeline}
              tracks={version.tracks}
              visibleTrackIds={trackIds}
              onVisibleTrackIds={setTrackIds}
            />
          </div>
        </ControlBar>
        <SectionNav passes={passes} activeEntryId={active} onJump={move} />
      </div>

      <SongSheet
        version={version}
        song={song}
        timeline={timeline}
        shapes={shapes}
        settings={settings}
        visibleTrackIds={trackIds}
        layout={prefs.layout}
        showHeader={false}
        versionId={version._id}
        canEdit={canEdit}
        className="pb-[60vh]"
      />
    </div>
  )
}
