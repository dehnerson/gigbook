import { cn } from 'cn'
import { StickyNoteIcon } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { Chip } from '@/components/app/chip'
import { chartChords } from '@/lib/music/chordpro'
import { STANDARD_TUNING, stringLabels } from '@/lib/music/diagrams'
import { tabChords } from '@/lib/music/tab'
import { allParts, followsCapo, onVisiblePart, partTuning } from '@/lib/parts'
import type { LayerSet } from '@/lib/sheet-layers'
import { m } from '@/paraglide/messages'
import type { Id } from '../../../convex/_generated/dataModel'
import { ChartPart } from './chart-part'
import { PickableChordStrip } from './chord-strip'
import { blockOf, passOf, sheetPasses } from './passes'
import type { SheetPass } from './passes'
import { StrumPattern } from './strum-pattern'
import { TabStaff } from './tab-staff'
import { partName } from './parts'
import type {
  ChordShapeOverride,
  SheetEntry,
  SheetLayout,
  SheetSettings,
  SheetSong,
  SheetVersion,
} from './types'

function entryElementId(entryId: string) {
  return `entry-${entryId}`
}

function showsChart(layers: LayerSet) {
  return layers.lyrics || layers.chords || layers.strumming
}

function showsLine(layers: LayerSet) {
  return layers.tab || layers.notes
}

export function versionChords(
  timeline: Array<SheetEntry>,
  visiblePartIds?: Array<string>,
) {
  const symbols: Array<string> = []
  for (const entry of timeline) {
    if (entry.section.chartBody)
      symbols.push(...chartChords(entry.section.chartBody))
    for (const line of entry.lines) {
      if (!onVisiblePart(line.partId, visiblePartIds)) continue
      symbols.push(...tabChords(line.measures ?? []))
    }
  }
  return [...new Set(symbols)]
}

export function versionLine(name: string, artist?: string) {
  const performer = artist?.trim()
  return performer ? `${name} · ${performer}` : name
}

export function VersionCaption({
  name,
  artist,
  className,
}: {
  name: string
  artist?: string
  className?: string
}) {
  const performer = artist?.trim()
  return (
    <span className={cn('block text-sm', className)}>
      <span className="font-medium text-foreground">{name}</span>
      {performer ? (
        <span className="text-muted-foreground"> · {performer}</span>
      ) : null}
    </span>
  )
}

export function VersionStats({
  version,
  className,
}: {
  version: SheetVersion
  className?: string
}) {
  const standard =
    !version.tuning.length ||
    version.tuning.join(' ') === STANDARD_TUNING.join(' ')
  return (
    <div className={cn('flex flex-wrap gap-1.5', className)}>
      <Chip label={m.timeSignature()}>
        <span className="font-mono">{version.timeSignature}</span>
      </Chip>
      {version.bpm ? (
        <Chip label={m.bpm()}>
          <span className="font-mono">{version.bpm}</span>
        </Chip>
      ) : null}
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
  )
}

export function SheetHeader({
  song,
  version,
  showStats = true,
  mark,
  className,
}: {
  song: SheetSong
  version: SheetVersion
  showStats?: boolean
  mark?: ReactNode
  className?: string
}) {
  const subtitle = song.subTitle?.trim()
  return (
    <header className={className}>
      <div className="space-y-0.5">
        <h1 className="flex items-center gap-3 text-3xl leading-tight font-semibold tracking-tight">
          {mark}
          <span className="min-w-0">{song.title}</span>
        </h1>
        {subtitle ? (
          <p className="text-base text-muted-foreground">{subtitle}</p>
        ) : null}
      </div>
      <VersionCaption
        name={version.name}
        artist={version.artist}
        className="mt-2"
      />
      {showStats ? <VersionStats version={version} className="mt-3" /> : null}
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
  visiblePartIds,
  highlighted,
}: {
  elementId: string
  entry: SheetEntry
  badge?: string
  version: SheetVersion
  settings: SheetSettings
  shapes: Array<ChordShapeOverride>
  visiblePartIds?: Array<string>
  highlighted: boolean
}) {
  const { layers } = settings
  const parts = allParts(version.parts)
  const lines = entry.lines.filter(
    (line) => onVisiblePart(line.partId, visiblePartIds) && showsLine(layers),
  )
  const chart = entry.section.chartBody
  const strumming = entry.section.strumming
  const hasChart = Boolean(chart || strumming?.trim())
  const written = hasChart || entry.lines.length > 0
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
      {!written ? (
        <p className="text-[0.85em] text-muted-foreground">
          {m.emptySection()}
        </p>
      ) : (
        <div className="space-y-5">
          {showsChart(layers) && strumming?.trim() && layers.strumming ? (
            <StrumPattern
              text={strumming}
              timeSignature={version.timeSignature}
            />
          ) : null}
          {showsChart(layers) && chart && (layers.lyrics || layers.chords) ? (
            <ChartPart body={chart} settings={settings} />
          ) : null}
          {lines.map((line) => {
            const part = parts.find((item) => item.id === line.partId)
            if (!part || !line.measures?.length) return null
            const label = part.builtIn && !part.name ? '' : partName(part)
            return (
              <div key={line._id} className="space-y-2.5">
                {label ? (
                  <div className="text-[0.72em] font-semibold tracking-widest text-muted-foreground uppercase">
                    {label}
                  </div>
                ) : null}
                <TabStaff
                  measures={line.measures}
                  tuning={partTuning(part, version.tuning)}
                  timeSignature={version.timeSignature}
                  bpm={version.bpm}
                  settings={settings}
                  shapes={part.instrument === 'guitar' ? shapes : []}
                  followCapo={followsCapo(part)}
                />
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
  visiblePartIds,
  highlightEntryId,
  layout = 'expanded',
  showHeader = true,
  versionId,
  canEdit = false,
  mark,
  className,
}: {
  version: SheetVersion
  song: SheetSong
  timeline: Array<SheetEntry>
  shapes: Array<ChordShapeOverride>
  settings: SheetSettings
  visiblePartIds?: Array<string>
  highlightEntryId?: string | null
  layout?: SheetLayout
  showHeader?: boolean
  versionId?: Id<'versions'>
  canEdit?: boolean
  mark?: ReactNode
  className?: string
}) {
  const symbols = versionChords(timeline, visiblePartIds)
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
      className={cn('min-w-0 space-y-8', className)}
      style={{ fontSize: `${1.0625 * settings.scale}rem` }}
    >
      {showHeader ? (
        <SheetHeader song={song} version={version} mark={mark} />
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
              visiblePartIds={visiblePartIds}
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
    const button = document.getElementById(`nav-${activeEntryId}`)
    const scroller = button?.closest('nav')
    if (!button || !scroller) return
    const buttonBox = button.getBoundingClientRect()
    const scrollerBox = scroller.getBoundingClientRect()
    const left =
      scroller.scrollLeft +
      buttonBox.left -
      scrollerBox.left -
      (scroller.clientWidth - buttonBox.width) / 2
    scroller.scrollTo({ left: Math.max(0, left), behavior: 'smooth' })
  }, [activeEntryId])
  if (passes.length === 0) return null
  return (
    <nav
      aria-label={m.sections()}
      className={cn('scrollbar-none max-w-full overflow-x-auto', className)}
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
