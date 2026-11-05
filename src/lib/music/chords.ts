import { mod12, parsePitchToken, spellPitch } from './pitch.ts'
import type { Accidental, Notation } from './pitch.ts'

export type ParsedChord = {
  pitch: number
  accidental: Accidental
  quality: string
  bassPitch?: number
  bassAccidental?: Accidental
}

const CHORD_START = /^[A-GH]/i

export function parseChord(
  symbol: string,
  notation: Notation = 'en',
): ParsedChord | null {
  const trimmed = symbol.trim()
  if (!CHORD_START.test(trimmed)) return null
  const [head, bassRaw] = trimmed.split('/')
  if (!head) return null
  const root = parsePitchToken(head, notation)
  if (!root) return null
  const quality = head.slice(root.length)
  if (quality && !/^[a-zA-Z0-9#()+-]*$/.test(quality)) return null
  let bassPitch: number | undefined
  let bassAccidental: Accidental | undefined
  if (bassRaw) {
    const bass = parsePitchToken(bassRaw, notation)
    if (!bass || bass.length !== bassRaw.length) return null
    bassPitch = bass.pitch
    bassAccidental = bass.accidental
  }
  return {
    pitch: root.pitch,
    accidental: root.accidental,
    quality,
    bassPitch,
    bassAccidental,
  }
}

export function formatChord(
  chord: ParsedChord,
  semitones: number,
  notation: Notation,
) {
  const root = spellPitch(
    mod12(chord.pitch + semitones),
    chord.accidental,
    notation,
  )
  const bass =
    chord.bassPitch === undefined
      ? ''
      : `/${spellPitch(mod12(chord.bassPitch + semitones), chord.bassAccidental ?? chord.accidental, notation)}`
  return `${root}${chord.quality}${bass}`
}

export function transposeSymbol(
  symbol: string,
  semitones: number,
  from: Notation = 'en',
  to: Notation = from,
) {
  const parsed = parseChord(symbol, from)
  if (!parsed) return symbol
  return formatChord(parsed, semitones, to)
}

export function displayChord(
  concertSymbol: string,
  capo: number,
  transpose: number,
  notation: Notation = 'en',
) {
  return transposeSymbol(concertSymbol, transpose - capo, 'en', notation)
}

export function soundsAs(
  concertKey: string,
  transpose: number,
  notation: Notation = 'en',
) {
  return transposeSymbol(concertKey, transpose, 'en', notation)
}
