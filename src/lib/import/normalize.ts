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
  const sections = input.sections.map((section) => {
    const repeat =
      section.repeat && section.repeat > 1
        ? Math.min(Math.round(section.repeat), 16)
        : undefined
    return {
      name: section.name,
      notes: section.notes,
      chartBody: section.chartBody
        ? normalizeCapoToConcert(section.chartBody, capo).body
        : undefined,
      strumming: section.strumming,
      ...(repeat ? { repeat } : {}),
      lines: section.lines.map((line) => {
        const measures: Array<TabMeasure> = line.measures ?? []
        const shifted =
          line.instrument === 'guitar' && input.tabRelativeToCapo && capo !== 0
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
          part: line.part,
          instrument: line.instrument,
          measures: cleanTabMeasures(playable),
          ...(line.rhythmGuessed ? { rhythmGuessed: true } : {}),
        }
      }),
    }
  })
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
