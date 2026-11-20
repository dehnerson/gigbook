import type { Id } from '../_generated/dataModel'
import type { QueryCtx } from '../_generated/server'
import { membership } from './access'

export const PERSONAL = 'personal'

export type HomeRecord = {
  bandId: Id<'bands'> | null
  name: string
  role: 'owner' | 'editor' | 'viewer'
}

type DbCtx = { db: QueryCtx['db'] }

export async function loadHome(
  ctx: DbCtx,
  userId: string,
  bandId: Id<'bands'> | null,
): Promise<HomeRecord | null> {
  if (!bandId) {
    return { bandId: null, name: '', role: 'owner' }
  }
  const band = await ctx.db.get(bandId)
  if (!band) return null
  const mine = await membership(ctx.db, band._id, userId)
  if (!mine) return null
  return {
    bandId: band._id,
    name: band.name,
    role: mine.role,
  }
}
