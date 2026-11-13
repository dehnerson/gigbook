import type { Doc, Id } from '../_generated/dataModel'
import type { MutationCtx } from '../_generated/server'

export async function handBand(
  ctx: MutationCtx,
  bandId: Id<'bands'>,
  fromUserId: string,
  heir: Doc<'bandMemberships'>,
) {
  if (heir.role !== 'owner') await ctx.db.patch(heir._id, { role: 'owner' })
  const band = await ctx.db.get(bandId)
  if (band?.createdBy === fromUserId)
    await ctx.db.patch(band._id, { createdBy: heir.userId })
  const setlists = await ctx.db
    .query('setlists')
    .withIndex('by_band', (q) => q.eq('bandId', bandId))
    .collect()
  for (const setlist of setlists)
    if (setlist.createdBy === fromUserId)
      await ctx.db.patch(setlist._id, { createdBy: heir.userId })
}

export function successor(members: Array<Doc<'bandMemberships'>>) {
  const byAge = [...members].sort((a, b) => a._creationTime - b._creationTime)
  return (
    byAge.find((member) => member.role === 'owner') ??
    byAge.find((member) => member.role === 'editor') ??
    byAge.at(0)
  )
}
