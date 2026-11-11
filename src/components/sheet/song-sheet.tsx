import { cn } from 'cn'
import { StickyNoteIcon } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { Chip } from '@/components/app/chip'
import { soundsAs } from '@/lib/music/chords'
import { chartChords } from '@/lib/music/chordpro'
import { STANDARD_TUNING, stringLabels } from '@/lib/music/diagrams'
import { tabChords } from '@/lib/music/tab'
import type { LayerSet } from '@/lib/sheet-layers'
import {
  allTracks,
  meaningfulLabel,
  onVisibleTrack,
  trackOf,
} from '@/lib/tracks'
import type { StoredTrack } from '@/lib/tracks'
import { m } from '@/paraglide/messages'
import type { Id } from '../../../convex/_generated/dataModel'
import { ChartPart } from './chart-part'
import { PickableChordStrip } from './chord-strip'
import { blockOf, passOf, sheetPasses } from './passes'
import type { SheetPass } from './passes'
import { StrumPattern } from './strum-pattern'
import { TabStaff } from './tab-staff'
import { trackName } from './tracks'
import type {
  ChordShapeOverride,
  SheetEntry,
  SheetLayout,
  SheetPart,
  SheetSettings,
  SheetSong,
  SheetVersion,
} from './types'

export function entryElementId(entryId: string) {
  return `entry-${entryId}`
}

function partLabel(part: SheetPart, tracks: Array<StoredTrack> | undefined) {
  const own = meaningfulLabel(part.label)
  if (own) return own
  const id = trackOf(part, tracks)
  const track = allTracks(tracks).find((item) => item.id === id)
  return track && !track.builtIn ? trackName(track) : ''
}

function showsPart(part: SheetPart, layers: LayerSet) {
  if (part.kind === 'tab') return layers.tab || layers.notes
  return layers.lyrics || layers.chords || layers.strumming
}

export function versionChords(
  timeline: Array<SheetEntry>,
  tracks?: Array<StoredTrack>,
  visibleTrackIds?: Array<string>,
) {
  const symbols: Array<string> = []
  for (const entry of timeline) {
    for (const part of entry.parts) {
      if (!onVisibleTrack(part, tracks, visibleTrackIds)) continue
      if (part.kind === 'chart' && part.chartBody)
        symbols.push(...chartChords(part.chartBody))
      if (part.kind === 'tab') symbols.push(...tabChords(part.measures ?? []))
    }
  }
  return [...new Set(symbols)]
}

export function SheetHeader({
  song,
  version,
  settings,
  className,
}: {
  song: SheetSong
  version: SheetVersion
  settings: SheetSettings
  className?: string
}) {
  const standard =
    version.tuning.length === 0 ||
    version.tuning.join(' ') === STANDARD_TUNING.join(' ')
  return (
    <header className={cn('space-y-4', className)}>
      <div className="space-y-1">
        <h1 className="text-[2em] leading-tight font-bold tracking-tight text-balance">
          {song.title}
        </h1>
        <p className="text-[1.05em] text-muted-foreground">{song.subTitle}</p>
        <h2 className="text-[1.5em] leading-tight font-semibold tracking-tight text-balance">
          {version.name}
        </h2>
        <p className="text-[1.02em] text-muted-foreground">{version.artist}</p>
      </div>
      <div className="flex flex-wrap gap-1.5 text-[0.85rem]">
        <Chip label={m.keyShort()}>
          <span className="font-mono">
            {soundsAs(
              version.concertKey,
              settings.transpose,
              settings.notation,
            )}
          </span>
        </Chip>
        {settings.capo > 0 || version.suggestedCapo > 0 ? (
          <Chip
            label={m.capo()}
            tone={settings.capo > 0 ? 'primary' : 'default'}
          >
            <span className="font-mono">{settings.capo}</span>
          </Chip>
        ) : null}
        {version.bpm ? (
          <Chip label={m.bpm()}>
            <span className="font-mono">{version.bpm}</span>
          </Chip>
        ) : null}
        <Chip label={m.timeSignature()}>
          <span className="font-mono">{version.timeSignature}</span>
        </Chip>
        {standard ? null : (
          <Chip label={m.tuning()}>
            <span className="font-mono">
              {[...stringLabels(version.tuning, version.tuning.length)]
                .reverse()
                .join(' ')}
            </span>
          </Chip>
        )}
      </div>
    </header>
  )
}

function SectionBlock({
  elementId,
  entry,
  badge,
  version,
  settings,
  shapes,
  visibleTrackIds,
  highlighted,
}: {
  elementId: string
  entry: SheetEntry
  badge?: string
  version: SheetVersion
  settings: SheetSettings
  shapes: Array<ChordShapeOverride>
  visibleTrackIds?: Array<string>
  highlighted: boolean
}) {
  const { layers } = settings
  const parts = entry.parts.filter(
    (part) =>
      onVisibleTrack(part, version.tracks, visibleTrackIds) &&
      showsPart(part, layers),
  )
  return (
    <section
      id={entryElementId(elementId)}
      data-entry={elementId}
      className={cn(
        '-mx-3 scroll-mt-52 rounded-2xl px-3 py-3 transition-colors duration-300 sm:-mx-5 sm:px-5',
        highlighted && 'bg-primary/6 ring-1 ring-primary/30',
      )}
    >
      <div className="mb-3 flex items-center gap-3">
        <h2
          className={cn(
            'rounded-md px-2 py-0.5 text-[0.72em] font-bold tracking-[0.14em] uppercase',
            highlighted
              ? 'bg-primary text-primary-foreground'
              : 'bg-primary/12 text-primary',
          )}
        >
          {entry.section.name}
        </h2>
        {badge ? (
          <span className="font-mono text-[0.75em] font-semibold text-primary tabular-nums">
            {badge}
          </span>
        ) : null}
        <div className="h-px flex-1 bg-border" />
      </div>
      {entry.section.notes ? (
        <p className="mb-3 flex items-start gap-2 text-[0.85em] text-muted-foreground italic">
          <StickyNoteIcon className="mt-[0.2em] size-[1em] shrink-0" />
          {entry.section.notes}
        </p>
      ) : null}
      {entry.parts.length === 0 ? (
        <p className="text-[0.85em] text-muted-foreground">
          {m.emptySection()}
        </p>
      ) : parts.length === 0 ? null : (
        <div className="space-y-5">
          {parts.map((part) => {
            const label = partLabel(part, version.tracks)
            const repeat = part.repeat && part.repeat > 1 ? part.repeat : null
            return (
              <div key={part._id} className="space-y-2.5">
                {label || repeat ? (
                  <div className="flex items-baseline gap-2 text-[0.72em] font-semibold">
                    {label ? (
                      <span className="tracking-widest text-muted-foreground uppercase">
                        {label}
                      </span>
                    ) : null}
                    {repeat ? (
                      <span
                        className="font-mono text-primary tabular-nums"
                        aria-label={m.playedTimes({ count: String(repeat) })}
                      >
                        ×{repeat}
                      </span>
                    ) : null}
                  </div>
                ) : null}
                {part.kind === 'chart' && part.strumming && layers.strumming ? (
                  <StrumPattern
                    text={part.strumming}
                    timeSignature={version.timeSignature}
                  />
                ) : null}
                {part.kind === 'chart' &&
                part.chartBody &&
                (layers.lyrics || layers.chords) ? (
                  <ChartPart body={part.chartBody} settings={settings} />
                ) : null}
                {part.kind === 'tab' && part.measures?.length ? (
                  <TabStaff
                    measures={part.measures}
                    tuning={version.tuning}
                    timeSignature={version.timeSignature}
                    bpm={version.bpm}
                    settings={settings}
                    shapes={shapes}
                  />
                ) : null}
              </div>
            )
          })}
        </div>
      )}
    </section>
  )
}

export function SongSheet({
  version,
  song,
  timeline,
  shapes,
  settings,
  visibleTrackIds,
  highlightEntryId,
  layout = 'expanded',
  showHeader = true,
  versionId,
  canEdit = false,
  className,
}: {
  version: SheetVersion
  song: SheetSong
  timeline: Array<SheetEntry>
  shapes: Array<ChordShapeOverride>
  settings: SheetSettings
  visibleTrackIds?: Array<string>
  highlightEntryId?: string | null
  layout?: SheetLayout
  showHeader?: boolean
  versionId?: Id<'versions'>
  canEdit?: boolean
  className?: string
}) {
  const symbols = versionChords(timeline, version.tracks, visibleTrackIds)
  const highlightBlock = highlightEntryId
    ? blockOf(layout)(highlightEntryId)
    : null
  const blocks =
    layout === 'compact'
      ? timeline.map((entry) => {
          const total = Math.max(1, entry.repeat ?? 1)
          const highlighted = highlightBlock === entry.entryId
          return {
            id: entry.entryId,
            entry,
            highlighted,
            badge:
              total === 1
                ? undefined
                : highlighted && highlightEntryId
                  ? `${passOf(highlightEntryId)}/${total}`
                  : `×${total}`,
          }
        })
      : sheetPasses(timeline).map((item) => ({
          id: item.id,
          entry: item.entry,
          highlighted: highlightBlock === item.id,
          badge: item.total > 1 ? `${item.pass}/${item.total}` : undefined,
        }))
  return (
    <article
      className={cn('space-y-8', className)}
      style={{ fontSize: `${1.0625 * settings.scale}rem` }}
    >
      {showHeader ? (
        <SheetHeader song={song} version={version} settings={settings} />
      ) : null}
      {settings.layers.chords ? (
        <PickableChordStrip
          symbols={symbols}
          shapes={shapes}
          settings={settings}
          tuning={version.tuning}
          versionId={versionId}
          canEdit={canEdit}
        />
      ) : null}
      {timeline.length === 0 ? (
        <p className="rounded-2xl border border-dashed p-8 text-center text-muted-foreground">
          {m.emptySheet()}
        </p>
      ) : (
        <div className="space-y-4">
          {blocks.map((block) => (
            <SectionBlock
              key={block.id}
              elementId={block.id}
              entry={block.entry}
              badge={block.badge}
              version={version}
              settings={settings}
              shapes={shapes}
              visibleTrackIds={visibleTrackIds}
              highlighted={block.highlighted}
            />
          ))}
        </div>
      )}
    </article>
  )
}

function scrollToEntry(entryId: string) {
  document
    .getElementById(entryElementId(entryId))
    ?.scrollIntoView({ behavior: 'smooth', block: 'start' })
}

export function useSectionCursor(
  entryIds: Array<string>,
  layout: SheetLayout = 'expanded',
) {
  const [chosen, setChosen] = useState<string | null>(null)
  const jumping = useRef(false)
  const settle = useRef(0)
  const key = entryIds.join(',')
  const active =
    chosen && entryIds.includes(chosen) ? chosen : (entryIds[0] ?? null)

  const release = (delay: number) => {
    window.clearTimeout(settle.current)
    settle.current = window.setTimeout(() => {
      jumping.current = false
    }, delay)
  }

  const move = (entryId: string) => {
    setChosen(entryId)
    jumping.current = true
    release(1000)
    scrollToEntry(blockOf(layout)(entryId))
  }

  useEffect(() => {
    const ids = key ? key.split(',') : []
    const toBlock = blockOf(layout)
    const compute = () => {
      let current: string | null = null
      for (const id of ids) {
        const element = document.getElementById(entryElementId(toBlock(id)))
        if (element && element.getBoundingClientRect().top <= 230)
          current = toBlock(id)
      }
      setChosen((previous) =>
        previous && ids.includes(previous) && toBlock(previous) === current
          ? previous
          : (ids.find((id) => toBlock(id) === current) ?? ids.at(0) ?? null),
      )
    }
    let frame = 0
    const onScroll = () => {
      if (jumping.current) {
        release(150)
        return
      }
      cancelAnimationFrame(frame)
      frame = requestAnimationFrame(compute)
    }
    const onUser = () => {
      jumping.current = false
    }
    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('wheel', onUser, { passive: true })
    window.addEventListener('touchstart', onUser, { passive: true })
    return () => {
      cancelAnimationFrame(frame)
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('wheel', onUser)
      window.removeEventListener('touchstart', onUser)
    }
  }, [key, layout])

  useEffect(() => () => window.clearTimeout(settle.current), [])

  return { active, move }
}

export function SectionNav({
  passes,
  activeEntryId,
  onJump,
  className,
}: {
  passes: Array<SheetPass>
  activeEntryId: string | null
  onJump: (entryId: string, index: number) => void
  className?: string
}) {
  useEffect(() => {
    if (!activeEntryId) return
    document.getElementById(`nav-${activeEntryId}`)?.scrollIntoView({
      behavior: 'smooth',
      block: 'nearest',
      inline: 'center',
    })
  }, [activeEntryId])
  if (passes.length === 0) return null
  return (
    <nav
      aria-label={m.sections()}
      className={cn('scrollbar-none overflow-x-auto', className)}
    >
      <div className="flex w-max gap-1.5">
        {passes.map((item, index) => {
          const active = item.id === activeEntryId
          return (
            <button
              key={item.id}
              id={`nav-${item.id}`}
              type="button"
              onClick={() => onJump(item.id, index)}
              aria-current={active ? 'true' : undefined}
              className={cn(
                'h-8 rounded-full border px-3 text-xs font-semibold whitespace-nowrap transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring',
                active
                  ? 'border-primary bg-primary text-primary-foreground'
                  : 'border-border bg-card/60 text-muted-foreground hover:text-foreground',
              )}
            >
              {item.entry.section.name}
              {item.total > 1 ? (
                <span className="ml-1 font-mono opacity-70">
                  {item.pass}/{item.total}
                </span>
              ) : null}
            </button>
          )
        })}
      </div>
    </nav>
  )
}
