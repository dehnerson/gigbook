import type { Part } from '@/lib/parts'
import { m } from '@/paraglide/messages'

export function partName(part: Pick<Part, 'name' | 'instrument'>) {
  if (part.name) return part.name
  return part.instrument === 'bass' ? m.partBass() : m.partGuitar()
}
