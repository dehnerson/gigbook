import { transposeSymbol } from '../music/chords'
import { normalizeCapoToConcert } from '../music/chordpro'
import {
  cleanTabMeasures,
  MAX_FRET,
  mapTabChords,
  previewTabShift,
} from '../music/tab'
import type { TabMeasure } from '../music/tab'
import type { DraftOutput } from './schema'

export function normalizeDraft(input: DraftOutput) {
  const warnings: Array<string> = []
  const capo = input.suggestedCapo
  const sections = input.sections.map((section) => ({
    name: section.name,
    notes: section.notes,
    parts: section.parts.map((part) => {
      if (part.kind === 'chart') {
        return {
          kind: 'chart' as const,
          label: part.label,
          chartBody: normalizeCapoToConcert(part.chartBody ?? '', capo).body,
          strumming: part.strumming,
        }
      }
      const measures: Array<TabMeasure> = part.measures ?? []
      const shifted =
        input.tabRelativeToCapo && capo !== 0
          ? previewTabShift(measures, capo)
          : null
      if (shifted && !shifted.applied) warnings.push('outOfRange')
      const playable = shifted?.applied
        ? mapTabChords(shifted.measures, (symbol) =>
            transposeSymbol(symbol, capo),
          )
        : measures
      const outOfNeck = playable.some((measure) =>
        measure.beats.some((beat) =>
          beat.notes.some((note) => note.f < 0 || note.f > MAX_FRET),
        ),
      )
      if (outOfNeck) warnings.push('outOfRange')
      return {
        kind: 'tab' as const,
        label: part.label,
        measures: cleanTabMeasures(playable),
        ...(part.rhythmGuessed ? { rhythmGuessed: true } : {}),
      }
    }),
  }))
  return {
    output: {
      title: input.title,
      artist: input.artist,
      concertKey: input.concertKey,
      timeSignature: input.timeSignature,
      bpm: input.bpm,
      tuning: input.tuning,
      suggestedCapo: capo,
      sections,
    },
    warnings: [...new Set(warnings)],
  }
}
