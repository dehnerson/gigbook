import type { Notation } from '@/lib/music/pitch'
import type { TabMeasure } from '@/lib/music/tab'
import type { StoredPart } from '@/lib/parts'
import type { LayerSet } from '@/lib/sheet-layers'

export type SheetLine = {
  _id: string
  partId: string
  measures?: Array<TabMeasure>
}

export type SheetEntry = {
  entryId: string
  repeat?: number
  section: {
    _id: string
    name: string
    notes?: string
    chartBody?: string
    strumming?: string
  }
  lines: Array<SheetLine>
}

export type SheetVersion = {
  name: string
  artist?: string
  concertKey: string
  timeSignature: string
  bpm?: number
  tuning: Array<string>
  suggestedCapo: number
  parts?: Array<StoredPart>
}

export type SheetSong = { title: string; subTitle?: string }

export type ChordShapeOverride = {
  symbol: string
  shift: number
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
