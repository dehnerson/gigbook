import type { Notation } from '@/lib/music/pitch'
import type { TabMeasure } from '@/lib/music/tab'
import type { LayerSet } from '@/lib/sheet-layers'
import type { StoredTrack } from '@/lib/tracks'

export type SheetPart = {
  _id: string
  kind: 'chart' | 'tab'
  label: string
  trackId?: string
  chartBody?: string
  strumming?: string
  measures?: Array<TabMeasure>
  repeat?: number
}

export type SheetEntry = {
  entryId: string
  repeat?: number
  section: { _id: string; name: string; notes?: string }
  parts: Array<SheetPart>
}

export type SheetVersion = {
  name: string
  artist?: string
  concertKey: string
  timeSignature: string
  bpm?: number
  tuning: Array<string>
  suggestedCapo: number
  tracks?: Array<StoredTrack>
}

export type SheetSong = { title: string; artist: string }

export type ChordShapeOverride = {
  symbol: string
  shift?: number
  frets: Array<number>
  fingers?: Array<number>
}

export type SheetLayout = 'expanded' | 'compact'

export type SheetSettings = {
  capo: number
  transpose: number
  notation: Notation
  layers: LayerSet
  scale: number
}
