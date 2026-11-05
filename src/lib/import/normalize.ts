import { transposeSymbol } from '../music/chords'
import { normalizeCapoToConcert } from '../music/chordpro'
import { previewTabShift } from '../music/tab'
import type { TabMeasure } from '../music/tab'
import type { DraftOutput } from './schema'

function cleanMeasures(measures: Array<TabMeasure>) {
  return measures.map((measure) => ({
    chordAbove: measure.chordAbove,
    events: measure.events.map((event) => ({
      position: event.position,
      notes: event.notes.map((note) => ({
        string: note.string,
        fret: note.fret,
        ...(note.technique ? { technique: note.technique } : {}),
        ...(note.bendSemitones !== undefined
          ? { bendSemitones: note.bendSemitones }
          : {}),
      })),
    })),
  }))
}

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
      const measures = (part.measures ?? []) as Array<TabMeasure>
      const shifted =
        input.tabRelativeToCapo && capo !== 0
          ? previewTabShift(measures, capo)
          : null
      if (shifted && !shifted.applied) warnings.push('outOfRange')
      const next = shifted?.applied ? shifted.measures : measures
      const playable = next.map((measure) => ({
        ...measure,
        chordAbove:
          shifted?.applied && measure.chordAbove
            ? transposeSymbol(measure.chordAbove, capo)
            : measure.chordAbove,
      }))
      const outOfNeck = playable.some((measure) =>
        measure.events.some((event) =>
          event.notes.some((note) => note.fret < 0 || note.fret > 22),
        ),
      )
      if (outOfNeck) warnings.push('outOfRange')
      return {
        kind: 'tab' as const,
        label: part.label,
        measures: cleanMeasures(playable),
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
