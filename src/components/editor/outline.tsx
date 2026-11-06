import { cn } from 'cn'
import {
  FileMusicIcon,
  GripVerticalIcon,
  PlusIcon,
  RepeatIcon,
  SlidersHorizontalIcon,
} from 'lucide-react'
import { useState } from 'react'
import { useSortable } from '@/components/app/sortable'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { m } from '@/paraglide/messages'
import type { EditorEntry } from './types'

export function Outline({
  timeline,
  selected,
  onSelect,
  onReorder,
  onAdd,
}: {
  timeline: Array<EditorEntry>
  selected: string
  onSelect: (id: string) => void
  onReorder: (entryIds: Array<string>) => void
  onAdd: (name: string) => void
}) {
  const { order, dragging, itemProps } = useSortable(
    timeline.map((entry) => entry.entryId),
    onReorder,
  )
  const [name, setName] = useState('')

  const byId = new Map(timeline.map((entry) => [entry.entryId, entry]))
  const counts = new Map<string, number>()
  for (const entry of timeline)
    counts.set(entry.sectionId, (counts.get(entry.sectionId) ?? 0) + 1)

  const suggestions = [
    m.sectionIntro(),
    m.sectionVerse(),
    m.sectionChorus(),
    m.sectionBridge(),
    m.sectionSolo(),
    m.sectionOutro(),
  ]

  return (
    <div className="space-y-4">
      <button
        type="button"
        onClick={() => onSelect('details')}
        className={cn(
          'flex w-full items-center gap-3 rounded-xl border px-3 py-2.5 text-left text-sm font-medium transition-colors',
          selected === 'details'
            ? 'border-primary/40 bg-primary/10 text-foreground'
            : 'bg-card/60 text-muted-foreground hover:text-foreground',
        )}
      >
        <SlidersHorizontalIcon className="size-4 text-primary" />
        {m.versionDetails()}
      </button>

      <div>
        <div className="mb-2 px-1 text-xs font-semibold tracking-widest text-muted-foreground uppercase">
          {m.sections()}
        </div>
        {order.length === 0 ? (
          <p className="rounded-xl border border-dashed px-3 py-4 text-center text-sm text-muted-foreground">
            {m.noSectionsYet()}
          </p>
        ) : (
          <ol className="space-y-1">
            {order.map((entryId, index) => {
              const entry = byId.get(entryId)
              if (!entry) return null
              const repeated = (counts.get(entry.sectionId) ?? 0) > 1
              const active = selected === entryId
              return (
                <li
                  key={entryId}
                  {...itemProps(entryId)}
                  className={cn(
                    'group flex cursor-pointer items-center gap-2 rounded-lg border px-2 py-2 text-sm transition-colors',
                    active
                      ? 'border-primary/40 bg-primary/10'
                      : 'border-transparent hover:bg-card',
                    dragging === entryId && 'opacity-50',
                  )}
                  onClick={() => onSelect(entryId)}
                >
                  <GripVerticalIcon className="size-4 shrink-0 cursor-grab text-muted-foreground/50 group-hover:text-muted-foreground" />
                  <span className="w-5 shrink-0 text-right font-mono text-xs text-muted-foreground">
                    {index + 1}
                  </span>
                  <span
                    className={cn(
                      'min-w-0 flex-1 truncate font-medium',
                      active ? 'text-foreground' : 'text-foreground/85',
                    )}
                  >
                    {entry.section.name}
                  </span>
                  {entry.repeat && entry.repeat > 1 ? (
                    <span className="shrink-0 font-mono text-xs font-semibold text-primary">
                      ×{entry.repeat}
                    </span>
                  ) : null}
                  {repeated ? (
                    <RepeatIcon
                      className="size-3.5 shrink-0 text-primary"
                      aria-label={m.repeatedSection()}
                    />
                  ) : null}
                  <span className="flex shrink-0 items-center gap-0.5 text-muted-foreground">
                    {entry.parts.length === 0 ? null : (
                      <span className="flex items-center gap-0.5 text-xs">
                        <FileMusicIcon className="size-3.5" />
                        {entry.parts.length}
                      </span>
                    )}
                  </span>
                </li>
              )
            })}
          </ol>
        )}
      </div>

      <form
        className="space-y-2"
        onSubmit={(event) => {
          event.preventDefault()
          if (!name.trim()) return
          onAdd(name.trim())
          setName('')
        }}
      >
        <div className="flex gap-2">
          <Input
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder={m.sectionName()}
            aria-label={m.sectionName()}
          />
          <Button type="submit" size="icon" aria-label={m.addSection()}>
            <PlusIcon />
          </Button>
        </div>
        <div className="flex flex-wrap gap-1">
          {suggestions.map((suggestion) => (
            <button
              key={suggestion}
              type="button"
              onClick={() => onAdd(suggestion)}
              className="rounded-full border px-2.5 py-1 text-xs text-muted-foreground transition-colors hover:border-primary/40 hover:text-foreground"
            >
              + {suggestion}
            </button>
          ))}
        </div>
      </form>
    </div>
  )
}
