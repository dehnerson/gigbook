import type { Id } from '../_generated/dataModel'
import type { MutationCtx, QueryCtx } from '../_generated/server'

export type VersionOwner = { userId: string; bandId?: Id<'bands'> }

export async function insertSong(
  ctx: MutationCtx,
  fields: {
    title: string
    subTitle?: string
    createdBy: string
  },
) {
  return ctx.db.insert('songs', fields)
}

export async function uniqueVersionName(
  ctx: QueryCtx,
  songId: Id<'songs'>,
  name: string,
  owner: VersionOwner,
) {
  const versions = await ctx.db
    .query('versions')
    .withIndex('by_song', (q) => q.eq('songId', songId))
    .collect()
  const taken = new Set(
    versions
      .filter((version) =>
        owner.bandId
          ? version.bandId === owner.bandId
          : !version.bandId && version.createdBy === owner.userId,
      )
      .map((version) => version.name.toLowerCase()),
  )
  if (!taken.has(name.toLowerCase())) return name
  let index = 2
  while (taken.has(`${name} ${index}`.toLowerCase())) index += 1
  return `${name} ${index}`
}
