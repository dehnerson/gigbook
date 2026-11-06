import { parseChord } from '../music/chords'
import { mod12, parsePitchToken } from '../music/pitch'

export const STANDARD_TUNING = ['E2', 'A2', 'D3', 'G3', 'B3', 'E4']

const MAJOR_KEYS = [
  'C',
  'Db',
  'D',
  'Eb',
  'E',
  'F',
  'F#',
  'G',
  'Ab',
  'A',
  'Bb',
  'B',
]
const MINOR_KEYS = [
  'Cm',
  'C#m',
  'Dm',
  'Ebm',
  'Em',
  'Fm',
  'F#m',
  'Gm',
  'G#m',
  'Am',
  'Bbm',
  'Bm',
]
const SHARP_NAMES = [
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
]
const FLAT_NAMES = [
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
]

export function keyFromChord(symbol: string, semitones = 0) {
  const chord = parseChord(symbol)
  if (!chord) return null
  const minor = /^m(?!aj)/.test(chord.quality)
  const pitch = mod12(chord.pitch + semitones)
  return (minor ? MINOR_KEYS : MAJOR_KEYS)[pitch] ?? null
}

const NAMED_TUNINGS: Array<[RegExp, Array<string>]> = [
  [/^(?:e\s*)?standard|^normal/, STANDARD_TUNING],
  [/^drop\s*d$/, ['D2', 'A2', 'D3', 'G3', 'B3', 'E4']],
  [/^drop\s*c$/, ['C2', 'G2', 'C3', 'F3', 'A3', 'D4']],
  [
    /^(?:eb|e♭|half[\s-]*step\s*down|1\/2\s*step\s*down|down\s*1\/2)/,
    ['Eb2', 'Ab2', 'Db3', 'Gb3', 'Bb3', 'Eb4'],
  ],
  [
    /^(?:d\s*standard|whole[\s-]*step\s*down|full\s*step\s*down)/,
    ['D2', 'G2', 'C3', 'F3', 'A3', 'D4'],
  ],
  [/^open\s*g$/, ['D2', 'G2', 'D3', 'G3', 'B3', 'D4']],
  [/^open\s*d$/, ['D2', 'A2', 'D3', 'F#3', 'A3', 'D4']],
  [/^open\s*e$/, ['E2', 'B2', 'E3', 'G#3', 'B3', 'E4']],
]

function withOctaves(names: Array<string>) {
  const out: Array<string> = []
  let previous = -1
  for (const name of names) {
    const parsed = parsePitchToken(name, 'en')
    if (!parsed || parsed.length !== name.length) return null
    let midi = 24 + parsed.pitch
    if (previous < 0) {
      while (midi < 35) midi += 12
    } else {
      while (midi <= previous) midi += 12
    }
    previous = midi
    const spelled = (name.includes('b') ? FLAT_NAMES : SHARP_NAMES)[
      parsed.pitch
    ]
    out.push(`${spelled}${Math.floor(midi / 12) - 1}`)
  }
  return out
}

export function parseTuning(value: string) {
  const text = value.trim().toLowerCase().replace(/[()]/g, '')
  for (const [pattern, tuning] of NAMED_TUNINGS)
    if (pattern.test(text)) return tuning
  const compact = value.replace(/[\s,-]+/g, '')
  const names = compact.match(/[A-G][#b♯♭]?/g)
  if (!names || names.join('') !== compact) return null
  if (names.length < 4 || names.length > 7) return null
  return withOctaves(
    names.map((name) => name.replace('♯', '#').replace('♭', 'b')),
  )
}

export type Meta = {
  capo?: number
  key?: string
  tuning?: Array<string>
  bpm?: number
  timeSignature?: string
  strumming?: string
}

const ORDINAL = /^(\d{1,2})(?:st|nd|rd|th|\.)?(?:\s*(?:fret|bund))?$/i

function parseCapo(value: string) {
  const text = value.trim().toLowerCase()
  if (/^(?:no|none|kein|ohne|0|-)/.test(text)) return 0
  const match = ORDINAL.exec(text.replace(/^(?:on|im|am|auf)\s+/, ''))
  const fret = match ? Number(match[1]) : Number.NaN
  return fret >= 0 && fret <= 12 ? fret : undefined
}

function parseKey(value: string) {
  const first = value.trim().split(/[\s,(]/)[0] ?? ''
  const german = /-?(?:moll|dur)$/i.test(first)
  const normalized = first
    .replace(/-?moll$/i, 'm')
    .replace(/-?dur$/i, '')
    .replace(/minor$/i, 'm')
    .replace(/major$/i, '')
  const root = normalized.charAt(0).toUpperCase()
  const rest = normalized.slice(1)
  if (root === 'H') return keyFromChord(`B${rest}`) ?? undefined
  if (german && root === 'B' && !/^[#b]/.test(rest))
    return keyFromChord(`Bb${rest}`) ?? undefined
  return keyFromChord(`${root}${rest}`) ?? undefined
}

const META_LINE =
  /^\s*\{?\s*(capo|kapo(?:daster)?|key|tonart|tuning|stimmung|bpm|tempo|time|time\s*signature|taktart|takt|strumming|strum(?:ming)?\s*pattern|schlagmuster|rhythmus)\s*[:=]?\s*(.*?)\s*\}?\s*$/i

export function readMetaLine(line: string): Meta | null {
  const match = META_LINE.exec(line)
  if (!match) return null
  const field = match[1].toLowerCase()
  const value = match[2]
  if (!value && !field.startsWith('capo')) return null
  if (field.startsWith('capo') || field.startsWith('kapo')) {
    const capo = parseCapo(value)
    return capo === undefined ? null : { capo }
  }
  if (field === 'key' || field === 'tonart') {
    const key = parseKey(value)
    return key ? { key } : null
  }
  if (field === 'tuning' || field === 'stimmung') {
    const tuning = parseTuning(value)
    return tuning ? { tuning } : null
  }
  if (field === 'bpm' || field === 'tempo') {
    const bpm = Number(/\d{2,3}/.exec(value)?.[0])
    return bpm >= 30 && bpm <= 300 ? { bpm } : null
  }
  if (/^(?:time|takt)/.test(field)) {
    const time = /^(\d{1,2})\s*\/\s*(\d{1,2})$/.exec(value)
    return time ? { timeSignature: `${time[1]}/${time[2]}` } : null
  }
  const strumming = value.replace(/\s+/g, ' ').trim()
  return /^[DUdu↓↑xX\-\s()]+$/.test(strumming)
    ? { strumming: strumming.replace(/↓/g, 'D').replace(/↑/g, 'U') }
    : null
}

const TITLE_NOISE =
  /\s+(?:official\s+)?(?:chords?|tabs?|akkorde|ukulele(?:\s+chords)?|guitar\s+pro|bass\s+tab|lyrics)(?:\s+(?:&|and|und)\s+(?:lyrics|tabs?|text))?\s*$/i

export function splitTitleArtist(line: string) {
  const text = line.trim().replace(/\s+/g, ' ')
  const by =
    /^(.+)\s+(?:chords?|tabs?|akkorde|ukulele\s+chords|lyrics)\s+(?:by|von)\s+(.+)$/i.exec(
      text,
    )
  if (by?.[1] && by[2]) {
    return { title: by[1].replace(TITLE_NOISE, ''), artist: by[2] }
  }
  const dash = /^(.+?)\s+[-–—]\s+(.+)$/.exec(text)
  if (dash?.[1] && dash[2]) {
    return {
      title: dash[1].replace(TITLE_NOISE, ''),
      artist: dash[2].replace(TITLE_NOISE, ''),
    }
  }
  const paren = /^(.+?)\s*\(([^)]+)\)$/.exec(text)
  if (paren?.[1] && paren[2] && !/\d/.test(paren[2])) {
    return { title: paren[1].replace(TITLE_NOISE, ''), artist: paren[2] }
  }
  return { title: text.replace(TITLE_NOISE, '') }
}
