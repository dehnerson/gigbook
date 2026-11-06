import { cn } from 'cn'
import {
  ALargeSmallIcon,
  FileMusicIcon,
  GuitarIcon,
  LayersIcon,
  ListIcon,
  MicVocalIcon,
  MinusIcon,
  PlusIcon,
  Repeat2Icon,
} from 'lucide-react'
import { Dialog } from 'react-aria-components'
import { signed, Stepper } from '@/components/app/stepper'
import { Segmented } from '@/components/app/segmented'
import { Button } from '@/components/ui/button'
import { Popover, PopoverTrigger } from '@/components/ui/popover'
import { Switch } from '@/components/ui/switch'
import { soundsAs } from '@/lib/music/chords'
import type { Notation } from '@/lib/music/pitch'
import { m } from '@/paraglide/messages'
import type { DisplayMode, SheetEntry, SheetLayout } from './types'
import { stepScale } from './use-sheet-prefs'

export function partOptions(timeline: Array<SheetEntry>) {
  const seen = new Set<string>()
  const options: Array<{ id: string; label: string; section: string }> = []
  for (const entry of timeline) {
    for (const part of entry.parts) {
      if (seen.has(part._id)) continue
      seen.add(part._id)
      options.push({
        id: part._id,
        label: part.label,
        section: entry.section.name,
      })
    }
  }
  return options
}

export function DisplayModeToggle({
  mode,
  onMode,
  size,
  iconOnly = false,
}: {
  mode: DisplayMode
  onMode: (mode: DisplayMode) => void
  size?: 'sm' | 'default'
  iconOnly?: boolean
}) {
  const label = (text: string) =>
    iconOnly ? <span className="sr-only">{text}</span> : text
  return (
    <Segmented
      aria-label={m.displayMode()}
      value={mode}
      onChange={onMode}
      size={size}
      options={[
        { id: 'both', label: label(m.modeBoth()), icon: FileMusicIcon },
        { id: 'lyrics', label: label(m.modeLyrics()), icon: MicVocalIcon },
        { id: 'chords', label: label(m.modeChords()), icon: GuitarIcon },
      ]}
    />
  )
}

export function LayoutToggle({
  layout,
  onLayout,
}: {
  layout: SheetLayout
  onLayout: (layout: SheetLayout) => void
}) {
  return (
    <Segmented
      aria-label={m.repeatLayout()}
      value={layout}
      onChange={onLayout}
      options={[
        {
          id: 'expanded',
          label: <span className="sr-only">{m.layoutExpanded()}</span>,
          icon: ListIcon,
        },
        {
          id: 'compact',
          label: <span className="sr-only">{m.layoutCompact()}</span>,
          icon: Repeat2Icon,
        },
      ]}
    />
  )
}

export function TextSizeControl({
  scale,
  onScale,
}: {
  scale: number
  onScale: (scale: number) => void
}) {
  return (
    <div
      role="group"
      aria-label={m.typeSize()}
      className="inline-flex items-center gap-0.5 rounded-xl border bg-card/60 p-1"
    >
      <Button
        variant="ghost"
        size="icon-sm"
        aria-label={`${m.typeSize()} −`}
        onPress={() => onScale(stepScale(scale, -1))}
      >
        <MinusIcon />
      </Button>
      <ALargeSmallIcon className="mx-1 size-4 text-muted-foreground" />
      <Button
        variant="ghost"
        size="icon-sm"
        aria-label={`${m.typeSize()} +`}
        onPress={() => onScale(stepScale(scale, 1))}
      >
        <PlusIcon />
      </Button>
    </div>
  )
}

export function PartsFilter({
  timeline,
  visiblePartIds,
  onVisiblePartIds,
}: {
  timeline: Array<SheetEntry>
  visiblePartIds: Array<string>
  onVisiblePartIds: (ids: Array<string>) => void
}) {
  const options = partOptions(timeline)
  if (options.length < 2) return null
  const all = options.map((option) => option.id)
  const visible = visiblePartIds.length === 0 ? all : visiblePartIds
  const hidden = all.length - visible.length
  return (
    <PopoverTrigger>
      <Button variant="outline" className="rounded-xl">
        <LayersIcon />
        {m.visibleParts()}
        {hidden > 0 ? (
          <span className="rounded-full bg-primary px-1.5 text-[0.7rem] text-primary-foreground">
            −{hidden}
          </span>
        ) : null}
      </Button>
      <Popover placement="bottom end" className="w-80">
        <Dialog className="outline-none" aria-label={m.visibleParts()}>
          <div className="mb-2 flex items-center justify-between">
            <span className="text-sm font-semibold">{m.visibleParts()}</span>
            <Button
              variant="ghost"
              size="sm"
              onPress={() => onVisiblePartIds([])}
            >
              {m.showAll()}
            </Button>
          </div>
          <ul className="max-h-80 space-y-1 overflow-y-auto">
            {options.map((option) => (
              <li key={option.id}>
                <Switch
                  isSelected={visible.includes(option.id)}
                  onChange={(on) => {
                    const next = on
                      ? [...visible, option.id]
                      : visible.filter((id) => id !== option.id)
                    onVisiblePartIds(next.length === all.length ? [] : next)
                  }}
                  className="flex w-full flex-row-reverse items-center justify-between gap-3 rounded-lg px-2 py-1.5 hover:bg-muted"
                >
                  <span className="min-w-0 text-sm">
                    <span className="block truncate font-medium">
                      {option.section}
                    </span>
                    <span className="block truncate text-xs text-muted-foreground">
                      {option.label}
                    </span>
                  </span>
                </Switch>
              </li>
            ))}
          </ul>
        </Dialog>
      </Popover>
    </PopoverTrigger>
  )
}

export function KeyControls({
  capo,
  onCapo,
  transpose,
  onTranspose,
  concertKey,
  notation,
  size,
}: {
  capo: number
  onCapo: (capo: number) => void
  transpose: number
  onTranspose?: (transpose: number) => void
  concertKey: string
  notation: Notation
  size?: 'default' | 'lg'
}) {
  return (
    <>
      <Stepper
        label={m.capo()}
        value={capo}
        onChange={onCapo}
        min={0}
        max={12}
        size={size}
      />
      {onTranspose ? (
        <Stepper
          label={m.transpose()}
          value={transpose}
          onChange={onTranspose}
          min={-11}
          max={11}
          size={size}
          format={(value) =>
            `${soundsAs(concertKey, value, notation)}${value === 0 ? '' : ` ${signed(value)}`}`
          }
        />
      ) : null}
    </>
  )
}

export function ControlBar({
  children,
  className,
}: {
  children: React.ReactNode
  className?: string
}) {
  return (
    <div className={cn('flex flex-wrap items-center gap-2', className)}>
      {children}
    </div>
  )
}
