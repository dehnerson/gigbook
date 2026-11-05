import { displayChord } from './chords.ts'
import type { Notation } from './pitch.ts'

const MAJOR = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'F#', 'G', 'Ab', 'A', 'Bb', 'B']
const MINOR = [
  'Am',
  'Bbm',
  'Bm',
  'Cm',
  'C#m',
  'Dm',
  'Ebm',
  'Em',
  'Fm',
  'F#m',
  'Gm',
  'G#m',
]

export const TIME_SIGNATURES = [
  '4/4',
  '3/4',
  '6/8',
  '2/4',
  '12/8',
  '5/4',
  '7/8',
]

export function keyOptions(notation: Notation, current?: string) {
  const ids = [...MAJOR, ...MINOR]
  if (current && !ids.includes(current)) ids.unshift(current)
  return ids.map((id) => ({
    id,
    label: displayChord(id, 0, 0, notation),
  }))
}
