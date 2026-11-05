import { parseChord } from './chords.ts'
import { mod12 } from './pitch.ts'
import type { Notation } from './pitch.ts'

export type Barre = {
  fret: number
  from: number
  to: number
}

export type ChordDiagram = {
  frets: Array<number>
  fingers?: Array<number>
  barre?: Barre
  baseFret: number
}

type Quality =
  | 'maj'
  | 'm'
  | '7'
  | 'm7'
  | 'maj7'
  | 'sus2'
  | 'sus4'
  | 'add9'
  | 'dim'
  | 'm7b5'
  | '6'
  | 'm6'
  | '9'
  | '5'

const QUALITY_ALIASES: Record<string, Quality> = {
  '': 'maj',
  maj: 'maj',
  M: 'maj',
  m: 'm',
  min: 'm',
  '-': 'm',
  '7': '7',
  dom7: '7',
  m7: 'm7',
  min7: 'm7',
  '-7': 'm7',
  maj7: 'maj7',
  M7: 'maj7',
  j7: 'maj7',
  sus2: 'sus2',
  '2': 'sus2',
  sus: 'sus4',
  sus4: 'sus4',
  add9: 'add9',
  add2: 'add9',
  dim: 'dim',
  o: 'dim',
  m7b5: 'm7b5',
  '6': '6',
  m6: 'm6',
  '9': '9',
  '5': '5',
}

function normalizeQuality(quality: string): Quality | null {
  return QUALITY_ALIASES[quality] ?? null
}

type Shape = { frets: Array<number>; fingers: Array<number> }

// Strings run from low E (index 0) to high e (index 5).
const OPEN: Record<string, Shape> = {
  C: { frets: [-1, 3, 2, 0, 1, 0], fingers: [0, 3, 2, 0, 1, 0] },
  Cmaj7: { frets: [-1, 3, 2, 0, 0, 0], fingers: [0, 3, 2, 0, 0, 0] },
  C7: { frets: [-1, 3, 2, 3, 1, 0], fingers: [0, 3, 2, 4, 1, 0] },
  Cadd9: { frets: [-1, 3, 2, 0, 3, 0], fingers: [0, 2, 1, 0, 3, 0] },
  Csus2: { frets: [-1, 3, 0, 0, 1, 3], fingers: [0, 2, 0, 0, 1, 4] },
  Csus4: { frets: [-1, 3, 3, 0, 1, 1], fingers: [0, 3, 4, 0, 1, 1] },
  C6: { frets: [-1, 3, 2, 2, 1, 0], fingers: [0, 4, 2, 3, 1, 0] },
  D: { frets: [-1, -1, 0, 2, 3, 2], fingers: [0, 0, 0, 1, 3, 2] },
  Dm: { frets: [-1, -1, 0, 2, 3, 1], fingers: [0, 0, 0, 2, 3, 1] },
  D7: { frets: [-1, -1, 0, 2, 1, 2], fingers: [0, 0, 0, 2, 1, 3] },
  Dm7: { frets: [-1, -1, 0, 2, 1, 1], fingers: [0, 0, 0, 2, 1, 1] },
  Dmaj7: { frets: [-1, -1, 0, 2, 2, 2], fingers: [0, 0, 0, 1, 2, 3] },
  Dsus2: { frets: [-1, -1, 0, 2, 3, 0], fingers: [0, 0, 0, 1, 3, 0] },
  Dsus4: { frets: [-1, -1, 0, 2, 3, 3], fingers: [0, 0, 0, 1, 3, 4] },
  Dadd9: { frets: [-1, -1, 0, 2, 3, 0], fingers: [0, 0, 0, 1, 3, 0] },
  D6: { frets: [-1, -1, 0, 2, 0, 2], fingers: [0, 0, 0, 1, 0, 3] },
  D5: { frets: [-1, -1, 0, 2, 3, -1], fingers: [0, 0, 0, 1, 3, 0] },
  E: { frets: [0, 2, 2, 1, 0, 0], fingers: [0, 2, 3, 1, 0, 0] },
  Em: { frets: [0, 2, 2, 0, 0, 0], fingers: [0, 2, 3, 0, 0, 0] },
  E7: { frets: [0, 2, 0, 1, 0, 0], fingers: [0, 2, 0, 1, 0, 0] },
  Em7: { frets: [0, 2, 2, 0, 3, 0], fingers: [0, 1, 2, 0, 3, 0] },
  Emaj7: { frets: [0, 2, 1, 1, 0, 0], fingers: [0, 3, 1, 2, 0, 0] },
  Esus4: { frets: [0, 2, 2, 2, 0, 0], fingers: [0, 2, 3, 4, 0, 0] },
  Eadd9: { frets: [0, 2, 2, 1, 0, 2], fingers: [0, 2, 3, 1, 0, 4] },
  E5: { frets: [0, 2, 2, -1, -1, -1], fingers: [0, 1, 2, 0, 0, 0] },
  F: { frets: [1, 3, 3, 2, 1, 1], fingers: [1, 3, 4, 2, 1, 1] },
  Fmaj7: { frets: [-1, -1, 3, 2, 1, 0], fingers: [0, 0, 3, 2, 1, 0] },
  G: { frets: [3, 2, 0, 0, 0, 3], fingers: [2, 1, 0, 0, 0, 3] },
  G7: { frets: [3, 2, 0, 0, 0, 1], fingers: [3, 2, 0, 0, 0, 1] },
  Gmaj7: { frets: [3, 2, 0, 0, 0, 2], fingers: [3, 2, 0, 0, 0, 1] },
  Gsus4: { frets: [3, 3, 0, 0, 1, 3], fingers: [2, 3, 0, 0, 1, 4] },
  Gadd9: { frets: [3, 0, 0, 2, 0, 3], fingers: [2, 0, 0, 1, 0, 3] },
  G6: { frets: [3, 2, 0, 0, 0, 0], fingers: [2, 1, 0, 0, 0, 0] },
  G5: { frets: [3, 5, 5, -1, -1, -1], fingers: [1, 3, 4, 0, 0, 0] },
  A: { frets: [-1, 0, 2, 2, 2, 0], fingers: [0, 0, 1, 2, 3, 0] },
  Am: { frets: [-1, 0, 2, 2, 1, 0], fingers: [0, 0, 2, 3, 1, 0] },
  A7: { frets: [-1, 0, 2, 0, 2, 0], fingers: [0, 0, 2, 0, 3, 0] },
  Am7: { frets: [-1, 0, 2, 0, 1, 0], fingers: [0, 0, 2, 0, 1, 0] },
  Amaj7: { frets: [-1, 0, 2, 1, 2, 0], fingers: [0, 0, 2, 1, 3, 0] },
  Asus2: { frets: [-1, 0, 2, 2, 0, 0], fingers: [0, 0, 1, 2, 0, 0] },
  Asus4: { frets: [-1, 0, 2, 2, 3, 0], fingers: [0, 0, 1, 2, 3, 0] },
  Aadd9: { frets: [-1, 0, 2, 4, 2, 0], fingers: [0, 0, 1, 4, 2, 0] },
  A6: { frets: [-1, 0, 2, 2, 2, 2], fingers: [0, 0, 1, 1, 1, 1] },
  Am6: { frets: [-1, 0, 2, 2, 1, 2], fingers: [0, 0, 2, 3, 1, 4] },
  A5: { frets: [-1, 0, 2, 2, -1, -1], fingers: [0, 0, 1, 2, 0, 0] },
  B7: { frets: [-1, 2, 1, 2, 0, 2], fingers: [0, 2, 1, 3, 0, 4] },
  Bm: { frets: [-1, 2, 4, 4, 3, 2], fingers: [0, 1, 3, 4, 2, 1] },
  Bm7: { frets: [-1, 2, 0, 2, 0, 2], fingers: [0, 1, 0, 2, 0, 3] },
}

const SLASH: Partial<Record<string, Shape>> = {
  'G/B': { frets: [-1, 2, 0, 0, 0, 3], fingers: [0, 1, 0, 0, 0, 3] },
  'D/F#': { frets: [2, -1, 0, 2, 3, 2], fingers: [1, 0, 0, 2, 4, 3] },
  'C/G': { frets: [3, 3, 2, 0, 1, 0], fingers: [3, 4, 2, 0, 1, 0] },
  'C/B': { frets: [-1, 2, 2, 0, 1, 0], fingers: [0, 2, 3, 0, 1, 0] },
  'Am/G': { frets: [3, 0, 2, 2, 1, 0], fingers: [4, 0, 2, 3, 1, 0] },
  'D/A': { frets: [-1, 0, 0, 2, 3, 2], fingers: [0, 0, 0, 1, 3, 2] },
  'E/G#': { frets: [4, 2, 2, 1, 0, 0], fingers: [4, 2, 3, 1, 0, 0] },
}

// Offsets from the barre fret; -1 mutes the string.
const E_SHAPES: Partial<Record<Quality, Shape>> = {
  maj: { frets: [0, 2, 2, 1, 0, 0], fingers: [1, 3, 4, 2, 1, 1] },
  m: { frets: [0, 2, 2, 0, 0, 0], fingers: [1, 3, 4, 1, 1, 1] },
  '7': { frets: [0, 2, 0, 1, 0, 0], fingers: [1, 3, 1, 2, 1, 1] },
  m7: { frets: [0, 2, 0, 0, 0, 0], fingers: [1, 3, 1, 1, 1, 1] },
  maj7: { frets: [0, -1, 1, 1, 0, -1], fingers: [1, 0, 3, 4, 2, 0] },
  sus4: { frets: [0, 2, 2, 2, 0, 0], fingers: [1, 2, 3, 4, 1, 1] },
  '5': { frets: [0, 2, 2, -1, -1, -1], fingers: [1, 3, 4, 0, 0, 0] },
  m6: { frets: [0, 2, 2, 0, 2, 0], fingers: [1, 2, 3, 1, 4, 1] },
}

const A_SHAPES: Partial<Record<Quality, Shape>> = {
  maj: { frets: [-1, 0, 2, 2, 2, 0], fingers: [0, 1, 2, 3, 4, 1] },
  m: { frets: [-1, 0, 2, 2, 1, 0], fingers: [0, 1, 3, 4, 2, 1] },
  '7': { frets: [-1, 0, 2, 0, 2, 0], fingers: [0, 1, 3, 1, 4, 1] },
  m7: { frets: [-1, 0, 2, 0, 1, 0], fingers: [0, 1, 3, 1, 2, 1] },
  maj7: { frets: [-1, 0, 2, 1, 2, 0], fingers: [0, 1, 3, 2, 4, 1] },
  sus2: { frets: [-1, 0, 2, 2, 0, 0], fingers: [0, 1, 3, 4, 1, 1] },
  sus4: { frets: [-1, 0, 2, 2, 3, 0], fingers: [0, 1, 2, 3, 4, 1] },
  add9: { frets: [-1, 0, 2, 4, 0, -1], fingers: [0, 1, 2, 4, 1, 0] },
  dim: { frets: [-1, 0, 1, 2, 1, -1], fingers: [0, 1, 2, 4, 3, 0] },
  m7b5: { frets: [-1, 0, 1, 0, 1, -1], fingers: [0, 1, 2, 1, 3, 0] },
  '6': { frets: [-1, 0, 2, 2, 2, 2], fingers: [0, 1, 3, 3, 3, 3] },
  '5': { frets: [-1, 0, 2, 2, -1, -1], fingers: [0, 1, 3, 4, 0, 0] },
}

const E_ROOT = 4
const A_ROOT = 9

function keyOf(pitch: number, quality: Quality) {
  return `${mod12(pitch)}:${quality}`
}

const OPEN_BY_PITCH = new Map<string, Shape>()
for (const [symbol, shape] of Object.entries(OPEN)) {
  const parsed = parseChord(symbol)
  const quality = parsed ? normalizeQuality(parsed.quality) : null
  if (parsed && quality) OPEN_BY_PITCH.set(keyOf(parsed.pitch, quality), shape)
}

function finish(shape: Shape): ChordDiagram {
  const played = shape.frets.filter((fret) => fret > 0)
  const ones = shape.fingers
    .map((finger, index) => (finger === 1 ? index : -1))
    .filter((index) => index >= 0)
  let barre: Barre | undefined
  if (ones.length >= 2) {
    const from = Math.min(...ones)
    const to = Math.max(...ones)
    const fret = shape.frets[from] ?? 0
    const sameFret = ones.every((index) => shape.frets[index] === fret)
    const coversOpen = shape.frets
      .slice(from, to + 1)
      .some((value) => value === 0)
    if (fret > 0 && sameFret && !coversOpen) barre = { fret, from, to }
  }
  const max = played.length > 0 ? Math.max(...played) : 0
  const min = played.length > 0 ? Math.min(...played) : 1
  const hasOpen = shape.frets.includes(0)
  const baseFret =
    barre && barre.fret > 1 && !hasOpen
      ? barre.fret
      : max > 4
        ? Math.max(1, min)
        : 1
  return {
    frets: shape.frets,
    fingers: shape.fingers,
    barre,
    baseFret,
  }
}

function movable(template: Shape, barreFret: number): Shape {
  return {
    frets: template.frets.map((offset) =>
      offset < 0 ? -1 : offset + barreFret,
    ),
    fingers: template.fingers,
  }
}

function fretFor(pitch: number, root: number) {
  const fret = mod12(pitch - root)
  return fret === 0 ? 12 : fret
}

export function lookupChordDiagram(
  symbol: string,
  notation: Notation = 'en',
): ChordDiagram | null {
  const trimmed = symbol.trim()
  const slash = SLASH[trimmed]
  if (slash) return finish(slash)
  const parsed = parseChord(trimmed, notation)
  if (!parsed) return null
  const quality = normalizeQuality(parsed.quality)
  if (!quality) return null
  const open = OPEN_BY_PITCH.get(keyOf(parsed.pitch, quality))
  if (open) return finish(open)

  const candidates: Array<{ shape: Shape; fret: number }> = []
  const eShape = E_SHAPES[quality]
  if (eShape)
    candidates.push({ shape: eShape, fret: fretFor(parsed.pitch, E_ROOT) })
  const aShape = A_SHAPES[quality]
  if (aShape)
    candidates.push({ shape: aShape, fret: fretFor(parsed.pitch, A_ROOT) })
  if (candidates.length === 0) return null
  candidates.sort((a, b) => a.fret - b.fret)
  const best = candidates.at(0)
  if (!best) return null
  return finish(movable(best.shape, best.fret))
}

export function diagramFromFrets(frets: Array<number>): ChordDiagram {
  return finish({ frets, fingers: frets.map(() => 0) })
}

export const STANDARD_TUNING = ['E2', 'A2', 'D3', 'G3', 'B3', 'E4'] as const

export const TUNING_PRESETS: Array<{
  id: string
  tuning: Array<string>
}> = [
  { id: 'standard', tuning: ['E2', 'A2', 'D3', 'G3', 'B3', 'E4'] },
  { id: 'dropD', tuning: ['D2', 'A2', 'D3', 'G3', 'B3', 'E4'] },
  { id: 'halfDown', tuning: ['D#2', 'G#2', 'C#3', 'F#3', 'A#3', 'D#4'] },
  { id: 'dadgad', tuning: ['D2', 'A2', 'D3', 'G3', 'A3', 'D4'] },
  { id: 'openG', tuning: ['D2', 'G2', 'D3', 'G3', 'B3', 'D4'] },
]

export function stringLabels(tuning: Array<string>, count: number) {
  const names = (tuning.length > 0 ? tuning : [...STANDARD_TUNING]).map(
    (note) => note.replace(/\d+$/, ''),
  )
  const top = [...names].reverse()
  if (top[0]) top[0] = top[0].toLowerCase()
  return Array.from({ length: count }, (_, index) => top[index] ?? '')
}
