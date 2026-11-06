import { parseChord } from './chords.ts'
import { STANDARD_TUNING } from './diagrams.ts'
import { mod12, parsePitchToken } from './pitch.ts'

export type Voicing = { frets: Array<number>; fingers: Array<number> }

type Recipe = { required: Array<number>; optional: Array<number> }

const RECIPES: Record<string, Recipe> = {
  maj: { required: [0, 4], optional: [7] },
  m: { required: [0, 3], optional: [7] },
  '7': { required: [0, 4, 10], optional: [7] },
  m7: { required: [0, 3, 10], optional: [7] },
  maj7: { required: [0, 4, 11], optional: [7] },
  sus2: { required: [0, 2, 7], optional: [] },
  sus4: { required: [0, 5, 7], optional: [] },
  '7sus4': { required: [0, 5, 10], optional: [7] },
  add9: { required: [0, 4, 2], optional: [7] },
  madd9: { required: [0, 3, 2], optional: [7] },
  '6': { required: [0, 4, 9], optional: [7] },
  m6: { required: [0, 3, 9], optional: [7] },
  '9': { required: [0, 4, 10, 2], optional: [7] },
  m9: { required: [0, 3, 10, 2], optional: [7] },
  maj9: { required: [0, 4, 11, 2], optional: [7] },
  dim: { required: [0, 3, 6], optional: [] },
  dim7: { required: [0, 3, 6, 9], optional: [] },
  m7b5: { required: [0, 3, 6, 10], optional: [] },
  aug: { required: [0, 4, 8], optional: [] },
  '5': { required: [0, 7], optional: [] },
}

const ALIASES: Record<string, string> = {
  '': 'maj',
  M: 'maj',
  min: 'm',
  '-': 'm',
  dom7: '7',
  min7: 'm7',
  '-7': 'm7',
  M7: 'maj7',
  j7: 'maj7',
  '2': 'sus2',
  sus: 'sus4',
  add2: 'add9',
  o: 'dim',
  o7: 'dim7',
  '+': 'aug',
  ø: 'm7b5',
}

function recipeFor(quality: string) {
  return RECIPES[ALIASES[quality] ?? quality] ?? null
}

function midiOf(note: string) {
  const parsed = parsePitchToken(note, 'en')
  const octave = Number(note.slice(parsed?.length ?? 0))
  if (!parsed || !Number.isFinite(octave)) return null
  return 12 * (octave + 1) + parsed.pitch
}

function fingering(frets: Array<number>) {
  const fretted = frets.flatMap((fret, string) =>
    fret > 0 ? [{ fret, string }] : [],
  )
  const fingers = frets.map(() => 0)
  if (fretted.length === 0) return { fingers, needed: 0 }
  const lowest = Math.min(...fretted.map((note) => note.fret))
  const onLowest = fretted.filter((note) => note.fret === lowest)
  const first = onLowest[0]?.string ?? 0
  const last = onLowest.at(-1)?.string ?? 0
  const barre =
    fretted.length > 4 &&
    onLowest.length >= 2 &&
    frets.slice(first, last + 1).every((fret) => fret >= lowest)
  let finger = 1
  if (barre) {
    for (const note of onLowest) fingers[note.string] = 1
    finger = 2
  }
  const rest = fretted
    .filter((note) => !(barre && note.fret === lowest))
    .sort((a, b) => a.fret - b.fret || a.string - b.string)
  for (const note of rest) {
    fingers[note.string] = Math.min(4, finger)
    finger += 1
  }
  return { fingers, needed: finger - 1 }
}

export function fingersFor(frets: Array<number>) {
  return fingering(frets).fingers
}

export function chordVoicings(
  symbol: string,
  tuning: ReadonlyArray<string> = STANDARD_TUNING,
  limit = 8,
): Array<Voicing> {
  const chord = parseChord(symbol)
  const recipe = chord ? recipeFor(chord.quality) : null
  const open = tuning.map(midiOf)
  if (!chord || !recipe || open.some((note) => note === null)) return []
  const strings = open as Array<number>
  const tones = new Set(
    [...recipe.required, ...recipe.optional].map((step) =>
      mod12(chord.pitch + step),
    ),
  )
  const required = recipe.required.map((step) => mod12(chord.pitch + step))
  const bass = chord.bassPitch ?? chord.pitch
  if (chord.bassPitch !== undefined) tones.add(chord.bassPitch)
  const minSounded = Math.min(strings.length, strings.length >= 6 ? 4 : 3)
  const found = new Map<string, { frets: Array<number>; score: number }>()

  for (let start = 0; start <= 12; start += 1) {
    const low = Math.max(1, start)
    const high = start + 3
    const options = strings.map((note) => {
      const choices = [-1]
      if (tones.has(mod12(note))) choices.push(0)
      for (let fret = low; fret <= high; fret += 1)
        if (tones.has(mod12(note + fret))) choices.push(fret)
      return choices
    })
    const frets: Array<number> = []
    const visit = (string: number) => {
      if (string === strings.length) {
        consider([...frets])
        return
      }
      for (const fret of options[string] ?? []) {
        frets.push(fret)
        visit(string + 1)
        frets.pop()
      }
    }
    visit(0)
  }

  function consider(frets: Array<number>) {
    const sounded = frets.flatMap((fret, string) => (fret >= 0 ? [string] : []))
    if (sounded.length < minSounded) return
    const firstSounded = sounded[0] ?? 0
    const lastSounded = sounded.at(-1) ?? 0
    if (lastSounded - firstSounded + 1 !== sounded.length) return
    if (strings.length - 1 - lastSounded > 1) return
    const pitches = sounded.map(
      (string) => (strings[string] ?? 0) + (frets[string] ?? 0),
    )
    const lowest = Math.min(...pitches)
    if (mod12(lowest) !== bass) return
    const classes = new Set(pitches.map(mod12))
    if (!required.every((tone) => classes.has(tone))) return
    const fretted = frets.filter((fret) => fret > 0)
    const top = fretted.length > 0 ? Math.max(...fretted) : 0
    const span = fretted.length > 0 ? top - Math.min(...fretted) : 0
    if (span > 3) return
    if (fingering(frets).needed > 4) return
    const muted = strings.length - sounded.length
    const opens = frets.filter((fret) => fret === 0).length
    const missing = recipe!.optional.filter(
      (step) => !classes.has(mod12(chord!.pitch + step)),
    ).length
    const score =
      top + span + muted * 0.8 + missing - opens * 0.3 + fretted.length * 0.2
    const key = frets.join(',')
    if (!found.has(key)) found.set(key, { frets, score })
  }

  return [...found.values()]
    .sort((a, b) => a.score - b.score)
    .slice(0, limit)
    .map(({ frets }) => ({ frets, fingers: fingersFor(frets) }))
}
