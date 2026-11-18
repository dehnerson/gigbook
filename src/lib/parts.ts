export type Instrument = 'guitar' | 'bass'

export type StoredPart = {
  id: string
  name?: string
  instrument: Instrument
  tuning?: Array<string>
}

/** `name` is unset when a part keeps its translated name. */
export type Part = StoredPart & { builtIn: boolean }

export const GUITAR_PART_ID = 'guitar'

/** Low to high, matching the guitar tuning stored on a version. */
export const BASS_TUNING = ['E1', 'A1', 'D2', 'G2']

const GENERIC_GUITAR = new Set(['', 'guitar', 'gitarre', 'guitar tab', 'tab'])

export function isGuitarPart(part: { id: string }) {
  return part.id === GUITAR_PART_ID
}

export function allParts(stored: Array<StoredPart> = []): Array<Part> {
  return stored.map((part) => ({ ...part, builtIn: isGuitarPart(part) }))
}

export function partTuning(part: StoredPart, versionTuning: Array<string>) {
  if (part.instrument === 'bass')
    return part.tuning && part.tuning.length > 0
      ? part.tuning
      : [...BASS_TUNING]
  return versionTuning
}

export function followsCapo(part: { instrument: Instrument }) {
  return part.instrument === 'guitar'
}

export function usedParts(
  stored: Array<StoredPart> | undefined,
  lines: Array<{ partId: string }>,
) {
  const used = new Set(lines.map((line) => line.partId))
  return allParts(stored).filter((part) => used.has(part.id))
}

export function onVisiblePart(
  partId: string,
  visiblePartIds: Array<string> | undefined,
) {
  return (
    !visiblePartIds ||
    visiblePartIds.length === 0 ||
    visiblePartIds.includes(partId)
  )
}

export function sortByPart<Line extends { partId: string }>(
  lines: Array<Line>,
  stored: Array<StoredPart> | undefined,
) {
  const index = new Map((stored ?? []).map((part, place) => [part.id, place]))
  return [...lines].sort(
    (a, b) =>
      (index.get(a.partId) ?? Number.MAX_SAFE_INTEGER) -
      (index.get(b.partId) ?? Number.MAX_SAFE_INTEGER),
  )
}

/** A guitar tab with no real name belongs on the version's guitar part. */
export function genericGuitarName(name: string) {
  return GENERIC_GUITAR.has(name.trim().toLowerCase())
}
