import { cn } from 'cn'
import {
  ALargeSmallIcon,
  ArrowDownUpIcon,
  GuitarIcon,
  ListFilterIcon,
  ListIcon,
  MicVocalIcon,
  MinusIcon,
  Music2Icon,
  PlusIcon,
  Repeat2Icon,
  Rows3Icon,
} from 'lucide-react'
import type * as React from 'react'
import { Dialog, ToggleButton } from 'react-aria-components'
import { signed, Stepper } from '@/components/app/stepper'
import { Segmented } from '@/components/app/segmented'
import { Button } from '@/components/ui/button'
import { Popover, PopoverTrigger } from '@/components/ui/popover'
import { Switch } from '@/components/ui/switch'
import { soundsAs } from '@/lib/music/chords'
import type { Notation } from '@/lib/music/pitch'
import { toggleLayer } from '@/lib/sheet-layers'
import type { Layer, LayerSet } from '@/lib/sheet-layers'
import { usedTracks } from '@/lib/tracks'
import type { StoredTrack } from '@/lib/tracks'
import { m } from '@/paraglide/messages'
import { trackName } from './tracks'
import type { SheetEntry, SheetLayout } from './types'
import { stepScale } from './use-sheet-prefs'

const LAYER_INFO: Record<
  Layer,
  { name: () => string; icon: React.ComponentType<{ className?: string }> }
> = {
  lyrics: { name: m.layerLyrics, icon: MicVocalIcon },
  chords: { name: m.layerChords, icon: GuitarIcon },
  strumming: { name: m.layerStrumming, icon: ArrowDownUpIcon },
  tab: { name: m.layerTab, icon: Rows3Icon },
  notes: { name: m.layerNotes, icon: Music2Icon },
}

export function LayerToggles({
  layers,
  available,
  onLayers,
  iconOnly = false,
}: {
  layers: LayerSet
  available: Array<Layer>
  onLayers: (layers: LayerSet) => void
  iconOnly?: boolean
}) {
  if (available.length < 2) return null
  return (
    <div
      role="group"
      aria-label={m.layers()}
      className="inline-flex items-center gap-0.5 rounded-xl border bg-muted/40 p-1"
    >
      {available.map((layer) => {
        const { name, icon: Icon } = LAYER_INFO[layer]
        return (
          <ToggleButton
            key={layer}
            isSelected={layers[layer]}
            onChange={() => onLayers(toggleLayer(layers, layer, available))}
            aria-label={iconOnly ? name() : undefined}
            className="inline-flex h-8 items-center justify-center gap-1.5 rounded-lg px-2.5 text-sm font-medium whitespace-nowrap text-muted-foreground transition-colors outline-none hover:text-foreground data-focus-visible:ring-2 data-focus-visible:ring-ring data-selected:bg-background data-selected:text-foreground data-selected:shadow-sm dark:data-selected:bg-raised"
          >
            <Icon className="size-4" />
            {iconOnly ? null : name()}
          </ToggleButton>
        )
      })}
    </div>
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

export function TracksFilter({
  timeline,
  tracks,
  visibleTrackIds,
  onVisibleTrackIds,
  iconOnly = false,
}: {
  timeline: Array<SheetEntry>
  tracks: Array<StoredTrack> | undefined
  visibleTrackIds: Array<string>
  onVisibleTrackIds: (ids: Array<string>) => void
  iconOnly?: boolean
}) {
  const options = usedTracks(
    tracks,
    timeline.flatMap((entry) => entry.parts),
  )
  if (options.length < 2) return null
  const all = options.map((option) => option.id)
  const chosen = visibleTrackIds.filter((id) => all.includes(id))
  const visible = chosen.length === 0 ? all : chosen
  const hidden = all.length - visible.length
  return (
    <PopoverTrigger>
      <Button
        variant="outline"
        size={iconOnly ? 'icon' : 'default'}
        aria-label={iconOnly ? m.showTracks() : undefined}
        className="relative rounded-xl"
      >
        <ListFilterIcon />
        {iconOnly ? null : m.showTracks()}
        {hidden > 0 ? (
          <span
            className={cn(
              'rounded-full bg-primary px-1.5 text-[0.7rem] text-primary-foreground',
              iconOnly && 'absolute -top-1.5 -right-1.5',
            )}
          >
            −{hidden}
          </span>
        ) : null}
      </Button>
      <Popover placement="bottom end" className="w-72">
        <Dialog className="outline-none" aria-label={m.showTracks()}>
          <div className="mb-2 flex items-center justify-between">
            <span className="text-sm font-semibold">{m.showTracks()}</span>
            <Button
              variant="ghost"
              size="sm"
              onPress={() => onVisibleTrackIds([])}
            >
              {m.showAll()}
            </Button>
          </div>
          <ul className="space-y-1">
            {options.map((option) => (
              <li
                key={option.id}
                className="flex items-center justify-between gap-3 rounded-lg px-2 py-1.5"
              >
                <span className="min-w-0 truncate text-sm font-medium">
                  {trackName(option)}
                </span>
                <Switch
                  aria-label={trackName(option)}
                  isSelected={visible.includes(option.id)}
                  onChange={(on) => {
                    const next = on
                      ? [...visible, option.id]
                      : visible.filter((id) => id !== option.id)
                    if (next.length === 0) return
                    onVisibleTrackIds(next.length === all.length ? [] : next)
                  }}
                />
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
