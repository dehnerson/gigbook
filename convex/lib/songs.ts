import type { Id } from '../_generated/dataModel'
import type { MutationCtx, QueryCtx } from '../_generated/server'

export type SongScope = { userId: string; bandId?: Id<'bands'> }

export async function findSongByTitle(
  ctx: QueryCtx,
  scope: SongScope,
  title: string,
) {
  if (scope.bandId) {
    const bandId = scope.bandId
    return ctx.db
      .query('songs')
      .withIndex('by_band_title', (q) =>
        q.eq('bandId', bandId).eq('title', title),
      )
      .first()
  }
  return ctx.db
    .query('songs')
    .withIndex('by_creator_title', (q) =>
      q
        .eq('createdBy', scope.userId)
        .eq('bandId', undefined)
        .eq('title', title),
    )
    .first()
}

export async function insertSong(
  ctx: MutationCtx,
  fields: {
    title: string
    subTitle?: string
    createdBy: string
    bandId?: Id<'bands'>
  },
) {
  return ctx.db.insert('songs', {
    ...fields,
  })
}

export async function uniqueVersionName(
  ctx: QueryCtx,
  songId: Id<'songs'>,
  name: string,
) {
  const versions = await ctx.db
    .query('versions')
    .withIndex('by_song', (q) => q.eq('songId', songId))
    .collect()
  const taken = new Set(versions.map((version) => version.name.toLowerCase()))
  if (!taken.has(name.toLowerCase())) return name
  let index = 2
  while (taken.has(`${name} ${index}`.toLowerCase())) index += 1
  return `${name} ${index}`
}
