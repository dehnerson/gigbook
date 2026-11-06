import type { Id } from '../../../convex/_generated/dataModel'
import type { TabMeasure } from '@/lib/music/tab'

export type EditorPart = {
  _id: Id<'parts'>
  kind: 'chart' | 'tab'
  label: string
  chartBody?: string
  strumming?: string
  measures?: Array<TabMeasure>
  order: number
}

export type EditorEntry = {
  entryId: string
  repeat?: number
  sectionId: Id<'sections'>
  section: { _id: Id<'sections'>; name: string; notes?: string }
  parts: Array<EditorPart>
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
}
