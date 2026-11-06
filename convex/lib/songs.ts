import type { Id } from '../_generated/dataModel'
import type { MutationCtx, QueryCtx } from '../_generated/server'
import { songKey } from '../../src/lib/song-key'

export type SongScope = { userId: string; bandId?: Id<'bands'> }

export async function findSongByKey(
  ctx: QueryCtx,
  scope: SongScope,
  key: string,
) {
  if (scope.bandId) {
    const bandId = scope.bandId
    return ctx.db
      .query('songs')
      .withIndex('by_band_key', (q) => q.eq('bandId', bandId).eq('key', key))
      .first()
  }
  return ctx.db
    .query('songs')
    .withIndex('by_creator_key', (q) =>
      q.eq('createdBy', scope.userId).eq('bandId', undefined).eq('key', key),
    )
    .first()
}

export async function insertSong(
  ctx: MutationCtx,
  fields: {
    title: string
    artist: string
    createdBy: string
    bandId?: Id<'bands'>
  },
) {
  return ctx.db.insert('songs', {
    ...fields,
    key: songKey(fields.title, fields.artist),
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
