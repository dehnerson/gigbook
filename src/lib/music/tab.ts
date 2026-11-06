import { isChordLine, isChordToken } from './chordpro.ts'
import { mod12, parsePitchToken, spellPitch } from './pitch.ts'
import type { Notation } from './pitch.ts'

export const MAX_FRET = 22

export type TabTechnique = 'h' | 'p' | 'b' | '/' | '\\' | '~'

export type TabNote = {
  s: number
  f: number
  t?: TabTechnique
  bend?: number
}

export type Duration = 1 | 2 | 4 | 8 | 16 | 32

export type TabBeat = {
  d: Duration
  dot?: true
  rest?: true
  chord?: string
  notes: Array<TabNote>
}

export type TabMeasure = {
  beats: Array<TabBeat>
  repeat?: { start?: true; times?: number }
  ending?: number
}

export type LegacyTabMeasure = {
  chordAbove?: string
  events: Array<{
    position: number
    notes: Array<{
      string: number
      fret: number
      technique?: 'h' | 'p' | 'b' | '/'
      bendSemitones?: number
    }>
  }>
}

export type ShiftedNote = TabNote & { unplayable?: boolean }
export type ShiftedBeat = Omit<TabBeat, 'notes'> & { notes: Array<ShiftedNote> }
export type ShiftedMeasure = Omit<TabMeasure, 'beats'> & {
  beats: Array<ShiftedBeat>
}

const DURATIONS: Array<Duration> = [1, 2, 4, 8, 16, 32]

const LENGTHS = DURATIONS.flatMap((d) => [
  { d, dot: false, length: 1 / d },
  ...(d < 32 ? [{ d, dot: true, length: 1.5 / d }] : []),
])

export function beatLength(beat: Pick<TabBeat, 'd' | 'dot'>) {
  return (1 / beat.d) * (beat.dot ? 1.5 : 1)
}

export function measureCapacity(timeSignature: string) {
  const [top, bottom] = timeSignature.split('/').map(Number)
  if (!top || !bottom) return 1
  return top / bottom
}

export function measureFill(measure: TabMeasure, timeSignature: string) {
  const used = measure.beats.reduce((sum, beat) => sum + beatLength(beat), 0)
  const capacity = measureCapacity(timeSignature)
  if (Math.abs(used - capacity) < 1e-6) return 'full'
  return used < capacity ? 'short' : 'long'
}

function nearestLength(length: number) {
  let best = LENGTHS[0] ?? { d: 4, dot: false, length: 0.25 }
  for (const option of LENGTHS)
    if (Math.abs(option.length - length) < Math.abs(best.length - length))
      best = option
  return { d: best.d, ...(best.dot ? { dot: true as const } : {}) }
}

function isLegacy(
  measure: TabMeasure | LegacyTabMeasure,
): measure is LegacyTabMeasure {
  return 'events' in measure
}

export function fromLegacyMeasure(measure: LegacyTabMeasure): TabMeasure {
  const beats: Array<TabBeat> = measure.events.map((event) => ({
    d: 8,
    notes: event.notes.map((note) => ({
      s: note.string,
      f: note.fret,
      ...(note.technique ? { t: note.technique } : {}),
      ...(note.bendSemitones !== undefined ? { bend: note.bendSemitones } : {}),
    })),
  }))
  const first = beats.at(0)
  if (measure.chordAbove) {
    if (first) first.chord = measure.chordAbove
    else beats.push({ d: 1, rest: true, chord: measure.chordAbove, notes: [] })
  }
  return { beats }
}

export function toTabMeasures(
  measures: ReadonlyArray<TabMeasure | LegacyTabMeasure> | undefined,
): Array<TabMeasure> {
  return (measures ?? []).map((measure) =>
    isLegacy(measure) ? fromLegacyMeasure(measure) : measure,
  )
}

export function hasLegacyMeasures(
  measures: ReadonlyArray<TabMeasure | LegacyTabMeasure> | undefined,
) {
  return (measures ?? []).some(isLegacy)
}

export function cleanTabMeasures(
  measures: Array<TabMeasure>,
): Array<TabMeasure> {
  return measures.map((measure) => ({
    beats: measure.beats.map((beat) => ({
      d: beat.d,
      ...(beat.dot ? { dot: true as const } : {}),
      ...(beat.rest ? { rest: true as const } : {}),
      ...(beat.chord ? { chord: beat.chord } : {}),
      notes: beat.rest
        ? []
        : beat.notes.map((note) => ({
            s: note.s,
            f: note.f,
            ...(note.t ? { t: note.t } : {}),
            ...(note.bend !== undefined ? { bend: note.bend } : {}),
          })),
    })),
    ...(measure.repeat
      ? {
          repeat: {
            ...(measure.repeat.start ? { start: true as const } : {}),
            ...(measure.repeat.times ? { times: measure.repeat.times } : {}),
          },
        }
      : {}),
    ...(measure.ending ? { ending: measure.ending } : {}),
  }))
}

export function tabChords(measures: Array<TabMeasure>) {
  return measures.flatMap((measure) =>
    measure.beats.flatMap((beat) => (beat.chord ? [beat.chord] : [])),
  )
}

export function mapTabChords(
  measures: Array<TabMeasure>,
  map: (symbol: string) => string,
): Array<TabMeasure> {
  return measures.map((measure) => ({
    ...measure,
    beats: measure.beats.map((beat) =>
      beat.chord ? { ...beat, chord: map(beat.chord) } : beat,
    ),
  }))
}

const ASCII_TECHNIQUES = new Set<string>(['h', 'p', 'b', '/', '\\', '~'])

const STRING_LINE = /^\s*[A-Ga-g][#b]?\s*\|/

function chordsByColumn(header: string | undefined, offset: number) {
  if (!header || !isChordLine(header)) return []
  return [...header.matchAll(/\S+/g)]
    .filter((match) => isChordToken(match[0]))
    .map((match) => ({ symbol: match[0], column: match.index - offset }))
}

function guessRhythm(columns: Array<number>, end: number, capacity: number) {
  const gaps = columns.map(
    (column, index) => (columns[index + 1] ?? end) - column,
  )
  const even = Math.max(...gaps) - Math.min(...gaps) <= 1
  if (even) {
    const each = nearestLength(capacity / columns.length)
    return columns.map(() => each)
  }
  const total = end - (columns[0] ?? 0)
  return gaps.map((gap) => nearestLength((gap / total) * capacity))
}

type PendingBeat = { column: number; notes: Array<TabNote> }

function parseBlock(
  stringLines: Array<string>,
  header: string | undefined,
  capacity: number,
) {
  const offset = (stringLines[0] ?? '').indexOf('|') + 1
  const bodies = stringLines.map((line) => line.slice(line.indexOf('|') + 1))
  const width = Math.max(...bodies.map((body) => body.length))
  const padded = bodies.map((body) => body.padEnd(width, '-'))
  const chords = chordsByColumn(header, offset)

  const measures: Array<TabMeasure> = []
  let pending: Array<PendingBeat> = []
  let column = 0
  let measureStart = 0

  const close = (end: number) => {
    const here = chords.filter(
      (item) => item.column >= measureStart - 1 && item.column < end,
    )
    if (pending.length === 0) {
      const chord = here.at(0)
      if (chord)
        measures.push({
          beats: [
            {
              ...nearestLength(capacity),
              rest: true,
              chord: chord.symbol,
              notes: [],
            },
          ],
        })
    } else {
      const rhythm = guessRhythm(
        pending.map((beat) => beat.column),
        end,
        capacity,
      )
      const beats: Array<TabBeat> = pending.map((beat, index) => ({
        ...(rhythm[index] ?? { d: 8 }),
        notes: beat.notes,
      }))
      for (const chord of here) {
        let target = pending.findIndex(
          (beat) => beat.column >= chord.column - 1,
        )
        if (target === -1) target = pending.length - 1
        const beat = beats.at(target)
        if (beat && !beat.chord) beat.chord = chord.symbol
      }
      measures.push({ beats })
    }
    pending = []
  }

  while (column < width) {
    if (padded.every((body) => body[column] === '|')) {
      close(column)
      column += 1
      measureStart = column
      continue
    }

    const notes: Array<TabNote> = []
    let consumed = 1
    padded.forEach((body, index) => {
      const char = body[column]
      if (!char || !/\d/.test(char)) return
      const next = body.charAt(column + 1)
      const twoDigit = /\d/.test(next)
      const fret = Number(twoDigit ? `${char}${next}` : char)
      const after = body.charAt(column + (twoDigit ? 2 : 1))
      notes.push({
        s: index + 1,
        f: fret,
        ...(ASCII_TECHNIQUES.has(after) ? { t: after as TabTechnique } : {}),
      })
      consumed = Math.max(consumed, twoDigit ? 2 : 1)
    })

    if (notes.length > 0) pending.push({ column, notes })
    column += consumed
  }

  close(width)
  return measures
}

export function parseAsciiTab(
  source: string,
  timeSignature = '4/4',
): Array<TabMeasure> {
  const capacity = measureCapacity(timeSignature)
  const lines = source.split(/\r?\n/)
  const measures: Array<TabMeasure> = []
  let index = 0
  let previousEnd = 0
  while (index < lines.length) {
    if (!STRING_LINE.test(lines[index] ?? '')) {
      index += 1
      continue
    }
    const start = index
    while (index < lines.length && STRING_LINE.test(lines[index] ?? ''))
      index += 1
    let header: string | undefined
    for (let above = start - 1; above >= previousEnd; above -= 1) {
      const line = lines[above]
      if (line.trim()) {
        header = line
        break
      }
    }
    measures.push(...parseBlock(lines.slice(start, index), header, capacity))
    previousEnd = index
  }
  return measures
}

export function keepRhythm(
  next: Array<TabMeasure>,
  previous: Array<TabMeasure>,
): Array<TabMeasure> {
  return next.map((measure, index) => {
    const before = previous.at(index)
    if (!before || before.beats.length !== measure.beats.length) return measure
    return {
      ...before,
      beats: measure.beats.map((beat, beatIndex) => {
        const old = before.beats.at(beatIndex)
        if (!old) return beat
        const { dot: _dot, ...rest } = beat
        return { ...rest, d: old.d, ...(old.dot ? { dot: true as const } : {}) }
      }),
    }
  })
}

const COLUMNS_PER_WHOLE = 16

function noteLabel(note: TabNote) {
  return `${note.f}${note.t ?? ''}`
}

export function serializeAsciiTab(
  measures: Array<TabMeasure>,
  labels: Array<string>,
  measuresPerLine = 4,
) {
  const width = Math.max(1, ...labels.map((label) => label.length))
  const prefix = (label: string) => `${label.padEnd(width)}|`
  if (measures.length === 0) {
    return labels
      .map((label) => `${prefix(label)}${'-'.repeat(16)}|`)
      .join('\n')
  }
  const blocks: Array<string> = []
  for (let start = 0; start < measures.length; start += measuresPerLine) {
    const group = measures.slice(start, start + measuresPerLine)
    const rows = labels.map(prefix)
    let header = ''
    for (const measure of group) {
      rows.forEach((_, row) => (rows[row] += '-'))
      for (const beat of measure.beats) {
        const column = (rows[0] ?? '').length
        if (beat.chord) header = `${header.padEnd(column)}${beat.chord} `
        const cell = Math.max(
          Math.round(beatLength(beat) * COLUMNS_PER_WHOLE),
          ...beat.notes.map((note) => noteLabel(note).length + 1),
          2,
        )
        rows.forEach((_, row) => {
          const note = beat.rest
            ? undefined
            : beat.notes.find((item) => item.s === row + 1)
          rows[row] += (note ? noteLabel(note) : '').padEnd(cell, '-')
        })
      }
      rows.forEach((_, row) => (rows[row] += '|'))
    }
    blocks.push([header.trimEnd(), ...rows].filter(Boolean).join('\n'))
  }
  return blocks.join('\n\n')
}

export function previewTabShift(
  measures: Array<TabMeasure>,
  semitones: number,
): { applied: boolean; measures: Array<ShiftedMeasure> } {
  const outOfRange = (fret: number) =>
    fret + semitones < 0 || fret + semitones > MAX_FRET
  const blocked = measures.some((measure) =>
    measure.beats.some((beat) => beat.notes.some((note) => outOfRange(note.f))),
  )
  const applied = !blocked && semitones !== 0
  return {
    applied,
    measures: measures.map((measure) => ({
      ...measure,
      beats: measure.beats.map((beat) => ({
        ...beat,
        notes: beat.notes.map((note) => ({
          ...note,
          f: applied ? note.f + semitones : note.f,
          unplayable: !applied && outOfRange(note.f),
        })),
      })),
    })),
  }
}

function midiOf(note: string) {
  const match = note.match(/^([A-Ga-g][#b]?)(-?\d+)$/)
  if (!match?.[1]) return null
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
  note: Pick<TabNote, 's' | 'f'>,
  notation: Notation,
) {
  const pitch = notePitch(tuning, note.s, note.f)
  if (pitch === null) return ''
  return spellPitch(mod12(pitch), 'sharp', notation)
}

function texNote(note: TabNote) {
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
  measures: Array<TabMeasure>,
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
    return [...meta, ...(beats.length > 0 ? beats : ['r.1'])].join(' ')
  })
  return `${head.filter(Boolean).join('\n')}\n${bars.join(' |\n')}`
}
