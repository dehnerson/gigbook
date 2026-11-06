import { useEffect, useState } from 'react'
import {
  availableLayers,
  DEFAULT_LAYERS,
  effectiveLayers,
  layersFromMode,
  parseLayers,
} from '@/lib/sheet-layers'
import type { LayerSet } from '@/lib/sheet-layers'
import { visibleParts } from '@/lib/tracks'
import type { StoredTrack } from '@/lib/tracks'
import type { SheetEntry, SheetLayout } from './types'

export const SCALES = [0.85, 1, 1.15, 1.3, 1.5, 1.75, 2] as const

export function useSheetPrefs(
  scope: 'read' | 'play' | 'jam',
  defaultScale = 1,
) {
  const layersKey = `sheet:${scope}:layers`
  const legacyModeKey = `sheet:${scope}:mode`
  const scaleKey = `sheet:${scope}:scale`
  const layoutKey = `sheet:${scope}:layout`
  const [layers, setLayersState] = useState<LayerSet>(DEFAULT_LAYERS)
  const [scale, setScaleState] = useState(defaultScale)
  const [layout, setLayoutState] = useState<SheetLayout>('expanded')

  useEffect(() => {
    const stored =
      parseLayers(localStorage.getItem(layersKey)) ??
      layersFromMode(localStorage.getItem(legacyModeKey))
    if (stored) setLayersState(stored)
    localStorage.removeItem(legacyModeKey)
    const storedScale = Number(localStorage.getItem(scaleKey))
    if (storedScale > 0) setScaleState(storedScale)
    if (localStorage.getItem(layoutKey) === 'compact') setLayoutState('compact')
  }, [layersKey, legacyModeKey, scaleKey, layoutKey])

  return {
    layers,
    scale,
    layout,
    setLayers: (next: LayerSet) => {
      setLayersState(next)
      localStorage.setItem(layersKey, JSON.stringify(next))
    },
    setLayout: (next: SheetLayout) => {
      setLayoutState(next)
      localStorage.setItem(layoutKey, next)
    },
    setScale: (next: number) => {
      setScaleState(next)
      localStorage.setItem(scaleKey, String(next))
    },
  }
}

export function useSheetLayers(
  saved: LayerSet,
  timeline: Array<SheetEntry>,
  tracks: Array<StoredTrack> | undefined,
  visibleTrackIds?: Array<string>,
) {
  const available = availableLayers(
    visibleParts(timeline, tracks, visibleTrackIds),
  )
  return { available, layers: effectiveLayers(saved, available) }
}

export function stepScale(scale: number, direction: 1 | -1) {
  const index = SCALES.findIndex((value) => value >= scale - 0.001)
  const current = index === -1 ? SCALES.length - 1 : index
  const next = Math.min(SCALES.length - 1, Math.max(0, current + direction))
  return SCALES[next] ?? 1
}
