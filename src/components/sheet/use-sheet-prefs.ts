import { useEffect, useState } from 'react'
import {
  availableLayers,
  DEFAULT_LAYERS,
  effectiveLayers,
  parseLayers,
} from '@/lib/sheet-layers'
import type { LayerSet } from '@/lib/sheet-layers'
import { onVisiblePart } from '@/lib/parts'
import type { SheetEntry, SheetLayout } from './types'

export const SCALES = [0.85, 1, 1.15, 1.3, 1.5, 1.75, 2] as const

export function useSheetPrefs(
  scope: 'read' | 'play' | 'jam',
  defaultScale = 1,
) {
  const layersKey = `sheet:${scope}:layers`
  const scaleKey = `sheet:${scope}:scale`
  const layoutKey = `sheet:${scope}:layout`
  const [layers, setLayersState] = useState<LayerSet>(DEFAULT_LAYERS)
  const [scale, setScaleState] = useState(defaultScale)
  const [layout, setLayoutState] = useState<SheetLayout>('expanded')

  useEffect(() => {
    const stored = parseLayers(localStorage.getItem(layersKey))
    if (stored) setLayersState(stored)
    const storedScale = Number(localStorage.getItem(scaleKey))
    if (storedScale > 0) setScaleState(storedScale)
    if (localStorage.getItem(layoutKey) === 'compact') setLayoutState('compact')
  }, [layersKey, scaleKey, layoutKey])

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
  visiblePartIds?: Array<string>,
) {
  const available = availableLayers(
    timeline.flatMap((entry) => [
      {
        chartBody: entry.section.chartBody,
        strumming: entry.section.strumming,
      },
      ...entry.lines
        .filter((line) => onVisiblePart(line.partId, visiblePartIds))
        .map((line) => ({ measures: line.measures })),
    ]),
  )
  return { available, layers: effectiveLayers(saved, available) }
}

export function stepScale(scale: number, direction: 1 | -1) {
  const index = SCALES.findIndex((value) => value >= scale - 0.001)
  const current = index === -1 ? SCALES.length - 1 : index
  const next = Math.min(SCALES.length - 1, Math.max(0, current + direction))
  return SCALES[next] ?? 1
}
