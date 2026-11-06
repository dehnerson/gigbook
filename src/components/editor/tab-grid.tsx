import { cn } from 'cn'
import { useEffect, useId, useRef } from 'react'
import type * as React from 'react'
import { measureFill } from '@/lib/music/tab'
import type { Duration, TabMeasure, TabNote } from '@/lib/music/tab'
import type { TabCursor } from '@/lib/music/tab-edit'
import { m } from '@/paraglide/messages'

export const LENGTH_LABELS: Record<Duration, string> = {
  1: '1',
  2: '½',
  4: '¼',
  8: '⅛',
  16: '1/16',
  32: '1/32',
}

const BEND_LABELS: Record<number, string> = { 1: '½', 2: '', 3: '1½' }

export function noteLabel(note: TabNote) {
  if (note.t === 'b') return `${note.f}b${BEND_LABELS[note.bend ?? 2] ?? ''}`
  return `${note.f}${note.t ?? ''}`
}

export function TabGrid({
  measures,
  cursor,
  labels,
  timeSignature,
  status,
  onCursor,
  onKeyDown,
  gridRef,
}: {
  measures: Array<TabMeasure>
  cursor: TabCursor
  labels: Array<string>
  timeSignature: string
  status: string
  onCursor: (cursor: TabCursor) => void
  onKeyDown: (event: React.KeyboardEvent<HTMLDivElement>) => void
  gridRef: React.RefObject<HTMLDivElement | null>
}) {
  const selected = useRef<HTMLDivElement | null>(null)
  const statusId = useId()

  useEffect(() => {
    if (gridRef.current?.contains(document.activeElement))
      selected.current?.scrollIntoView({ block: 'nearest', inline: 'nearest' })
  }, [cursor, gridRef])

  return (
    <div
      ref={gridRef}
      tabIndex={0}
      role="application"
      aria-label={m.tabGrid()}
      aria-describedby={statusId}
      onKeyDown={onKeyDown}
      className="group/grid overflow-x-auto rounded-xl border bg-background/60 outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
    >
      <span id={statusId} aria-live="polite" className="sr-only">
        {status}
      </span>
      <div className="flex w-max min-w-full p-2">
        <div className="sticky left-0 z-10 flex flex-col bg-background/95 pr-1.5">
          <div className="h-10" />
          {labels.map((label, index) => (
            <div
              key={index}
              className="grid h-7 place-items-center font-mono text-xs text-muted-foreground"
            >
              {label}
            </div>
          ))}
        </div>
        {measures.map((measure, bar) => {
          const fill = measureFill(measure, timeSignature)
          return (
            <div
              key={bar}
              className="flex flex-col border-r-2 border-foreground/25 first:border-l-2"
            >
              <div className="flex">
                {measure.beats.map((beat, index) => {
                  const active = bar === cursor.bar && index === cursor.beat
                  return (
                    <div
                      key={index}
                      className={cn(
                        'flex w-10 flex-col',
                        active && 'bg-primary/10',
                      )}
                    >
                      <div className="flex h-10 flex-col items-center justify-end pb-1 leading-none">
                        <span className="h-4 max-w-full truncate text-xs font-semibold text-chord">
                          {beat.chord}
                        </span>
                        <span
                          className={cn(
                            'text-[0.7rem] tabular-nums',
                            active
                              ? 'font-semibold text-foreground'
                              : 'text-muted-foreground',
                          )}
                        >
                          {beat.rest ? '𝄽 ' : ''}
                          {LENGTH_LABELS[beat.d]}
                          {beat.dot ? '.' : ''}
                        </span>
                      </div>
                      {labels.map((_, row) => {
                        const string = row + 1
                        const note = beat.notes.find(
                          (item) => item.s === string,
                        )
                        const here = active && cursor.string === string
                        return (
                          <div
                            key={row}
                            ref={here ? selected : undefined}
                            onMouseDown={(event) => {
                              event.preventDefault()
                              gridRef.current?.focus()
                              onCursor({ bar, beat: index, string })
                            }}
                            className="relative grid h-7 cursor-pointer place-items-center"
                          >
                            <span className="absolute inset-x-0 top-1/2 h-px bg-foreground/20" />
                            {note ? (
                              <span className="relative rounded bg-background px-0.5 font-mono text-sm leading-none font-semibold">
                                {noteLabel(note)}
                              </span>
                            ) : null}
                            {here ? (
                              <span className="absolute inset-0.5 rounded-md ring-2 ring-primary/50 group-focus/grid:ring-primary" />
                            ) : null}
                          </div>
                        )
                      })}
                    </div>
                  )
                })}
              </div>
              <div
                className={cn(
                  'mt-1 px-1.5 text-[0.65rem] whitespace-nowrap text-muted-foreground',
                  fill !== 'full' && 'font-medium text-destructive',
                )}
              >
                {fill === 'short'
                  ? m.barShort()
                  : fill === 'long'
                    ? m.barLong()
                    : m.barNumber({ number: String(bar + 1) })}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
