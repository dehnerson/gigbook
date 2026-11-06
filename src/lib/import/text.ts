import { transposeSymbol } from '../music/chords'
import {
  chartChords,
  chordsOverLyricsToChordPro,
  isChordLine,
  isChordToken,
  sectionLabelOf,
} from '../music/chordpro'
import type { Notation } from '../music/pitch'
import { parseAsciiTab } from '../music/tab'
import type { TabMeasure } from '../music/tab'
import {
  STANDARD_TUNING,
  keyFromChord,
  readMetaLine,
  splitTitleArtist,
} from './meta'
import type { Meta } from './meta'
import type { DraftOutput } from './schema'

export type ImportLocale = 'en' | 'de'

const NAMES = {
  en: {
    intro: 'Intro',
    verse: 'Verse',
    chorus: 'Chorus',
    interlude: 'Interlude',
    outro: 'Outro',
  },
  de: {
    intro: 'Intro',
    verse: 'Strophe',
    chorus: 'Refrain',
    interlude: 'Zwischenspiel',
    outro: 'Outro',
  },
}

type RawSection = {
  name: string | null
  notes: Array<string>
  lines: Array<string>
  strumming?: string
}

export type TextImport = {
  draft: DraftOutput
  warnings: Array<string>
  stats: { sections: number; chords: number; tabMeasures: number }
  strong: boolean
}

function lastIndex<T>(items: Array<T>, test: (item: T) => boolean) {
  for (let index = items.length - 1; index >= 0; index -= 1)
    if (test(items[index])) return index
  return -1
}

function findLast<T>(items: Array<T>, test: (item: T) => boolean) {
  const index = lastIndex(items, test)
  return index < 0 ? undefined : items[index]
}

const PREFIX = '\u0001'
const STRING_LINE = /^\s*[A-Ga-g][#b]?\s*\|.*-/
const NUMBERED = /^(\s*)(\d{1,2})[.)](\s+)(\S.*)$/
const DIRECTIVE = /^\s*\{\s*([a-z_]+)\s*(?::\s*(.*?))?\s*\}\s*$/i
const INLINE_PAREN = /\(([^()\s]+)\)/g
const CHORD_DEFINITION =
  /^\s*[A-H][^\s:=]*\s*[:=]?\s*(?:[x\d]\s*){6}(?:\s*\([^)]*\))?\s*$/i
const NOISE =
  /^\s*(?:difficulty|author|tabbed\s+by|transcribed\s+by|chords?\s+used|rating|level|schwierigkeit|album|year|jahr|composer|komponist|words|music|lyrics\s+by|written\s+by|text|musik|melodie|text\s+und\s+musik|weise|worte)\s*[:]/i
const FIELD =
  /^\s*(title|titel|artist|interpret|künstler|band|by|von)\s*[:]?\s+(.+)$/i

const SECTION_WORDS =
  'pre[- ]?chorus|post[- ]?chorus|pre[- ]?refrain|intro|verse|vers|strophe|chorus|refrain|ref\\.?|kehrvers|bridge|outro|interlude|zwischenspiel|instrumental|solo|coda|tag|ending|schluss|riff|hook|break(?:down)?|vorspiel|nachspiel|middle\\s*8'
const REPEAT = '(?:[x×]\\s*\\d+|\\d+\\s*[x×]|\\d+\\s*mal)'
const HEADER = new RegExp(
  `^\\s*[\\[(]?\\s*((?:${SECTION_WORDS})(?:\\s*\\d+[a-z]?)?)\\s*[\\])]?\\s*(?:[(\\[]?\\s*(${REPEAT})\\s*[)\\]]?)?\\s*(?::\\s*(.*))?$`,
  'i',
)

function titleCase(name: string) {
  if (name !== name.toUpperCase()) return name
  return name
    .toLowerCase()
    .replace(
      /(^|[\s-])(\p{L})/gu,
      (_, gap, letter) => `${gap}${letter.toUpperCase()}`,
    )
}

function readHeader(line: string) {
  const bracket = sectionLabelOf(line)
  if (bracket) {
    const repeat = new RegExp(`\\s*[(]?(${REPEAT})[)]?$`, 'i').exec(bracket)
    return {
      name: titleCase(repeat ? bracket.slice(0, repeat.index) : bracket),
      repeat: repeat?.[1],
      rest: '',
    }
  }
  const match = HEADER.exec(line)
  if (!match?.[1]) return null
  const raw = match[1].replace(/\s+/g, ' ').trim()
  const name = /^ref\.?$/i.test(raw) ? 'Refrain' : titleCase(raw)
  return { name, repeat: match[2], rest: (match[3] || '').trim() }
}

function cleanLines(text: string) {
  return text
    .replace(/\r\n?/g, '\n')
    .replace(/\u00a0/g, ' ')
    .replace(/[\u200b\ufeff]/g, '')
    .replace(/\t/g, '    ')
    .replace(/\[ch\]([^[]*?)\[\/ch\]/gi, '$1')
    .replace(/\[\/?tab\]/gi, '')
    .replace(/♯/g, '#')
    .replace(/♭/g, 'b')
    .split('\n')
    .map((line) => line.trimEnd())
}

function chordTokens(line: string) {
  if (isChordLine(line)) return line.trim().split(/\s+/).filter(isChordToken)
  return [...line.matchAll(/\[([^\]]+)\]/g)]
    .map((match) => match[1])
    .filter(isChordToken)
}

function detectNotation(lines: Array<string>): Notation {
  return lines.some((line) =>
    chordTokens(line).some((token) => /^\(?H/.test(token)),
  )
    ? 'de'
    : 'en'
}

function inlineParenChords(lines: Array<string>) {
  const count = lines.reduce(
    (total, line) =>
      total +
      [...line.matchAll(INLINE_PAREN)].filter((match) => isChordToken(match[1]))
        .length,
    0,
  )
  if (count < 3) return lines
  return lines.map((line) =>
    line.replace(INLINE_PAREN, (whole, symbol: string) =>
      isChordToken(symbol) ? `[${symbol}]` : whole,
    ),
  )
}

function isGridLine(line: string) {
  const trimmed = line.trim()
  return (
    trimmed.startsWith('|') &&
    !trimmed.includes('[') &&
    trimmed.split(/[|\s]+/).some((token) => token && isChordToken(token))
  )
}

function toEnglish(symbol: string, notation: Notation) {
  return notation === 'de' ? transposeSymbol(symbol, 0, 'de', 'en') : symbol
}

function chartBody(lines: Array<string>, notation: Notation) {
  const out: Array<string> = []
  let run: Array<string> = []
  const flush = () => {
    if (run.length === 0) return
    out.push(
      ...chordsOverLyricsToChordPro(run.join('\n'), notation).split('\n'),
    )
    run = []
  }
  for (const line of lines) {
    if (isGridLine(line)) {
      flush()
      out.push(
        line
          .trim()
          .replace(/[^\s|]+/g, (token) =>
            isChordToken(token) ? toEnglish(token, notation) : token,
          ),
      )
      continue
    }
    run.push(
      line.replace(/\[([^\]]+)\]/g, (whole, symbol: string) =>
        isChordToken(symbol) ? `[${toEnglish(symbol, notation)}]` : whole,
      ),
    )
  }
  flush()
  return out
    .map((line) =>
      line
        .replace(new RegExp(`${PREFIX}+`, 'g'), '')
        .trimStart()
        .replace(/^(\[[^\]]+\])\s+(?=[^\s[])/, '$1'),
    )
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

function toParts(section: RawSection, notation: Notation) {
  const parts: DraftOutput['sections'][number]['parts'] = []
  let chart: Array<string> = []
  const flushChart = () => {
    const body = chartBody(chart, notation)
    chart = []
    if (!body) return
    parts.push({
      kind: 'chart',
      label: 'Chords',
      chartBody: body,
      strumming: parts.some((part) => part.kind === 'chart')
        ? undefined
        : section.strumming,
    })
  }
  const lines = section.lines
  let index = 0
  while (index < lines.length) {
    if (!STRING_LINE.test(lines[index] ?? '')) {
      chart.push(lines[index] ?? '')
      index += 1
      continue
    }
    const start = index
    while (index < lines.length && STRING_LINE.test(lines[index] ?? ''))
      index += 1
    if (index - start < 4) {
      chart.push(...lines.slice(start, index))
      continue
    }
    let header: string | undefined
    const above = chart.at(-1)
    if (above !== undefined && isChordLine(above)) header = chart.pop()
    flushChart()
    const block = [header ?? '', ...lines.slice(start, index)].join('\n')
    const measures = parseAsciiTab(block).map((measure) => ({
      ...measure,
      ...(measure.chordAbove
        ? { chordAbove: toEnglish(measure.chordAbove, notation) }
        : {}),
    }))
    if (measures.length > 0) {
      parts.push({ kind: 'tab', label: 'Tab', measures })
    }
  }
  flushChart()
  if (parts.length === 0 && section.strumming) {
    parts.push({
      kind: 'chart',
      label: 'Chords',
      chartBody: '',
      strumming: section.strumming,
    })
  }
  return parts
}

function lyricKey(lines: Array<string>) {
  return lines
    .filter((line) => !isChordLine(line))
    .join(' ')
    .replace(/\[[^\]]*\]/g, '')
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .trim()
}

function isChordOnly(lines: Array<string>) {
  const filled = lines.filter((line) => line.trim())
  return (
    filled.length > 0 &&
    filled.every(
      (line) =>
        isChordLine(line) ||
        isGridLine(line) ||
        STRING_LINE.test(line) ||
        /^(?:\s*\[[^\]]+\][\s|/\-%x×\d().:]*)+$/i.test(line),
    )
  )
}

function splitParagraphs(lines: Array<string>) {
  const paragraphs: Array<Array<string>> = []
  let current: Array<string> = []
  for (const line of lines) {
    if (line.trim()) {
      current.push(line)
    } else if (current.length > 0) {
      paragraphs.push(current)
      current = []
    }
  }
  if (current.length > 0) paragraphs.push(current)
  return paragraphs
}

function nameByStructure(
  section: RawSection,
  locale: ImportLocale,
): Array<RawSection> {
  const names = NAMES[locale]
  const paragraphs = splitParagraphs(section.lines)
  if (paragraphs.length === 0) return []
  const keys = paragraphs.map((lines) => lyricKey(lines))
  const counts = new Map<string, number>()
  for (const key of keys) if (key) counts.set(key, (counts.get(key) ?? 0) + 1)
  const firstLyric = keys.findIndex(Boolean)
  const lastLyric = lastIndex(keys, Boolean)
  const verses = keys.filter((key) => key && (counts.get(key) ?? 0) < 2).length
  let verse = 0
  return paragraphs.map((lines, index) => {
    const key = keys[index] ?? ''
    let name: string
    if (!key || isChordOnly(lines)) {
      name =
        index < firstLyric || firstLyric < 0
          ? names.intro
          : index > lastLyric
            ? names.outro
            : names.interlude
    } else if ((counts.get(key) ?? 0) > 1) {
      name = names.chorus
    } else {
      verse += 1
      name = verses > 1 ? `${names.verse} ${verse}` : names.verse
    }
    return {
      name,
      notes: index === 0 ? section.notes : [],
      lines,
      strumming: section.strumming,
    }
  })
}

function sameName(a: string, b: string) {
  const norm = (value: string) => value.toLowerCase().replace(/\s+/g, ' ')
  return norm(a) === norm(b)
}

export function parseSongText(
  text: string,
  locale: ImportLocale = 'en',
): TextImport {
  const names = NAMES[locale]
  const lines = inlineParenChords(cleanLines(text))
  const notation = detectNotation(lines)
  const meta: Meta = {}
  let title: string | undefined
  let artist: string | undefined
  const sections: Array<RawSection> = []
  let current = null as RawSection | null
  let pendingStrumming: string | undefined
  let nextVerse = 1
  let inGrid = false

  const open = (name: string | null, repeat?: string) => {
    current = {
      name,
      notes: repeat ? [`×${repeat.replace(/\D/g, '')}`] : [],
      lines: [],
      strumming: pendingStrumming,
    }
    pendingStrumming = undefined
    sections.push(current)
    return current
  }
  const target = () => current ?? open(null)
  const openOnLyric = (
    name: string,
    repeat: string | undefined,
    prefix: number,
    lyric: string,
  ) => {
    const before = current?.lines ?? []
    const last = before.at(-1)
    const carried =
      last !== undefined && isChordLine(last) && !before.at(-2)?.trim()
        ? before.pop()
        : undefined
    const section = open(name, repeat)
    if (carried !== undefined) section.lines.push(carried)
    section.lines.push(`${PREFIX.repeat(prefix)}${lyric}`)
  }

  const firstParagraph: Array<string> = []
  for (const line of lines) {
    if (!line.trim()) {
      if (firstParagraph.length > 0) break
      continue
    }
    firstParagraph.push(line)
  }
  const preambleIsHeader =
    firstParagraph.length > 0 &&
    firstParagraph.length <= 3 &&
    firstParagraph.every(
      (line) =>
        line.length <= 70 &&
        !isChordLine(line) &&
        !line.includes('[') &&
        !DIRECTIVE.test(line) &&
        !readHeader(line) &&
        !STRING_LINE.test(line),
    ) &&
    lines.filter((line) => line.trim()).length > firstParagraph.length
  const preambleEnd = preambleIsHeader
    ? lines.indexOf(firstParagraph.at(-1) ?? '') + 1
    : 0

  for (const [index, line] of lines.entries()) {
    const trimmed = line.trim()

    const directive = DIRECTIVE.exec(line)
    if (directive?.[1]) {
      const name = directive[1].toLowerCase()
      const value = (directive[2] || '').trim()
      if (name === 'title' || name === 't') title = value
      else if (['subtitle', 'st', 'artist'].includes(name)) artist ??= value
      else if (['key', 'capo', 'tempo', 'time'].includes(name)) {
        Object.assign(meta, readMetaLine(`${name}: ${value}`) ?? {})
      } else if (name === 'start_of_chorus' || name === 'soc') {
        open(value || names.chorus)
      } else if (name === 'start_of_verse' || name === 'sov') {
        open(value || `${names.verse} ${nextVerse++}`)
      } else if (name === 'start_of_bridge' || name === 'sob') {
        open(value || 'Bridge')
      } else if (name === 'start_of_grid' || name === 'sog') {
        inGrid = true
        if (value) open(value)
      } else if (name === 'start_of_tab' || name === 'sot') {
        if (value) open(value)
      } else if (name.startsWith('end_of_') || /^eo[cvbgt]$/.test(name)) {
        if (name === 'end_of_grid' || name === 'eog') inGrid = false
        current = null
      } else if (name === 'chorus') {
        const chorus = findLast(sections, (section) =>
          sameName(section.name ?? '', value || names.chorus),
        )
        open(value || names.chorus).lines.push(...(chorus?.lines ?? []))
        current = null
      } else if (
        ['comment', 'c', 'ci', 'cb', 'comment_italic', 'highlight'].includes(
          name,
        )
      ) {
        const header = readHeader(value)
        if (header && !header.rest) open(header.name, header.repeat)
        else if (value) target().notes.push(value)
      }
      continue
    }

    if (index < preambleEnd) {
      if (!trimmed) continue
      const field = FIELD.exec(line)
      if (field?.[1] && field[2]) {
        if (/^tit/i.test(field[1])) title = field[2].trim()
        else artist ??= field[2].trim()
      } else if (readMetaLine(line) || NOISE.test(line)) {
        Object.assign(meta, readMetaLine(line) ?? {})
      } else if (!title) {
        const split = splitTitleArtist(line)
        title = split.title
        if (split.artist) artist ??= split.artist
      } else {
        artist ??= line.trim().replace(/^(?:by|von)\s+/i, '')
      }
      continue
    }

    const metaLine = trimmed ? readMetaLine(line) : null
    if (metaLine) {
      if (metaLine.strumming) {
        if (current) current.strumming = metaLine.strumming
        else pendingStrumming = metaLine.strumming
      }
      Object.assign(meta, { ...metaLine, strumming: undefined })
      continue
    }
    if (trimmed && (CHORD_DEFINITION.test(line) || NOISE.test(line))) continue
    if (sections.length === 0) {
      const field = FIELD.exec(line)
      if (
        field?.[1] &&
        field[2] &&
        /^(?:title|titel|artist|interpret)/i.test(field[1])
      ) {
        if (/^tit/i.test(field[1])) title = field[2].trim()
        else artist ??= field[2].trim()
        continue
      }
    }

    const header = trimmed && !inGrid ? readHeader(line) : null
    if (header) {
      if (!header.rest) open(header.name, header.repeat)
      else if (isChordLine(header.rest) || isGridLine(header.rest))
        open(header.name, header.repeat).lines.push(header.rest)
      else
        openOnLyric(
          header.name,
          header.repeat,
          line.length - header.rest.length,
          header.rest,
        )
      continue
    }

    const numbered = NUMBERED.exec(line)
    if (
      numbered?.[2] &&
      numbered[4] &&
      Number(numbered[2]) === nextVerse &&
      !isChordLine(line)
    ) {
      openOnLyric(
        `${names.verse} ${nextVerse}`,
        undefined,
        line.length - numbered[4].length,
        numbered[4],
      )
      nextVerse += 1
      continue
    }

    if (!trimmed && !current) continue
    target().lines.push(line)
  }

  let named = sections.filter(
    (section) => section.lines.some((line) => line.trim()) || section.name,
  )
  if (named.length > 0 && named.every((section) => section.name === null)) {
    named = named.flatMap((section) => nameByStructure(section, locale))
  } else {
    const last = named.length - 1
    named = named.flatMap((section, index) => {
      if (section.name !== null) return [section]
      if (!section.lines.some((line) => line.trim())) return []
      const chordOnly = isChordOnly(section.lines)
      const name = !chordOnly
        ? names.verse
        : index === 0
          ? names.intro
          : index === last
            ? names.outro
            : names.interlude
      return [{ ...section, name }]
    })
    for (const [index, section] of named.entries()) {
      if (section.lines.some((line) => line.trim())) continue
      const earlier = findLast(
        named.slice(0, index),
        (other) =>
          other.name !== null &&
          section.name !== null &&
          sameName(other.name, section.name) &&
          other.lines.some((line) => line.trim()),
      )
      if (earlier) section.lines = [...earlier.lines]
    }
  }

  const output = named
    .map((section) => ({
      name: section.name ?? names.verse,
      notes: section.notes.length > 0 ? section.notes.join('\n') : undefined,
      parts: toParts(section, notation),
    }))
    .filter((section) => section.parts.length > 0)

  const chords = new Set<string>()
  let tabMeasures = 0
  let firstChord: string | undefined
  for (const section of output) {
    for (const part of section.parts) {
      if (part.kind === 'chart') {
        for (const symbol of chartChords(part.chartBody ?? '')) {
          firstChord ??= symbol
          chords.add(symbol)
        }
      } else {
        const measures = (part.measures ?? []) as Array<TabMeasure>
        tabMeasures += measures.length
        for (const measure of measures) {
          if (measure.chordAbove) {
            firstChord ??= measure.chordAbove
            chords.add(measure.chordAbove)
          }
        }
      }
    }
  }

  const capo = meta.capo ?? 0
  const warnings: Array<string> = []
  if (chords.size === 0 && tabMeasures === 0) warnings.push('noChords')
  return {
    draft: {
      title: title || 'Untitled',
      artist: artist || 'Unknown',
      concertKey:
        meta.key ?? (firstChord ? keyFromChord(firstChord, capo) : null) ?? 'C',
      timeSignature: meta.timeSignature ?? '4/4',
      bpm: meta.bpm,
      tuning: meta.tuning ?? STANDARD_TUNING,
      suggestedCapo: capo,
      tabRelativeToCapo: capo > 0,
      sections: output,
    },
    warnings,
    stats: {
      sections: output.length,
      chords: chords.size,
      tabMeasures,
    },
    strong: chords.size >= 2 || tabMeasures > 0,
  }
}
