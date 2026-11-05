export type StrumStroke = 'down' | 'up' | 'mute' | 'rest'

export type StrumPattern = {
  slots: Array<StrumStroke>
  counts: Array<string> | null
}

const STROKES: Partial<Record<string, StrumStroke>> = {
  d: 'down',
  '↓': 'down',
  v: 'down',
  u: 'up',
  '↑': 'up',
  '^': 'up',
  x: 'mute',
  '-': 'rest',
  '.': 'rest',
  _: 'rest',
}

const SUBDIVISION_NAMES: Partial<Record<number, Array<string>>> = {
  1: [],
  2: ['&'],
  3: ['&', 'a'],
  4: ['e', '&', 'a'],
}

export function beatsOf(timeSignature: string) {
  const beats = Number(timeSignature.split('/')[0])
  return Number.isInteger(beats) && beats > 0 ? beats : 4
}

export function strumCounts(slotCount: number, beats: number) {
  if (slotCount === 0 || slotCount % beats !== 0) return null
  const subdivision = slotCount / beats
  const names = SUBDIVISION_NAMES[subdivision]
  if (!names) return null
  return Array.from({ length: beats }, (_, beat) => [
    String(beat + 1),
    ...names,
  ]).flat()
}

export function parseStrum(
  text: string,
  timeSignature = '4/4',
): StrumPattern | null {
  const compact = text.replace(/[\s|]+/g, '')
  if (!compact) return null
  const slots: Array<StrumStroke> = []
  for (const char of compact) {
    const stroke = STROKES[char.toLowerCase()]
    if (!stroke) return null
    slots.push(stroke)
  }
  if (!slots.some((slot) => slot !== 'rest')) return null
  return { slots, counts: strumCounts(slots.length, beatsOf(timeSignature)) }
}
