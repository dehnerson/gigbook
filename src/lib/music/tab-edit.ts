import { DURATIONS, MAX_FRET } from './tab.ts'
import type {
  Duration,
  TabBeat,
  TabMeasure,
  TabNote,
  TabTechnique,
} from './tab.ts'

export type TabCursor = { bar: number; beat: number; string: number }

export type TabEdit = { measures: Array<TabMeasure>; cursor: TabCursor }

export const DEFAULT_BEND = 2

export function emptyBeat(d: Duration = 4): TabBeat {
  return { d, notes: [] }
}

export function emptyBar(timeSignature: string): TabMeasure {
  const [top, bottom] = timeSignature.split('/').map(Number)
  const d = DURATIONS.find((value) => value === bottom) ?? 4
  const count = top && top > 0 && top <= 32 ? top : 4
  return { beats: Array.from({ length: count }, () => emptyBeat(d)) }
}

export function beatAt(
  measures: Array<TabMeasure>,
  cursor: TabCursor,
): TabBeat | undefined {
  return measures[cursor.bar]?.beats[cursor.beat]
}

export function noteAt(measures: Array<TabMeasure>, cursor: TabCursor) {
  return beatAt(measures, cursor)?.notes.find(
    (note) => note.s === cursor.string,
  )
}

export function clampCursor(
  measures: Array<TabMeasure>,
  cursor: TabCursor,
  strings: number,
): TabCursor {
  const bar = Math.min(
    Math.max(cursor.bar, 0),
    Math.max(measures.length - 1, 0),
  )
  const beats = measures[bar]?.beats.length ?? 1
  return {
    bar,
    beat: Math.min(Math.max(cursor.beat, 0), Math.max(beats - 1, 0)),
    string: Math.min(Math.max(cursor.string, 1), strings),
  }
}

function mapBeat(
  measures: Array<TabMeasure>,
  cursor: TabCursor,
  update: (beat: TabBeat) => TabBeat,
) {
  return measures.map((measure, bar) =>
    bar === cursor.bar
      ? {
          ...measure,
          beats: measure.beats.map((beat, index) =>
            index === cursor.beat ? update(beat) : beat,
          ),
        }
      : measure,
  )
}

function spliced<T>(
  items: Array<T>,
  at: number,
  remove: number,
  ...add: Array<T>
) {
  const copy = [...items]
  copy.splice(at, remove, ...add)
  return copy
}

function withNotes(beat: TabBeat, notes: Array<TabNote>): TabBeat {
  const { rest: _rest, ...rest } = beat
  return { ...rest, notes: [...notes].sort((a, b) => a.s - b.s) }
}

export function setFret(
  measures: Array<TabMeasure>,
  cursor: TabCursor,
  fret: number,
) {
  const f = Math.min(Math.max(Math.round(fret), 0), MAX_FRET)
  return mapBeat(measures, cursor, (beat) => {
    const existing = beat.notes.find((note) => note.s === cursor.string)
    const others = beat.notes.filter((note) => note.s !== cursor.string)
    return withNotes(beat, [...others, { ...existing, s: cursor.string, f }])
  })
}

export function clearNote(measures: Array<TabMeasure>, cursor: TabCursor) {
  return mapBeat(measures, cursor, (beat) => ({
    ...beat,
    notes: beat.notes.filter((note) => note.s !== cursor.string),
  }))
}

export function setDuration(
  measures: Array<TabMeasure>,
  cursor: TabCursor,
  d: Duration,
) {
  return mapBeat(measures, cursor, (beat) => {
    const { dot, ...rest } = beat
    return d === 32 ? { ...rest, d } : { ...rest, d, ...(dot ? { dot } : {}) }
  })
}

export function toggleDot(measures: Array<TabMeasure>, cursor: TabCursor) {
  return mapBeat(measures, cursor, (beat) => {
    const { dot, ...rest } = beat
    return dot || beat.d === 32 ? rest : { ...rest, dot: true }
  })
}

export function toggleRest(measures: Array<TabMeasure>, cursor: TabCursor) {
  return mapBeat(measures, cursor, (beat) => {
    const { rest, ...others } = beat
    return rest ? others : { ...others, rest: true, notes: [] }
  })
}

export function toggleTechnique(
  measures: Array<TabMeasure>,
  cursor: TabCursor,
  technique: TabTechnique,
) {
  return mapBeat(measures, cursor, (beat) => {
    const note = beat.notes.find((item) => item.s === cursor.string)
    if (!note) return beat
    const { t, bend: _bend, ...plain } = note
    const next: TabNote =
      t === technique
        ? plain
        : technique === 'b'
          ? { ...plain, t: 'b', bend: DEFAULT_BEND }
          : { ...plain, t: technique }
    return withNotes(beat, [
      ...beat.notes.filter((item) => item.s !== cursor.string),
      next,
    ])
  })
}

export function setBend(
  measures: Array<TabMeasure>,
  cursor: TabCursor,
  bend: number,
) {
  return mapBeat(measures, cursor, (beat) => ({
    ...beat,
    notes: beat.notes.map((note) =>
      note.s === cursor.string && note.t === 'b' ? { ...note, bend } : note,
    ),
  }))
}

export function setChord(
  measures: Array<TabMeasure>,
  cursor: TabCursor,
  chord: string,
) {
  const symbol = chord.trim()
  return mapBeat(measures, cursor, (beat) => {
    const { chord: _chord, ...rest } = beat
    return symbol ? { ...rest, chord: symbol } : rest
  })
}

/** `frets` runs from the lowest string to the highest, -1 for muted. */
export function placeShape(
  measures: Array<TabMeasure>,
  cursor: TabCursor,
  frets: Array<number>,
  symbol: string,
) {
  const notes = frets.flatMap((f, index) =>
    f >= 0 && f <= MAX_FRET ? [{ s: frets.length - index, f }] : [],
  )
  return mapBeat(measures, cursor, (beat) => ({
    ...withNotes(beat, notes),
    ...(symbol.trim() ? { chord: symbol.trim() } : {}),
  }))
}

function mapBar(
  measures: Array<TabMeasure>,
  bar: number,
  update: (measure: TabMeasure) => TabMeasure,
) {
  return measures.map((measure, index) =>
    index === bar ? update(measure) : measure,
  )
}

function withRepeat(
  measure: TabMeasure,
  repeat: TabMeasure['repeat'],
): TabMeasure {
  const { repeat: _repeat, ...rest } = measure
  return repeat?.start || repeat?.times ? { ...rest, repeat } : rest
}

export function toggleRepeatStart(measures: Array<TabMeasure>, bar: number) {
  return mapBar(measures, bar, (measure) => {
    const { start, ...repeat } = measure.repeat ?? {}
    return withRepeat(measure, start ? repeat : { ...repeat, start: true })
  })
}

/** `times` is how often the passage is played in total; below 2 removes the end. */
export function setRepeatEnd(
  measures: Array<TabMeasure>,
  bar: number,
  times: number,
) {
  return mapBar(measures, bar, (measure) => {
    const { times: _times, ...repeat } = measure.repeat ?? {}
    return withRepeat(
      measure,
      times >= 2 ? { ...repeat, times: Math.round(times) } : repeat,
    )
  })
}

export function setEnding(
  measures: Array<TabMeasure>,
  bar: number,
  ending: number,
) {
  return mapBar(measures, bar, (measure) => {
    const { ending: _ending, ...rest } = measure
    return ending > 0 ? { ...rest, ending } : rest
  })
}

export function insertBeat(
  measures: Array<TabMeasure>,
  cursor: TabCursor,
): TabEdit {
  const current = beatAt(measures, cursor)
  const beat = emptyBeat(current?.d)
  if (current?.dot) beat.dot = true
  const next = measures.map((measure, bar) =>
    bar === cursor.bar
      ? { ...measure, beats: spliced(measure.beats, cursor.beat + 1, 0, beat) }
      : measure,
  )
  return { measures: next, cursor: { ...cursor, beat: cursor.beat + 1 } }
}

export function deleteBeat(
  measures: Array<TabMeasure>,
  cursor: TabCursor,
  timeSignature: string,
): TabEdit {
  const measure = measures.at(cursor.bar)
  if (!measure) return { measures, cursor }
  if (measure.beats.length <= 1)
    return deleteBar(measures, cursor, timeSignature)
  const next = measures.map((item, bar) =>
    bar === cursor.bar
      ? { ...item, beats: spliced(item.beats, cursor.beat, 1) }
      : item,
  )
  return {
    measures: next,
    cursor: {
      ...cursor,
      beat: Math.min(cursor.beat, measure.beats.length - 2),
    },
  }
}

export function insertBar(
  measures: Array<TabMeasure>,
  cursor: TabCursor,
  timeSignature: string,
): TabEdit {
  const at = measures.length === 0 ? 0 : cursor.bar + 1
  return {
    measures: spliced(measures, at, 0, emptyBar(timeSignature)),
    cursor: { ...cursor, bar: at, beat: 0 },
  }
}

export function deleteBar(
  measures: Array<TabMeasure>,
  cursor: TabCursor,
  timeSignature: string,
): TabEdit {
  if (measures.length <= 1)
    return {
      measures: [emptyBar(timeSignature)],
      cursor: { ...cursor, bar: 0, beat: 0 },
    }
  const next = spliced(measures, cursor.bar, 1)
  const bar = Math.min(cursor.bar, next.length - 1)
  return { measures: next, cursor: { ...cursor, bar, beat: 0 } }
}

export function moveBeat(
  measures: Array<TabMeasure>,
  cursor: TabCursor,
  step: 1 | -1,
): TabEdit {
  const beats = measures[cursor.bar]?.beats.length ?? 0
  if (step === -1) {
    if (cursor.beat > 0)
      return { measures, cursor: { ...cursor, beat: cursor.beat - 1 } }
    if (cursor.bar === 0) return { measures, cursor }
    const bar = cursor.bar - 1
    const beat = Math.max((measures[bar]?.beats.length ?? 1) - 1, 0)
    return { measures, cursor: { ...cursor, bar, beat } }
  }
  if (cursor.beat < beats - 1)
    return { measures, cursor: { ...cursor, beat: cursor.beat + 1 } }
  if (cursor.bar < measures.length - 1)
    return { measures, cursor: { ...cursor, bar: cursor.bar + 1, beat: 0 } }
  const last = beatAt(measures, cursor)
  if (!last || (last.notes.length === 0 && !last.rest))
    return { measures, cursor }
  return insertBeat(measures, cursor)
}
