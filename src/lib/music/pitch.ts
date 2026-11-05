export type Notation = 'en' | 'de'
export type Accidental = 'sharp' | 'flat'

const SHARP = [
  'C',
  'C#',
  'D',
  'D#',
  'E',
  'F',
  'F#',
  'G',
  'G#',
  'A',
  'A#',
  'B',
] as const
const FLAT = [
  'C',
  'Db',
  'D',
  'Eb',
  'E',
  'F',
  'Gb',
  'G',
  'Ab',
  'A',
  'Bb',
  'B',
] as const

const LETTER: Partial<Record<string, number>> = {
  C: 0,
  D: 2,
  E: 4,
  F: 5,
  G: 7,
  A: 9,
  B: 11,
}

export function mod12(value: number) {
  return ((value % 12) + 12) % 12
}

export function spellPitch(
  pitch: number,
  accidental: Accidental,
  notation: Notation,
) {
  const index = mod12(pitch)
  const name = accidental === 'flat' ? FLAT[index] : SHARP[index]
  if (notation === 'en') return name
  if (name === 'B') return 'H'
  if (name === 'A#') return 'B'
  if (name === 'Bb') return 'B'
  return name
}

export function parsePitchToken(
  token: string,
  notation: Notation,
): { pitch: number; accidental: Accidental; length: number } | null {
  if (!token) return null
  const head = token[0]?.toUpperCase()
  if (!head) return null

  if (notation === 'de' && head === 'H') {
    const accidental =
      token[1] === '#' ? 'sharp' : token[1] === 'b' ? 'flat' : 'sharp'
    const extra = token[1] === '#' || token[1] === 'b' ? 1 : 0
    const pitch = mod12(11 + (token[1] === '#' ? 1 : token[1] === 'b' ? -1 : 0))
    return { pitch, accidental, length: 1 + extra }
  }

  if (
    notation === 'de' &&
    head === 'B' &&
    token[1] !== '#' &&
    token[1] !== 'b'
  ) {
    return { pitch: 10, accidental: 'flat', length: 1 }
  }

  const base = LETTER[head]
  if (base === undefined) return null
  if (token[1] === '#')
    return { pitch: mod12(base + 1), accidental: 'sharp', length: 2 }
  if (token[1] === 'b')
    return { pitch: mod12(base - 1), accidental: 'flat', length: 2 }
  return { pitch: base, accidental: 'sharp', length: 1 }
}
