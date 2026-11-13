import type { Doc, Id } from '../_generated/dataModel'
import type { MutationCtx } from '../_generated/server'
import { cloneVersionTree, deleteSetlist, deleteVersionTree } from './cascade'
import { uniqueVersionName } from './songs'

export type Owner = { userId: string; bandId?: Id<'bands'> }

function sameOwner(version: Doc<'versions'>, owner: Owner) {
  if (owner.bandId) return version.bandId === owner.bandId
  return !version.bandId && version.createdBy === owner.userId
}

async function priorCopy(
  ctx: MutationCtx,
  version: Doc<'versions'>,
  owner: Owner,
) {
  const rows = await ctx.db
    .query('versions')
    .withIndex('by_song', (q) => q.eq('songId', version.songId))
    .collect()
  return rows.find(
    (row) => row.parentVersionId === version._id && sameOwner(row, owner),
  )
}

export async function copyVersion(
  ctx: MutationCtx,
  version: Doc<'versions'>,
  owner: Owner,
  fresh = false,
) {
  if (!fresh) {
    const existing = await priorCopy(ctx, version, owner)
    if (existing) return existing._id
  }
  const versionId = await cloneVersionTree(ctx, version, {
    songId: version.songId,
    name: await uniqueVersionName(ctx, version.songId, version.name, owner),
    createdBy: owner.userId,
    bandId: owner.bandId,
  })
  if (fresh) await ctx.db.patch(versionId, { parentVersionId: undefined })
  return versionId
}

export async function deleteVersion(
  ctx: MutationCtx,
  versionId: Id<'versions'>,
) {
  const version = await ctx.db.get(versionId)
  if (!version) return { songId: null, deletedSong: false }
  const songId = version.songId
  await deleteVersionTree(ctx, versionId)
  const left = await ctx.db
    .query('versions')
    .withIndex('by_song', (q) => q.eq('songId', songId))
    .collect()
  if (left.length === 0) {
    const song = await ctx.db.get(songId)
    if (song) await ctx.db.delete(songId)
    return { songId, deletedSong: true }
  }
  return { songId, deletedSong: false }
}

export async function moveVersion(
  ctx: MutationCtx,
  version: Doc<'versions'>,
  owner: Owner,
) {
  const versionId = await copyVersion(ctx, version, owner, true)
  await deleteVersion(ctx, version._id)
  return versionId
}

const BATCH = 25

export async function removeBand(ctx: MutationCtx, bandId: Id<'bands'>) {
  const versions = await ctx.db
    .query('versions')
    .withIndex('by_band', (q) => q.eq('bandId', bandId))
    .take(BATCH)
  for (const version of versions) await deleteVersion(ctx, version._id)
  if (versions.length === BATCH) return false

  const setlists = await ctx.db
    .query('setlists')
    .withIndex('by_band', (q) => q.eq('bandId', bandId))
    .take(BATCH)
  for (const setlist of setlists) await deleteSetlist(ctx, setlist._id)
  if (setlists.length === BATCH) return false

  const members = await ctx.db
    .query('bandMemberships')
    .withIndex('by_band', (q) => q.eq('bandId', bandId))
    .collect()
  for (const member of members) await ctx.db.delete(member._id)
  const band = await ctx.db.get(bandId)
  if (band) await ctx.db.delete(bandId)
  return true
}
