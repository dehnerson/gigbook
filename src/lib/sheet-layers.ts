import {
  chartChords,
  isBarGridLine,
  isChordOnlyLine,
  parseChordPro,
  sectionLabelOf,
} from './music/chordpro.ts'
import { tabChords } from './music/tab.ts'
import type { TabMeasure } from './music/tab.ts'

export const LAYERS = ['lyrics', 'chords', 'strumming', 'tab', 'notes'] as const

export type Layer = (typeof LAYERS)[number]

export type LayerSet = Record<Layer, boolean>

export const DEFAULT_LAYERS: LayerSet = {
  lyrics: true,
  chords: true,
  strumming: true,
  tab: true,
  notes: false,
}

type LayeredPart = {
  kind: 'chart' | 'tab'
  chartBody?: string
  strumming?: string
  measures?: Array<TabMeasure>
}

function hasLyrics(body: string) {
  return body.split(/\r?\n/).some((line) => {
    if (!line.trim() || sectionLabelOf(line) || isBarGridLine(line))
      return false
    const tokens = parseChordPro(line)[0]?.tokens ?? []
    return (
      !isChordOnlyLine(tokens) &&
      tokens.some((token) => token.kind === 'text' && token.value.trim())
    )
  })
}

export function availableLayers(parts: Array<LayeredPart>): Array<Layer> {
  const found = new Set<Layer>()
  for (const part of parts) {
    if (part.kind === 'chart' && part.chartBody) {
      if (hasLyrics(part.chartBody)) found.add('lyrics')
      if (chartChords(part.chartBody).length > 0) found.add('chords')
    }
    if (part.kind === 'chart' && part.strumming?.trim()) found.add('strumming')
    if (part.kind === 'tab' && part.measures?.length) {
      found.add('tab')
      found.add('notes')
      if (tabChords(part.measures).length > 0) found.add('chords')
    }
  }
  return LAYERS.filter((layer) => found.has(layer))
}

/** Saved choices can hide everything a song has, e.g. tab off on a tab-only song. */
export function effectiveLayers(
  layers: LayerSet,
  available: Array<Layer>,
): LayerSet {
  if (available.length === 0 || available.some((layer) => layers[layer]))
    return layers
  return { ...layers, ...DEFAULT_LAYERS }
}

/** Turning a layer off is ignored when it would leave nothing to show. */
export function toggleLayer(
  layers: LayerSet,
  layer: Layer,
  available: Array<Layer>,
): LayerSet {
  const next = { ...layers, [layer]: !layers[layer] }
  return available.some((item) => next[item]) ? next : layers
}

export function parseLayers(stored: string | null): LayerSet | null {
  if (!stored) return null
  try {
    const value: unknown = JSON.parse(stored)
    if (!value || typeof value !== 'object') return null
    const record = value as Record<string, unknown>
    return Object.fromEntries(
      LAYERS.map((layer) => [
        layer,
        typeof record[layer] === 'boolean'
          ? record[layer]
          : DEFAULT_LAYERS[layer],
      ]),
    ) as LayerSet
  } catch {
    return null
  }
}

/** Maps the old Both / Lyrics / Chords display mode. */
export function layersFromMode(mode: string | null): LayerSet | null {
  if (mode === 'lyrics')
    return { ...DEFAULT_LAYERS, chords: false, strumming: false, tab: false }
  if (mode === 'chords') return { ...DEFAULT_LAYERS, lyrics: false }
  return null
}
