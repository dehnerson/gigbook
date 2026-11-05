import { isChordLine, isChordToken } from './chordpro.ts'

export const MAX_FRET = 22

export type TabTechnique = 'h' | 'p' | 'b' | '/'

export type TabNote = {
  string: number
  fret: number
  technique?: TabTechnique
  bendSemitones?: number
  unplayable?: boolean
}

export type TabEvent = {
  position: number
  notes: Array<TabNote>
}

export type TabMeasure = {
  chordAbove?: string
  events: Array<TabEvent>
}

const TECHNIQUES = new Set<TabTechnique>(['h', 'p', 'b', '/'])

function techniqueOf(char: string | undefined): TabTechnique | undefined {
  if (char && TECHNIQUES.has(char as TabTechnique)) return char as TabTechnique
  return undefined
}

const STRING_LINE = /^\s*[A-Ga-g][#b]?\s*\|/

function chordsByColumn(header: string | undefined, offset: number) {
  if (!header || !isChordLine(header)) return []
  return [...header.matchAll(/\S+/g)]
    .filter((match) => isChordToken(match[0]))
    .map((match) => ({ symbol: match[0], column: match.index - offset }))
}

function parseBlock(stringLines: Array<string>, header: string | undefined) {
  const offset = (stringLines[0] ?? '').indexOf('|') + 1
  const bodies = stringLines.map((line) => line.slice(line.indexOf('|') + 1))
  const width = Math.max(...bodies.map((body) => body.length))
  const padded = bodies.map((body) => body.padEnd(width, '-'))
  const chords = chordsByColumn(header, offset)

  const measures: Array<TabMeasure> = []
  let current: Array<TabEvent> = []
  let position = 0
  let column = 0
  let measureStart = 0

  const close = (end: number) => {
    const chord = chords.find(
      (item) => item.column >= measureStart - 1 && item.column < end,
    )
    if (current.length > 0 || chord) {
      measures.push({
        ...(chord ? { chordAbove: chord.symbol } : {}),
        events: current,
      })
    }
    current = []
    position = 0
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
      const after = body[column + (twoDigit ? 2 : 1)]
      const technique = techniqueOf(after)
      notes.push({
        string: index + 1,
        fret,
        ...(technique ? { technique } : {}),
      })
      consumed = Math.max(consumed, twoDigit ? 2 : 1)
    })

    if (notes.length > 0) {
      current.push({ position, notes })
      position += 1
    }
    column += consumed
  }

  close(width)
  return measures
}

export function parseAsciiTab(source: string): Array<TabMeasure> {
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
    measures.push(...parseBlock(lines.slice(start, index), header))
    previousEnd = index
  }
  return measures
}

function noteLabel(note: TabNote) {
  return `${note.fret}${note.technique ?? ''}`
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
      const column = (rows[0] ?? '').length
      if (measure.chordAbove) {
        header = `${header.padEnd(column + 1)}${measure.chordAbove} `
      }
      rows.forEach((_, row) => (rows[row] += '-'))
      for (const event of measure.events) {
        const cell = Math.max(1, ...event.notes.map((n) => noteLabel(n).length))
        rows.forEach((_, row) => {
          const note = event.notes.find((item) => item.string === row + 1)
          rows[row] += (note ? noteLabel(note) : '').padEnd(cell, '-') + '-'
        })
      }
      if (measure.events.length === 0)
        rows.forEach((_, row) => (rows[row] += '-------'))
      rows.forEach((_, row) => (rows[row] += '|'))
    }
    blocks.push([header.trimEnd(), ...rows].filter(Boolean).join('\n'))
  }
  return blocks.join('\n\n')
}

export function previewTabShift(
  measures: Array<TabMeasure>,
  semitones: number,
) {
  const notes = measures.flatMap((measure) =>
    measure.events.flatMap((event) => event.notes),
  )
  const flagged = notes.filter(
    (note) => note.fret + semitones < 0 || note.fret + semitones > MAX_FRET,
  )
  if (flagged.length > 0 || semitones === 0) {
    return {
      applied: false,
      measures: measures.map((measure) => ({
        ...measure,
        events: measure.events.map((event) => ({
          ...event,
          notes: event.notes.map((note) => ({
            ...note,
            unplayable:
              note.fret + semitones < 0 || note.fret + semitones > MAX_FRET,
          })),
        })),
      })),
    }
  }

  return {
    applied: true,
    measures: measures.map((measure) => ({
      ...measure,
      events: measure.events.map((event) => ({
        ...event,
        notes: event.notes.map((note) => ({
          ...note,
          fret: note.fret + semitones,
          unplayable: false,
        })),
      })),
    })),
  }
}
