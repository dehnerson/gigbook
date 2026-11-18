import type { Id } from '../../../convex/_generated/dataModel'
import type { TabMeasure } from '@/lib/music/tab'
import type { StoredPart } from '@/lib/parts'

export type EditorLine = {
  _id: Id<'lines'>
  partId: string
  measures?: Array<TabMeasure>
  rhythmGuessed?: boolean
}

export type EditorEntry = {
  entryId: string
  repeat?: number
  sectionId: Id<'sections'>
  section: {
    _id: Id<'sections'>
    name: string
    notes?: string
    chartBody?: string
    strumming?: string
  }
  lines: Array<EditorLine>
}

export type EditorVersion = {
  _id: Id<'versions'>
  songId: Id<'songs'>
  name: string
  artist?: string
  concertKey: string
  timeSignature: string
  bpm?: number
  tuning: Array<string>
  suggestedCapo: number
  parts?: Array<StoredPart>
}
