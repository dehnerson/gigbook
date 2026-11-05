import { useEffect, useRef, useState } from 'react'
import { displayChord } from '@/lib/music/chords'
import { stringLabels } from '@/lib/music/diagrams'
import { previewTabShift } from '@/lib/music/tab'
import type { TabMeasure } from '@/lib/music/tab'
import type { SheetSettings } from './types'

const LABEL_WIDTH = 22
const COLUMN = 26
const MEASURE_PAD = 14
const LINE_GAP = 13
const TOP = 26
const BOTTOM = 10

function measureWidth(measure: TabMeasure) {
  return Math.max(70, MEASURE_PAD * 2 + measure.events.length * COLUMN)
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

export function TabStaff({
  measures,
  tuning,
  settings,
}: {
  measures: Array<TabMeasure>
  tuning: Array<string>
  settings: SheetSettings
}) {
  const [ref, available] = useWidth()
  const scale = settings.scale
  const shifted = previewTabShift(measures, settings.transpose).measures
  const stringCount = Math.max(
    tuning.length || 6,
    ...measures.flatMap((measure) =>
      measure.events.flatMap((event) => event.notes.map((note) => note.string)),
    ),
  )
  const labels = stringLabels(tuning, stringCount)
  const room = available / scale - LABEL_WIDTH - 2

  const systems: Array<{ start: number; items: Array<TabMeasure> }> = []
  let current: Array<TabMeasure> = []
  let used = 0
  let start = 0
  shifted.forEach((measure, index) => {
    const width = measureWidth(measure)
    if (current.length > 0 && used + width > room) {
      systems.push({ start, items: current })
      current = []
      used = 0
      start = index
    }
    current.push(measure)
    used += width
  })
  if (current.length > 0) systems.push({ start, items: current })

  return (
    <div ref={ref} className="w-full space-y-1 overflow-x-auto">
      {systems.map((system, systemIndex) => {
        const natural = system.items.reduce(
          (sum, measure) => sum + measureWidth(measure),
          0,
        )
        const isLast = systemIndex === systems.length - 1
        const stretch =
          !isLast || natural / room > 0.7 ? Math.max(1, room / natural) : 1
        const height = TOP + LINE_GAP * (stringCount - 1) + BOTTOM
        const width = LABEL_WIDTH + natural * stretch + 2
        const y = (string: number) => TOP + (string - 1) * LINE_GAP
        let x = LABEL_WIDTH
        return (
          <svg
            key={systemIndex}
            viewBox={`0 0 ${width} ${height}`}
            width={width * scale}
            height={height * scale}
            className="block max-w-none text-foreground"
            role="img"
          >
            <text x={2} y={10} fontSize="9" className="fill-muted-foreground">
              {system.start + 1}
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
                x2={width - 2}
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
              y2={y(stringCount)}
              className="stroke-sheet-line"
              strokeWidth={1.5}
            />
            {system.items.map((measure, measureIndex) => {
              const widthHere = measureWidth(measure) * stretch
              const left = x
              x += widthHere
              const inner = widthHere - MEASURE_PAD * 2
              const step =
                measure.events.length > 0 ? inner / measure.events.length : 0
              const finalBar =
                isLast && measureIndex === system.items.length - 1
              return (
                <g key={measureIndex}>
                  {measure.chordAbove ? (
                    <text
                      x={left + 6}
                      y={TOP - 11}
                      fontSize="12"
                      fontWeight={700}
                      className="fill-chord"
                    >
                      {displayChord(
                        measure.chordAbove,
                        settings.capo,
                        settings.transpose,
                        settings.notation,
                      )}
                    </text>
                  ) : null}
                  {measure.events.map((event, eventIndex) => {
                    const cx = left + MEASURE_PAD + step * (eventIndex + 0.5)
                    return event.notes.map((note) => {
                      const label = `${note.fret}${note.technique ?? ''}`
                      const boxWidth = 6.5 * label.length + 4
                      return (
                        <g key={`${eventIndex}-${note.string}`}>
                          <rect
                            x={cx - boxWidth / 2}
                            y={y(note.string) - 6}
                            width={boxWidth}
                            height={12}
                            style={{
                              fill: 'var(--sheet-bg, var(--background))',
                            }}
                          />
                          <text
                            x={cx}
                            y={y(note.string) + 4}
                            textAnchor="middle"
                            fontSize="11.5"
                            fontWeight={600}
                            fontFamily="var(--font-mono)"
                            className={
                              note.unplayable
                                ? 'fill-destructive'
                                : 'fill-foreground'
                            }
                          >
                            {label}
                          </text>
                        </g>
                      )
                    })
                  })}
                  <line
                    x1={finalBar ? x - 1.5 : x}
                    x2={finalBar ? x - 1.5 : x}
                    y1={y(1)}
                    y2={y(stringCount)}
                    className="stroke-sheet-line"
                    strokeWidth={finalBar ? 3 : 1.25}
                  />
                </g>
              )
            })}
          </svg>
        )
      })}
    </div>
  )
}
