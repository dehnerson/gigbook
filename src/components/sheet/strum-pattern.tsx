import { ArrowDownIcon, ArrowUpIcon, XIcon } from 'lucide-react'
import { parseStrum } from '@/lib/music/strum'
import type { StrumStroke } from '@/lib/music/strum'
import { m } from '@/paraglide/messages'

function Stroke({ stroke }: { stroke: StrumStroke }) {
  if (stroke === 'down')
    return (
      <ArrowDownIcon className="size-[1.15em] text-chord" strokeWidth={2.5} />
    )
  if (stroke === 'up')
    return (
      <ArrowUpIcon className="size-[1.15em] text-chord" strokeWidth={2.5} />
    )
  if (stroke === 'mute')
    return (
      <XIcon className="size-[1em] text-muted-foreground" strokeWidth={2.5} />
    )
  return <span className="size-[1.15em]" />
}

export function StrumPattern({
  text,
  timeSignature,
  bpm,
}: {
  text: string
  timeSignature: string
  bpm?: number
}) {
  const pattern = parseStrum(text, timeSignature)
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-[0.85em]">
      <span className="text-[0.75em] font-semibold tracking-widest text-muted-foreground uppercase">
        {m.strumming()}
      </span>
      {pattern ? (
        <div className="flex items-end" aria-label={text}>
          {groupByBeat(pattern.slots, pattern.counts).map((beat, beatIndex) => (
            <div key={beatIndex} className="flex flex-col items-stretch px-0.5">
              <div className="flex">
                {beat.map((slot, slotIndex) => (
                  <div
                    key={slotIndex}
                    className="flex w-[1.6em] flex-col items-center gap-0.5"
                  >
                    <Stroke stroke={slot.stroke} />
                    {slot.count ? (
                      <span
                        className={
                          /\d/.test(slot.count)
                            ? 'text-[0.8em] font-semibold text-foreground'
                            : 'text-[0.75em] text-muted-foreground'
                        }
                      >
                        {slot.count}
                      </span>
                    ) : null}
                  </div>
                ))}
              </div>
              {pattern.counts ? (
                <div className="mx-1 mt-0.5 h-1.5 rounded-b border-x border-b border-foreground/30" />
              ) : null}
            </div>
          ))}
        </div>
      ) : (
        <span className="font-mono text-foreground">{text}</span>
      )}
      {bpm ? (
        <span className="font-mono text-[0.85em] text-muted-foreground">
          {bpm} bpm
        </span>
      ) : null}
    </div>
  )
}

function groupByBeat(slots: Array<StrumStroke>, counts: Array<string> | null) {
  const items = slots.map((stroke, index) => ({
    stroke,
    count: counts?.[index],
  }))
  if (!counts) return [items]
  const beats: Array<typeof items> = []
  for (const item of items) {
    if (item.count && /\d/.test(item.count)) beats.push([item])
    else beats.at(-1)?.push(item)
  }
  return beats
}
