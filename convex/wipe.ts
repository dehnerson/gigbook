import { internalMutation } from './_generated/server'

const TABLES = [
  'setlistItems',
  'setlists',
  'jamMembers',
  'jamRooms',
  'parts',
  'sections',
  'versionChordShapes',
  'versions',
  'songs',
  'importDrafts',
] as const

export const run = internalMutation({
  args: {},
  handler: async (ctx) => {
    let removed = 0
    for (const table of TABLES) {
      const rows = await ctx.db.query(table).take(40)
      for (const row of rows) {
        if (table === 'importDrafts' && 'storageId' in row && row.storageId)
          await ctx.storage.delete(row.storageId)
        await ctx.db.delete(row._id)
        removed += 1
      }
    }
    return { removed }
  },
})
