import { useEffect, useRef, useState } from 'react'
import type { SheetSettings } from '@/components/sheet/types'
import { displayChord } from '@/lib/music/chords'
import { stringLabels } from '@/lib/music/diagrams'
import {
  beatLength,
  measureCapacity,
  noteName,
  previewTabShift,
} from '@/lib/music/tab'
import type {
  TabMeasure,
  ShiftedBeat,
  ShiftedMeasure,
  ShiftedNote,
} from '@/lib/music/tab'

const LABEL_WIDTH = 22
const LINE_GAP = 13
const TOP = 36
const STEM = 20
const NAME_LINE = 9
const NOTE_OFFSET = 9

type Placed = {
  beat: ShiftedBeat
  cx: number
  pos: number
  system: number
}

type MeasureBox = {
  index: number
  measure: ShiftedMeasure
  left: number
  width: number
  beats: Array<Placed>
}

function slotWidth(beat: ShiftedBeat) {
  const label = Math.max(1, ...beat.notes.map((note) => String(note.f).length))
  const base = 16 + 13 * Math.sqrt(beatLength(beat) * 16)
  const bend = beat.notes.some((note) => note.t === 'b' || note.t === '~')
  return Math.max(base, label * 7 + 16) + (bend ? 10 : 0)
}

function paddings(measure: ShiftedMeasure) {
  return {
    left: 10 + (measure.repeat?.start ? 10 : 0),
    right: 6 + (measure.repeat?.times ? 10 : 0),
  }
}

function naturalWidth(measure: ShiftedMeasure) {
  const pad = paddings(measure)
  return (
    pad.left +
    pad.right +
    measure.beats.reduce((sum, beat) => sum + slotWidth(beat), 0)
  )
}

function beamCount(beat: ShiftedBeat) {
  if (beat.rest || beat.d < 8) return 0
  return Math.log2(beat.d) - 2
}

function bendLabel(semitones: number) {
  if (semitones === 2) return 'full'
  if (semitones === 1) return '½'
  return String(semitones / 2)
}

function useWidth() {
  const ref = useRef<HTMLDivElement>(null)
  const [width, setWidth] = useState(720)
  useEffect(() => {
    const node = ref.current
    if (!node) return
    const observer = new ResizeObserver((entries) => {
      const entry = entries.at(0)
      if (entry) setWidth(entry.contentRect.width)
    })
    observer.observe(node)
    return () => observer.disconnect()
  }, [])
  return [ref, width] as const
}

export function RhythmTabStaff({
  measures,
  tuning,
  timeSignature,
  settings,
  showNames,
}: {
  measures: Array<TabMeasure>
  tuning: Array<string>
  timeSignature: string
  settings: SheetSettings
  showNames: boolean
}) {
  const [ref, available] = useWidth()
  const scale = settings.scale
  const shifted = previewTabShift(measures, settings.transpose).measures
  const stringCount = Math.max(
    tuning.length || 6,
    ...shifted.flatMap((measure) =>
      measure.beats.flatMap((beat) => beat.notes.map((note) => note.s)),
    ),
  )
  const labels = stringLabels(tuning, stringCount)
  const room = available / scale - LABEL_WIDTH - 4
  const capacity = measureCapacity(timeSignature)
  const group = timeSignature.endsWith('/8') && capacity >= 0.75 ? 3 / 8 : 1 / 4

  const systems: Array<Array<number>> = []
  let current: Array<number> = []
  let used = 0
  shifted.forEach((measure, index) => {
    const width = naturalWidth(measure)
    if (current.length > 0 && used + width > room) {
      systems.push(current)
      current = []
      used = 0
    }
    current.push(index)
    used += width
  })
  if (current.length > 0) systems.push(current)

  const y = (string: number) => TOP + (string - 1) * LINE_GAP
  const staffBottom = y(stringCount)
  const stemTopOf = (indexes: Array<number>) => {
    if (!showNames) return staffBottom + 8
    const most = Math.max(
      1,
      ...indexes.flatMap((index) =>
        shifted[index].beats.map((beat) => beat.notes.length),
      ),
    )
    return staffBottom + 8 + most * NAME_LINE + 4
  }

  const boxes: Array<MeasureBox> = []
  systems.forEach((indexes, systemIndex) => {
    const natural = indexes.reduce(
      (sum, index) => sum + naturalWidth(shifted[index]),
      0,
    )
    const isLast = systemIndex === systems.length - 1
    const stretch =
      !isLast || natural / room > 0.7 ? Math.max(1, room / natural) : 1
    let left = LABEL_WIDTH
    for (const index of indexes) {
      const measure = shifted[index]
      const width = naturalWidth(measure) * stretch
      const pad = paddings(measure)
      const slots = measure.beats.map(slotWidth)
      const inner = slots.reduce((sum, slot) => sum + slot, 0)
      const k = (width - pad.left - pad.right) / inner
      let cursor = left + pad.left
      let pos = 0
      const beats = measure.beats.map((beat, beatIndex) => {
        const placed = {
          beat,
          cx: cursor + NOTE_OFFSET,
          pos,
          system: systemIndex,
        }
        cursor += (slots[beatIndex] ?? 0) * k
        pos += beatLength(beat)
        return placed
      })
      boxes.push({ index, measure, left, width, beats })
      left += width
    }
  })

  const flat = boxes.flatMap((box) => box.beats)
  const nextOnString = (from: Placed, string: number) => {
    const start = flat.indexOf(from)
    for (let index = start + 1; index < flat.length; index += 1) {
      const candidate = flat[index]
      const note = candidate.beat.notes.find((item) => item.s === string)
      if (note) return { placed: candidate, note }
      if (candidate.beat.notes.length > 0 || candidate.beat.rest) return null
    }
    return null
  }

  const chordName = (symbol: string) =>
    displayChord(symbol, settings.capo, settings.transpose, settings.notation)

  return (
    <div ref={ref} className="w-full space-y-2 overflow-x-auto">
      {systems.map((indexes, systemIndex) => {
        const mine = boxes.filter((box) => indexes.includes(box.index))
        const last = mine.at(-1)
        const width = (last ? last.left + last.width : LABEL_WIDTH) + 4
        const stemTop = stemTopOf(indexes)
        const height = stemTop + STEM + 8
        return (
          <svg
            key={systemIndex}
            viewBox={`0 0 ${width} ${height}`}
            width={width * scale}
            height={height * scale}
            className="block max-w-none text-foreground"
            role="img"
          >
            <text
              x={2}
              y={TOP - 14}
              fontSize="9"
              className="fill-muted-foreground"
            >
              {(indexes[0] ?? 0) + 1}
            </text>
            {labels.map((label, index) => (
              <text
                key={`l${index}`}
                x={LABEL_WIDTH - 8}
                y={y(index + 1) + 3.5}
                textAnchor="end"
                fontSize="10"
                fontFamily="var(--font-mono)"
                className="fill-muted-foreground"
              >
                {label}
              </text>
            ))}
            {labels.map((_, index) => (
              <line
                key={`s${index}`}
                x1={LABEL_WIDTH}
                x2={width - 4}
                y1={y(index + 1)}
                y2={y(index + 1)}
                className="stroke-sheet-line"
                strokeWidth={1}
              />
            ))}
            <line
              x1={LABEL_WIDTH}
              x2={LABEL_WIDTH}
              y1={y(1)}
              y2={staffBottom}
              className="stroke-sheet-line"
              strokeWidth={1.5}
            />
            {mine.map((box) => (
              <MeasureView
                key={box.index}
                box={box}
                final={box.index === shifted.length - 1}
                stringCount={stringCount}
                y={y}
                staffBottom={staffBottom}
                stemTop={stemTop}
                group={group}
                showNames={showNames}
                tuning={tuning}
                settings={settings}
                chordName={chordName}
                nextOnString={nextOnString}
              />
            ))}
          </svg>
        )
      })}
    </div>
  )
}

function MeasureView({
  box,
  final,
  stringCount,
  y,
  staffBottom,
  stemTop,
  group,
  showNames,
  tuning,
  settings,
  chordName,
  nextOnString,
}: {
  box: MeasureBox
  final: boolean
  stringCount: number
  y: (string: number) => number
  staffBottom: number
  stemTop: number
  group: number
  showNames: boolean
  tuning: Array<string>
  settings: SheetSettings
  chordName: (symbol: string) => string
  nextOnString: (
    from: Placed,
    string: number,
  ) => { placed: Placed; note: ShiftedNote } | null
}) {
  const { measure, left, width, beats } = box
  const right = left + width
  const mid = (stringCount + 1) / 2
  const dotYs = [y(mid - 1), y(mid + 1)]
  const stemBottom = stemTop + STEM

  const beamGroups: Array<Array<Placed>> = []
  let run: Array<Placed> = []
  let runGroup = -1
  for (const placed of beats) {
    const groupIndex = Math.floor((placed.pos + 1e-6) / group)
    const beamable = beamCount(placed.beat) > 0
    if (beamable && groupIndex === runGroup) {
      run.push(placed)
      continue
    }
    if (run.length > 0) beamGroups.push(run)
    run = beamable ? [placed] : []
    runGroup = beamable ? groupIndex : -1
  }
  if (run.length > 0) beamGroups.push(run)

  return (
    <g>
      {measure.ending ? (
        <g className="fill-foreground stroke-foreground">
          <path
            d={`M ${left + 3} 13 V 4 H ${right - 6}`}
            fill="none"
            strokeWidth={1}
          />
          <text
            x={left + 6}
            y={12.5}
            fontSize="9"
            fontWeight={600}
            stroke="none"
          >
            {measure.ending}.
          </text>
        </g>
      ) : null}

      {measure.repeat?.start ? (
        <g>
          <rect
            x={left}
            y={y(1)}
            width={3}
            height={staffBottom - y(1)}
            className="fill-foreground"
          />
          <line
            x1={left + 5.5}
            x2={left + 5.5}
            y1={y(1)}
            y2={staffBottom}
            className="stroke-foreground"
            strokeWidth={1}
          />
          {dotYs.map((dy) => (
            <circle
              key={dy}
              cx={left + 9.5}
              cy={dy}
              r={1.8}
              className="fill-foreground"
            />
          ))}
        </g>
      ) : null}

      {measure.repeat?.times ? (
        <g>
          {dotYs.map((dy) => (
            <circle
              key={dy}
              cx={right - 9.5}
              cy={dy}
              r={1.8}
              className="fill-foreground"
            />
          ))}
          <line
            x1={right - 5.5}
            x2={right - 5.5}
            y1={y(1)}
            y2={staffBottom}
            className="stroke-foreground"
            strokeWidth={1}
          />
          <rect
            x={right - 3}
            y={y(1)}
            width={3}
            height={staffBottom - y(1)}
            className="fill-foreground"
          />
          <text
            x={right - 2}
            y={y(1) - 4}
            fontSize="9"
            fontWeight={700}
            textAnchor="end"
            className="fill-foreground"
          >
            ×{measure.repeat.times}
          </text>
        </g>
      ) : final ? (
        <g>
          <line
            x1={right - 5.5}
            x2={right - 5.5}
            y1={y(1)}
            y2={staffBottom}
            className="stroke-sheet-line"
            strokeWidth={1.25}
          />
          <rect
            x={right - 3}
            y={y(1)}
            width={3}
            height={staffBottom - y(1)}
            className="fill-foreground"
          />
        </g>
      ) : (
        <line
          x1={right}
          x2={right}
          y1={y(1)}
          y2={staffBottom}
          className="stroke-sheet-line"
          strokeWidth={1.25}
        />
      )}

      {beats.map((placed, beatIndex) => {
        const { beat, cx } = placed
        return (
          <g key={beatIndex}>
            {beat.chord ? (
              <text
                x={cx - 4}
                y={TOP - 12}
                fontSize="12"
                fontWeight={700}
                className="fill-chord"
              >
                {chordName(beat.chord)}
              </text>
            ) : null}

            {beat.notes.map((note) => (
              <NoteView
                key={note.s}
                placed={placed}
                note={note}
                y={y}
                next={note.t ? nextOnString(placed, note.s) : null}
              />
            ))}

            {showNames && beat.notes.length > 0
              ? [...beat.notes]
                  .sort((a, b) => a.s - b.s)
                  .map((note, index) => (
                    <text
                      key={`n${note.s}`}
                      x={cx}
                      y={staffBottom + 13 + index * NAME_LINE}
                      textAnchor="middle"
                      fontSize="8.5"
                      className="fill-muted-foreground"
                    >
                      {noteName(tuning, note, settings.notation)}
                    </text>
                  ))
              : null}

            {beat.rest ? (
              <RestGlyph cx={cx} top={stemTop} duration={beat.d} />
            ) : beat.d >= 2 ? (
              <line
                x1={cx}
                x2={cx}
                y1={beat.d === 2 ? stemTop + 9 : stemTop}
                y2={stemBottom}
                className="stroke-foreground"
                strokeWidth={1.1}
              />
            ) : null}

            {beat.dot ? (
              <circle
                cx={cx + 4.5}
                cy={stemBottom - 3}
                r={1.4}
                className="fill-foreground"
              />
            ) : null}
          </g>
        )
      })}

      {beamGroups.map((groupBeats, groupIndex) => {
        if (groupBeats.length === 1) {
          const only = groupBeats[0]
          return Array.from({ length: beamCount(only.beat) }, (_, level) => (
            <path
              key={`f${groupIndex}-${level}`}
              d={`M ${only.cx} ${stemBottom - level * 5} q 3 -3 7 -8`}
              fill="none"
              className="stroke-foreground"
              strokeWidth={1.4}
            />
          ))
        }
        const first = groupBeats[0]
        const lastBeat = groupBeats[groupBeats.length - 1]
        const secondary = groupBeats.flatMap((placed, index) => {
          const count = beamCount(placed.beat)
          return Array.from({ length: Math.max(0, count - 1) }, (_, offset) => {
            const level = offset + 2
            const nextBeat = groupBeats.at(index + 1)
            const prevBeat = index > 0 ? groupBeats.at(index - 1) : undefined
            if (nextBeat && beamCount(nextBeat.beat) >= level) {
              return { x1: placed.cx, x2: nextBeat.cx, level }
            }
            if (prevBeat && beamCount(prevBeat.beat) >= level) return null
            const toward = nextBeat ? 6 : -6
            return { x1: placed.cx, x2: placed.cx + toward, level }
          }).filter((item) => item !== null)
        })
        return (
          <g key={`b${groupIndex}`} className="fill-foreground">
            <rect
              x={first.cx - 0.55}
              y={stemBottom - 2.6}
              width={lastBeat.cx - first.cx + 1.1}
              height={2.6}
            />
            {secondary.map((item, index) => (
              <rect
                key={index}
                x={Math.min(item.x1, item.x2) - 0.55}
                y={stemBottom - 2.6 - (item.level - 1) * 4.5}
                width={Math.abs(item.x2 - item.x1) + 1.1}
                height={2.6}
              />
            ))}
          </g>
        )
      })}
    </g>
  )
}

function NoteView({
  placed,
  note,
  y,
  next,
}: {
  placed: Placed
  note: ShiftedNote
  y: (string: number) => number
  next: { placed: Placed; note: ShiftedNote } | null
}) {
  const { cx } = placed
  const ny = y(note.s)
  const label = String(note.f)
  const boxWidth = 6.5 * label.length + 4
  const sameSystem = next && next.placed.system === placed.system
  const x2 = sameSystem ? next.placed.cx : cx + 18

  return (
    <g>
      <rect
        x={cx - boxWidth / 2}
        y={ny - 6}
        width={boxWidth}
        height={12}
        style={{ fill: 'var(--sheet-bg, var(--background))' }}
      />
      <text
        x={cx}
        y={ny + 4}
        textAnchor="middle"
        fontSize="11.5"
        fontWeight={600}
        fontFamily="var(--font-mono)"
        className={note.unplayable ? 'fill-destructive' : 'fill-foreground'}
      >
        {label}
      </text>

      {note.t === 'h' || note.t === 'p' ? (
        <g className="stroke-foreground fill-foreground">
          <path
            d={`M ${cx + 3} ${ny - 7} Q ${(cx + x2) / 2} ${ny - 15} ${x2 - 3} ${ny - 7}`}
            fill="none"
            strokeWidth={1}
          />
          <text
            x={(cx + x2) / 2}
            y={ny - 14}
            fontSize="7.5"
            fontWeight={700}
            textAnchor="middle"
            stroke="none"
          >
            {note.t.toUpperCase()}
          </text>
        </g>
      ) : null}

      {note.t === '/' || note.t === '\\' ? (
        <line
          x1={cx + boxWidth / 2 + 1}
          x2={x2 - 6}
          y1={note.t === '/' ? ny + 3 : ny - 3}
          y2={note.t === '/' ? ny - 3 : ny + 3}
          className="stroke-foreground"
          strokeWidth={1.2}
        />
      ) : null}

      {note.t === 'b' ? (
        <g className="stroke-foreground fill-foreground">
          <path
            d={`M ${cx + boxWidth / 2} ${ny} Q ${cx + 13} ${ny} ${cx + 13} ${ny - 15}`}
            fill="none"
            strokeWidth={1.1}
          />
          <path
            d={`M ${cx + 10.5} ${ny - 12} L ${cx + 13} ${ny - 16} L ${cx + 15.5} ${ny - 12} Z`}
            stroke="none"
          />
          <text
            x={cx + 13}
            y={ny - 18}
            fontSize="8"
            fontWeight={600}
            textAnchor="middle"
            stroke="none"
          >
            {bendLabel(note.bend ?? 2)}
          </text>
        </g>
      ) : null}

      {note.t === '~' ? (
        <path
          d={`M ${cx + 6} ${ny - 9} q 2 -3 4 0 t 4 0 t 4 0 t 4 0`}
          fill="none"
          className="stroke-foreground"
          strokeWidth={1.1}
        />
      ) : null}
    </g>
  )
}

function RestGlyph({
  cx,
  top,
  duration,
}: {
  cx: number
  top: number
  duration: number
}) {
  if (duration === 1)
    return (
      <rect
        x={cx - 4}
        y={top + 5}
        width={8}
        height={3.5}
        className="fill-foreground"
      />
    )
  if (duration === 2)
    return (
      <rect
        x={cx - 4}
        y={top + 8.5}
        width={8}
        height={3.5}
        className="fill-foreground"
      />
    )
  if (duration === 4)
    return (
      <path
        d={`M ${cx - 1.5} ${top + 2} l 4 5 l -3.5 4 l 4 5 q -5 -2 -3 4`}
        fill="none"
        className="stroke-foreground"
        strokeWidth={1.6}
        strokeLinejoin="round"
      />
    )
  const flags = Math.log2(duration) - 2
  return (
    <g className="fill-foreground stroke-foreground">
      {Array.from({ length: flags }, (_, index) => (
        <circle
          key={index}
          cx={cx - 2 - index * 1.2}
          cy={top + 6 + index * 5}
          r={1.7}
          stroke="none"
        />
      ))}
      <path
        d={`M ${cx - 2} ${top + 7} q 3 1 5 -2 L ${cx - 1 - flags * 1.2} ${top + 13 + flags * 5}`}
        fill="none"
        strokeWidth={1.2}
      />
    </g>
  )
}
