import { displayChord } from './chords.ts'
import {
  diagramFromFrets,
  lookupChordDiagram,
  STANDARD_TUNING,
} from './diagrams.ts'
import type { ChordDiagram } from './diagrams.ts'
import type { Notation } from './pitch.ts'
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
