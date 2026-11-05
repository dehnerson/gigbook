import { parseChord, transposeSymbol } from './chords.ts'
import type { Notation } from './pitch.ts'

export type ChartToken =
  | { kind: 'text'; value: string }
  | { kind: 'chord'; symbol: string }

export type ChartLine = {
  tokens: Array<ChartToken>
  grid: boolean
}

const CHORD_PATTERN = /\[([^\]]+)\]/g

export function parseChordPro(body: string): Array<ChartLine> {
  return body.split(/\r?\n/).map((line) => {
    const tokens: Array<ChartToken> = []
    let cursor = 0
    for (const match of line.matchAll(CHORD_PATTERN)) {
      const index = match.index
      if (index > cursor)
        tokens.push({ kind: 'text', value: line.slice(cursor, index) })
      tokens.push({ kind: 'chord', symbol: match[1] })
      cursor = index + match[0].length
    }
    if (cursor < line.length)
      tokens.push({ kind: 'text', value: line.slice(cursor) })
    const grid = /^\s*\|/.test(line) && !line.includes('[')
    return { tokens, grid }
  })
}

export function renderChordPro(lines: Array<ChartLine>) {
  return lines
    .map((line) =>
      line.tokens
        .map((token) =>
          token.kind === 'chord' ? `[${token.symbol}]` : token.value,
        )
        .join(''),
    )
    .join('\n')
}

function transposeGridLine(
  line: string,
  semitones: number,
  from: Notation,
  to: Notation,
) {
  return line.replace(/[^\s|]+/g, (token) =>
    transposeSymbol(token, semitones, from, to),
  )
}

export function transposeChordPro(
  body: string,
  semitones: number,
  from: Notation = 'en',
  to: Notation = from,
) {
  return body
    .split(/\r?\n/)
    .map((line) => {
      if (isBarGridLine(line))
        return transposeGridLine(line, semitones, from, to)
      const parsed = parseChordPro(line).at(0)
      if (!parsed) return line
      return parsed.tokens
        .map((token) =>
          token.kind === 'chord'
            ? `[${transposeSymbol(token.symbol, semitones, from, to)}]`
            : token.value,
        )
        .join('')
    })
    .join('\n')
}

export function isBarGridLine(line: string) {
  const trimmed = line.trim()
  return trimmed.startsWith('|') && !trimmed.includes('[')
}

export function normalizeCapoToConcert(
  body: string,
  capo: number,
  notation: Notation = 'en',
) {
  return {
    body: capo === 0 ? body : transposeChordPro(body, capo, notation),
    suggestedCapo: capo,
  }
}

const QUALITY =
  /^(?:maj|min|m|M|dim|aug|sus|add|\+|-|o)?\d{0,2}(?:(?:sus|add|maj|no|b|#|\+|-)\d{0,2}|\([^)]*\))*$/
const FILLER = /^(?:\|+|:?\|:?|\/|-+|%|\.{2,}|[x×]?\d+[x×]?|N\.?C\.?)$/i

function chordNotation(token: string): Notation | null {
  if (!/^[A-H]/.test(token)) return null
  for (const notation of ['en', 'de'] as const) {
    const parsed = parseChord(token, notation)
    if (parsed && QUALITY.test(parsed.quality)) return notation
  }
  return null
}

export function isChordToken(token: string) {
  return chordNotation(token.replace(/^\(|\)$/g, '')) !== null
}

export function isChordLine(line: string) {
  if (line.includes('[')) return false
  const tokens = line.trim().split(/\s+/).filter(Boolean)
  if (tokens.length === 0) return false
  let chords = 0
  for (const token of tokens) {
    if (isChordToken(token)) chords += 1
    else if (!FILLER.test(token.replace(/^\(|\)$/g, ''))) return false
  }
  return chords > 0
}

export function sectionLabelOf(line: string) {
  const match = /^\s*\[([^\]]+)\]\s*:?\s*$/.exec(line)
  if (!match?.[1]) return null
  return isChordToken(match[1]) ? null : match[1].trim()
}

function toConcert(token: string, notation: Notation) {
  const bare = token.replace(/^\(|\)$/g, '')
  const from = notation === 'de' ? 'de' : (chordNotation(bare) ?? 'en')
  return transposeSymbol(bare, 0, from, 'en')
}

function tokensWithColumns(line: string) {
  return [...line.matchAll(/\S+/g)].map((match) => ({
    token: match[0],
    column: match.index,
  }))
}

export function chordsOverLyricsToChordPro(
  text: string,
  notation: Notation = 'en',
) {
  const lines = text.replace(/\t/g, '    ').split(/\r?\n/)
  const out: Array<string> = []
  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index] ?? ''
    if (!isChordLine(line)) {
      out.push(line.trimEnd())
      continue
    }
    const tokens = tokensWithColumns(line)
    const next = lines.at(index + 1)
    const pairsWithLyric =
      next !== undefined &&
      next.trim() !== '' &&
      !isChordLine(next) &&
      sectionLabelOf(next) === null
    if (pairsWithLyric) {
      let lyric = next.trimEnd()
      for (const { token, column } of [...tokens].reverse()) {
        if (!isChordToken(token)) continue
        if (lyric.length < column) lyric = lyric.padEnd(column, ' ')
        lyric = `${lyric.slice(0, column)}[${toConcert(token, notation)}]${lyric.slice(column)}`
      }
      out.push(lyric)
      index += 1
    } else {
      let row = line.trimEnd()
      for (const { token, column } of [...tokens].reverse()) {
        if (!isChordToken(token)) continue
        row = `${row.slice(0, column)}[${toConcert(token, notation)}]${row.slice(column + token.length)}`
      }
      out.push(row)
    }
  }
  return out.join('\n')
}

export function hasChordsOverLyrics(text: string) {
  return text.split(/\r?\n/).some((line) => isChordLine(line))
}

export function isChordOnlyLine(tokens: Array<ChartToken>) {
  return (
    tokens.some((token) => token.kind === 'chord') &&
    tokens.every(
      (token) =>
        token.kind === 'chord' || /^[\s|/\-%x×\d().:]*$/i.test(token.value),
    )
  )
}

export function chartChords(body: string) {
  const symbols: Array<string> = []
  for (const line of body.split(/\r?\n/)) {
    if (isBarGridLine(line)) {
      for (const token of line.split(/[|\s]+/)) {
        if (token && isChordToken(token)) symbols.push(token)
      }
      continue
    }
    if (sectionLabelOf(line)) continue
    for (const token of parseChordPro(line)[0]?.tokens ?? []) {
      if (token.kind === 'chord' && token.symbol) symbols.push(token.symbol)
    }
  }
  return [...new Set(symbols)]
}
