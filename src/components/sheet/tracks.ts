import { DEFAULT_TRACK } from '@/lib/tracks'
import type { Track } from '@/lib/tracks'
import { m } from '@/paraglide/messages'

export function trackName(track: Track) {
  if (track.name) return track.name
  return track.id === DEFAULT_TRACK.chart ? m.trackVocals() : m.trackGuitarTab()
}
