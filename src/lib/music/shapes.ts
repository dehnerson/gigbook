import { displayChord } from './chords.ts'
import {
  diagramFromFrets,
  lookupChordDiagram,
  STANDARD_TUNING,
} from './diagrams.ts'
import type { ChordDiagram } from './diagrams.ts'
import type { Notation } from './pitch.ts'
import type { ShiftedMeasure, TabMeasure } from './tab.ts'
import { chordVoicings, fingersFor } from './voicings.ts'

export type StoredShape = { frets: Array<number>; fingers?: Array<number> }
export type VersionShape = StoredShape & { symbol: string; shift: number }
export type PersonalShape = StoredShape & { symbol: string }
export type ShapeSource = 'version' | 'mine' | 'default'

export type ResolvedChord = {
  symbol: string
  name: string
  played: string
  shift: number
  diagram: ChordDiagram | null
  source: ShapeSource
}

export function effectiveTuning(tuning: Array<string>) {
  return tuning.length > 0 ? tuning : [...STANDARD_TUNING]
}

export function tuningKey(tuning: Array<string>) {
  return effectiveTuning(tuning).join(' ')
}

export function shapeKey(frets: Array<number>) {
  return frets.join(',')
}

export function shapeDiagram(shape: StoredShape) {
  return diagramFromFrets(shape.frets, shape.fingers ?? fingersFor(shape.frets))
}

function isStandard(tuning: Array<string>) {
  return tuningKey(tuning) === STANDARD_TUNING.join(' ')
}

export function defaultDiagram(played: string, tuning: Array<string>) {
  if (isStandard(tuning)) {
    const builtIn = lookupChordDiagram(played)
    if (builtIn) return builtIn
  }
  const first = chordVoicings(played, effectiveTuning(tuning), 1).at(0)
  return first ? shapeDiagram(first) : null
}

export function voicingOptions(
  played: string,
  tuning: Array<string>,
  limit = 12,
): Array<ChordDiagram> {
  const options: Array<ChordDiagram> = []
  const seen = new Set<string>()
  const add = (diagram: ChordDiagram | null) => {
    if (!diagram || seen.has(shapeKey(diagram.frets))) return
    seen.add(shapeKey(diagram.frets))
    options.push(diagram)
  }
  if (isStandard(tuning)) add(lookupChordDiagram(played))
  for (const voicing of chordVoicings(played, effectiveTuning(tuning), limit))
    add(shapeDiagram(voicing))
  return options.slice(0, limit)
}

export function resolveChord({
  symbol,
  capo,
  transpose,
  notation,
  tuning,
  versionShapes,
  personalShapes,
}: {
  symbol: string
  capo: number
  transpose: number
  notation: Notation
  tuning: Array<string>
  versionShapes: Array<VersionShape>
  personalShapes: Array<PersonalShape>
}): ResolvedChord {
  const shift = transpose - capo
  const played = displayChord(symbol, capo, transpose, 'en')
  const base = {
    symbol,
    name: displayChord(symbol, capo, transpose, notation),
    played,
    shift,
  }
  const fromVersion = versionShapes.find(
    (shape) => shape.symbol === symbol && shape.shift === shift,
  )
  if (fromVersion)
    return { ...base, diagram: shapeDiagram(fromVersion), source: 'version' }
  const mine = personalShapes.find((shape) => shape.symbol === played)
  if (mine) return { ...base, diagram: shapeDiagram(mine), source: 'mine' }
  return { ...base, diagram: defaultDiagram(played, tuning), source: 'default' }
}

/** Lowest string first in `frets`; muted strings (`-1`) are left out. */
export function notesForFrets(frets: Array<number>) {
  return frets
    .flatMap((fret, index) =>
      fret >= 0 ? [{ s: frets.length - index, f: fret }] : [],
    )
    .sort((a, b) => a.s - b.s)
}

function gripKey(notes: Array<{ s: number; f: number }>) {
  return notes
    .map((note) => `${note.s}.${note.f}`)
    .sort()
    .join(' ')
}

/**
 * Full chord grips follow the same shape as the diagram (version, then
 * personal, then the built-in). A beat counts as a grip only when its stored
 * frets are exactly one of the library voicings for its chord and no note has
 * a technique, so riffs and hand-edited frets stay as written.
 * The stored tab is not changed; this is a display overlay. Grip frets are
 * already the shape for the current capo and transpose, so callers must pass
 * the transposed staff and this replaces those beats instead of shifting them
 * again.
 */
export function overlayChordShapes(
  measures: Array<TabMeasure>,
  shifted: Array<ShiftedMeasure>,
  options: {
    tuning: Array<string>
    capo: number
    transpose: number
    notation: Notation
    versionShapes: Array<VersionShape>
    personalShapes: Array<PersonalShape>
  },
): Array<ShiftedMeasure> {
  const libraries = new Map<string, Set<string>>()
  const replacements = new Map<string, Array<number> | null>()

  const libraryOf = (symbol: string) => {
    const cached = libraries.get(symbol)
    if (cached) return cached
    const keys = new Set(
      voicingOptions(symbol, options.tuning).map((diagram) =>
        gripKey(notesForFrets(diagram.frets)),
      ),
    )
    libraries.set(symbol, keys)
    return keys
  }

  const fretsFor = (symbol: string) => {
    if (replacements.has(symbol)) return replacements.get(symbol) ?? null
    const frets = resolveChord({ symbol, ...options }).diagram?.frets ?? null
    replacements.set(symbol, frets)
    return frets
  }

  return shifted.map((measure, index) => {
    const source = measures.at(index)
    if (!source) return measure
    const beats = measure.beats.map((beat, beatIndex) => {
      const original = source.beats.at(beatIndex)
      if (!original?.chord || original.rest || original.notes.length === 0)
        return beat
      if (original.notes.some((note) => note.t)) return beat
      if (!libraryOf(original.chord).has(gripKey(original.notes))) return beat
      const frets = fretsFor(original.chord)
      if (!frets) return beat
      const notes = notesForFrets(frets)
      if (gripKey(notes) === gripKey(beat.notes)) return beat
      return { ...beat, notes }
    })
    return beats.some((beat, beatIndex) => beat !== measure.beats[beatIndex])
      ? { ...measure, beats }
      : measure
  })
}
