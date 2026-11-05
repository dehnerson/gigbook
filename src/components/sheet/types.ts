import type { Notation } from '@/lib/music/pitch'
import type { TabMeasure } from '@/lib/music/tab'

export type SheetPart = {
  _id: string
  kind: 'chart' | 'tab'
  label: string
  chartBody?: string
  strumming?: string
  measures?: Array<TabMeasure>
}

export type SheetEntry = {
  entryId: string
  section: { _id: string; name: string; notes?: string }
  parts: Array<SheetPart>
}

export type SheetVersion = {
  name: string
  concertKey: string
  timeSignature: string
  bpm?: number
  tuning: Array<string>
  suggestedCapo: number
}

export type SheetSong = { title: string; artist: string }

export type ChordShapeOverride = { symbol: string; frets: Array<number> }

export type DisplayMode = 'both' | 'lyrics' | 'chords'

export type SheetSettings = {
  capo: number
  transpose: number
  notation: Notation
  mode: DisplayMode
  scale: number
}
