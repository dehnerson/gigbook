import { entryOfPass, timelinePasses } from '@/lib/passes'
import type { Pass } from '@/lib/passes'
import type { SheetEntry, SheetLayout } from './types'

export { passOf } from '@/lib/passes'

export type SheetPass = Pass<SheetEntry>

export function sheetPasses(timeline: Array<SheetEntry>): Array<SheetPass> {
  return timelinePasses(timeline)
}

export function blockOf(layout: SheetLayout) {
  return layout === 'compact' ? entryOfPass : (id: string) => id
}
