export type PartKind = 'chart' | 'tab'

export type StoredTrack = { id: string; name: string }

/** `name` is unset for built-in tracks that keep their translated name. */
export type Track = { id: string; name?: string; builtIn: boolean }

type TrackedPart = { kind: PartKind; trackId?: string }

export const DEFAULT_TRACK: Record<PartKind, string> = {
  chart: 'vocals',
  tab: 'guitar',
}

const BUILT_IN = [DEFAULT_TRACK.chart, DEFAULT_TRACK.tab]

const GENERIC_LABELS = new Set([
  'chords',
  'tab',
  'add chart',
  'add tab',
  'akkorde',
  'chart',
  'lyrics & chords',
  'text & akkorde',
])

export function isBuiltInTrack(id: string) {
  return BUILT_IN.includes(id)
}

export function allTracks(stored: Array<StoredTrack> = []): Array<Track> {
  const byId = new Map(stored.map((track) => [track.id, track]))
  return [
    ...BUILT_IN.map((id) => ({ id, name: byId.get(id)?.name, builtIn: true })),
    ...stored
      .filter((track) => !isBuiltInTrack(track.id))
      .map((track) => ({ ...track, builtIn: false })),
  ]
}

export function trackOf(part: TrackedPart, stored: Array<StoredTrack> = []) {
  const id = part.trackId
  if (id && (isBuiltInTrack(id) || stored.some((track) => track.id === id)))
    return id
  return DEFAULT_TRACK[part.kind]
}

export function usedTracks(
  stored: Array<StoredTrack> | undefined,
  parts: Array<TrackedPart>,
) {
  const used = new Set(parts.map((part) => trackOf(part, stored)))
  return allTracks(stored).filter((track) => used.has(track.id))
}

export function onVisibleTrack(
  part: TrackedPart,
  stored: Array<StoredTrack> | undefined,
  visibleTrackIds: Array<string> | undefined,
) {
  return (
    !visibleTrackIds ||
    visibleTrackIds.length === 0 ||
    visibleTrackIds.includes(trackOf(part, stored))
  )
}

export function visibleParts<Part extends TrackedPart>(
  timeline: Array<{ parts: Array<Part> }>,
  stored: Array<StoredTrack> | undefined,
  visibleTrackIds?: Array<string>,
) {
  return timeline.flatMap((entry) =>
    entry.parts.filter((part) => onVisibleTrack(part, stored, visibleTrackIds)),
  )
}

/** Labels like "Tab" or "Chords" say nothing the track doesn't already say. */
export function meaningfulLabel(label: string) {
  const trimmed = label.trim()
  return GENERIC_LABELS.has(trimmed.toLowerCase()) ? '' : trimmed
}
