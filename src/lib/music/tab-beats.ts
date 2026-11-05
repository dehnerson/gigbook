import { mod12, parsePitchToken, spellPitch } from './pitch.ts'
import type { Notation } from './pitch.ts'
import { MAX_FRET } from './tab.ts'

export type BeatTechnique = 'h' | 'p' | 'b' | '/' | '\\' | '~'

export type BeatNote = {
  s: number
  f: number
  t?: BeatTechnique
  bend?: number
}

export type Duration = 1 | 2 | 4 | 8 | 16 | 32

export type TabBeat = {
  d: Duration
  dot?: true
  rest?: true
  chord?: string
  notes: Array<BeatNote>
}

export type BeatMeasure = {
  beats: Array<TabBeat>
  repeat?: { start?: true; times?: number }
  ending?: number
}

export type ShiftedNote = BeatNote & { unplayable?: boolean }
export type ShiftedBeat = Omit<TabBeat, 'notes'> & { notes: Array<ShiftedNote> }
export type ShiftedMeasure = Omit<BeatMeasure, 'beats'> & {
  beats: Array<ShiftedBeat>
}

export function beatLength(beat: Pick<TabBeat, 'd' | 'dot'>) {
  return (1 / beat.d) * (beat.dot ? 1.5 : 1)
}

export function measureCapacity(timeSignature: string) {
  const [top, bottom] = timeSignature.split('/').map(Number)
  if (!top || !bottom) return 1
  return top / bottom
}

export function measureFill(measure: BeatMeasure, timeSignature: string) {
  const used = measure.beats.reduce((sum, beat) => sum + beatLength(beat), 0)
  const capacity = measureCapacity(timeSignature)
  if (Math.abs(used - capacity) < 1e-6) return 'full'
  return used < capacity ? 'short' : 'long'
}

function midiOf(note: string) {
  const match = note.match(/^([A-Ga-g][#b]?)(-?\d+)$/)
  if (!match) return null
  const pitch = parsePitchToken(match[1], 'en')
  if (!pitch) return null
  return (Number(match[2]) + 1) * 12 + pitch.pitch
}

export function notePitch(tuning: Array<string>, string: number, fret: number) {
  const open = tuning[tuning.length - string]
  const midi = open ? midiOf(open) : null
  return midi === null ? null : midi + fret
}

export function noteName(
  tuning: Array<string>,
  note: Pick<BeatNote, 's' | 'f'>,
  notation: Notation,
) {
  const pitch = notePitch(tuning, note.s, note.f)
  if (pitch === null) return ''
  return spellPitch(mod12(pitch), 'sharp', notation)
}

export function shiftBeatMeasures(
  measures: Array<BeatMeasure>,
  semitones: number,
): Array<ShiftedMeasure> {
  return measures.map((measure) => ({
    ...measure,
    beats: measure.beats.map((beat) => ({
      ...beat,
      notes: beat.notes.map((note) => {
        const fret = note.f + semitones
        const unplayable = fret < 0 || fret > MAX_FRET
        return { ...note, f: unplayable ? note.f : fret, unplayable }
      }),
    })),
  }))
}

function texNote(note: BeatNote) {
  const effects: Array<string> = []
  if (note.t === 'h' || note.t === 'p') effects.push('h')
  if (note.t === '/' || note.t === '\\') effects.push('sl')
  if (note.t === '~') effects.push('v')
  if (note.t === 'b') effects.push(`b (0 ${(note.bend ?? 2) * 2})`)
  const props = effects.length > 0 ? `{${effects.join(' ')}}` : ''
  return `${note.f}.${note.s}${props}`
}

function texString(value: string) {
  return `"${value.replaceAll('\\', '\\\\').replaceAll('"', '\\"')}"`
}

export function toAlphaTex(
  measures: Array<BeatMeasure>,
  options: {
    tuning: Array<string>
    timeSignature: string
    tempo?: number
    score?: boolean
    chordLabel?: (symbol: string) => string
  },
) {
  const [top = '4', bottom = '4'] = options.timeSignature.split('/')
  const tuning = [...options.tuning].reverse().join(' ')
  const head = [
    options.tempo ? `\\tempo ${options.tempo}` : '',
    '\\track "Guitar" { instrument 25 }',
    `\\staff {${options.score ? 'score tabs' : 'tabs'}}`,
    `\\tuning (${tuning})`,
    `\\ts (${top} ${bottom})`,
  ]
  const bars = measures.map((measure) => {
    const meta: Array<string> = []
    if (measure.repeat?.start) meta.push('\\ro')
    if (measure.ending) meta.push(`\\ae (${measure.ending})`)
    if (measure.repeat?.times) meta.push(`\\rc ${measure.repeat.times}`)
    const beats = measure.beats.map((beat) => {
      const props: Array<string> = []
      if (beat.dot) props.push('d')
      if (beat.chord) {
        const label = options.chordLabel?.(beat.chord) ?? beat.chord
        props.push(`ch ${texString(label)}`)
      }
      const suffix = props.length > 0 ? `{${props.join(' ')}}` : ''
      const body =
        beat.rest || beat.notes.length === 0
          ? 'r'
          : `(${beat.notes.map(texNote).join(' ')})`
      return `${body}.${beat.d}${suffix}`
    })
    return [...meta, ...beats].join(' ')
  })
  return `${head.filter(Boolean).join('\n')}\n${bars.join(' |\n')}`
}
