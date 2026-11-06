import { v } from 'convex/values'
import type { Infer } from 'convex/values'
import { internal } from './_generated/api'
import type { Doc, Id } from './_generated/dataModel'
import { internalMutation } from './_generated/server'
import type { MutationCtx } from './_generated/server'
import { deleteVersionTree } from './lib/cascade'

const BATCH = 25

const phase = v.union(
  v.literal('bands'),
  v.literal('songs'),
  v.literal('setlists'),
  v.literal('jam'),
  v.literal('drafts'),
  v.literal('user'),
)

type Phase = Infer<typeof phase>

async function deleteSong(ctx: MutationCtx, songId: Id<'songs'>) {
  const versions = await ctx.db
    .query('versions')
    .withIndex('by_song', (q) => q.eq('songId', songId))
    .collect()
  for (const version of versions) await deleteVersionTree(ctx, version._id)
  await ctx.db.delete(songId)
}

async function deleteSetlist(ctx: MutationCtx, setlistId: Id<'setlists'>) {
  const items = await ctx.db
    .query('setlistItems')
    .withIndex('by_setlist', (q) => q.eq('setlistId', setlistId))
    .collect()
  for (const item of items) await ctx.db.delete(item._id)
  await ctx.db.delete(setlistId)
}

function successor(members: Array<Doc<'bandMemberships'>>) {
  const byAge = [...members].sort((a, b) => a._creationTime - b._creationTime)
  return (
    byAge.find((member) => member.role === 'owner') ??
    byAge.find((member) => member.role === 'editor') ??
    byAge.at(0)
  )
}

async function leaveBand(
  ctx: MutationCtx,
  row: Doc<'bandMemberships'>,
  clerkUserId: string,
) {
  const others = (
    await ctx.db
      .query('bandMemberships')
      .withIndex('by_band', (q) => q.eq('bandId', row.bandId))
      .collect()
  ).filter((member) => member.userId !== clerkUserId)
  await ctx.db.delete(row._id)

  const heir = successor(others)
  if (!heir) {
    await ctx.scheduler.runAfter(0, internal.accountCleanup.deleteBand, {
      bandId: row.bandId,
    })
    return
  }
  if (heir.role !== 'owner') await ctx.db.patch(heir._id, { role: 'owner' })
  const band = await ctx.db.get(row.bandId)
  if (band?.createdBy === clerkUserId)
    await ctx.db.patch(band._id, { createdBy: heir.userId })

  const songs = await ctx.db
    .query('songs')
    .withIndex('by_band', (q) => q.eq('bandId', row.bandId))
    .collect()
  for (const song of songs) {
    if (song.createdBy === clerkUserId)
      await ctx.db.patch(song._id, { createdBy: heir.userId })
    const versions = await ctx.db
      .query('versions')
      .withIndex('by_song', (q) => q.eq('songId', song._id))
      .collect()
    for (const version of versions)
      if (version.createdBy === clerkUserId)
        await ctx.db.patch(version._id, { createdBy: heir.userId })
  }
  const setlists = await ctx.db
    .query('setlists')
    .withIndex('by_band', (q) => q.eq('bandId', row.bandId))
    .collect()
  for (const setlist of setlists)
    if (setlist.ownerId === clerkUserId)
      await ctx.db.patch(setlist._id, { ownerId: heir.userId })
}

const steps: Record<
  Phase,
  (ctx: MutationCtx, clerkUserId: string) => Promise<Phase | null>
> = {
  bands: async (ctx, clerkUserId) => {
    const row = await ctx.db
      .query('bandMemberships')
      .withIndex('by_user', (q) => q.eq('userId', clerkUserId))
      .first()
    if (!row) return 'songs'
    await leaveBand(ctx, row, clerkUserId)
    return 'bands'
  },
  songs: async (ctx, clerkUserId) => {
    const songs = await ctx.db
      .query('songs')
      .withIndex('by_creator', (q) => q.eq('createdBy', clerkUserId))
      .filter((q) => q.eq(q.field('bandId'), undefined))
      .take(BATCH)
    for (const song of songs) await deleteSong(ctx, song._id)
    return songs.length === BATCH ? 'songs' : 'setlists'
  },
  setlists: async (ctx, clerkUserId) => {
    const setlists = await ctx.db
      .query('setlists')
      .withIndex('by_owner', (q) => q.eq('ownerId', clerkUserId))
      .filter((q) => q.eq(q.field('bandId'), undefined))
      .take(BATCH)
    for (const setlist of setlists) await deleteSetlist(ctx, setlist._id)
    return setlists.length === BATCH ? 'setlists' : 'jam'
  },
  jam: async (ctx, clerkUserId) => {
    const rooms = await ctx.db
      .query('jamRooms')
      .withIndex('by_host', (q) => q.eq('hostUserId', clerkUserId))
      .take(BATCH)
    for (const room of rooms) {
      const members = await ctx.db
        .query('jamMembers')
        .withIndex('by_room', (q) => q.eq('roomId', room._id))
        .collect()
      for (const member of members) await ctx.db.delete(member._id)
      await ctx.db.delete(room._id)
    }
    const memberships = await ctx.db
      .query('jamMembers')
      .withIndex('by_user', (q) => q.eq('userId', clerkUserId))
      .take(BATCH)
    for (const member of memberships) await ctx.db.delete(member._id)
    return rooms.length === BATCH || memberships.length === BATCH
      ? 'jam'
      : 'drafts'
  },
  drafts: async (ctx, clerkUserId) => {
    const drafts = await ctx.db
      .query('importDrafts')
      .withIndex('by_owner', (q) => q.eq('ownerId', clerkUserId))
      .take(BATCH)
    for (const draft of drafts) {
      if (draft.storageId) await ctx.storage.delete(draft.storageId)
      await ctx.db.delete(draft._id)
    }
    return drafts.length === BATCH ? 'drafts' : 'user'
  },
  user: async (ctx, clerkUserId) => {
    const user = await ctx.db
      .query('users')
      .withIndex('by_clerk', (q) => q.eq('clerkUserId', clerkUserId))
      .unique()
    if (!user) return null
    const credentials = await ctx.db
      .query('userAiCredentials')
      .withIndex('by_user', (q) => q.eq('userId', user._id))
      .collect()
    for (const credential of credentials) await ctx.db.delete(credential._id)
    await ctx.db.delete(user._id)
    return null
  },
}

export const run = internalMutation({
  args: { clerkUserId: v.string(), phase },
  handler: async (ctx, args) => {
    const next = await steps[args.phase](ctx, args.clerkUserId)
    if (next)
      await ctx.scheduler.runAfter(0, internal.accountCleanup.run, {
        clerkUserId: args.clerkUserId,
        phase: next,
      })
  },
})

export const deleteBand = internalMutation({
  args: { bandId: v.id('bands') },
  handler: async (ctx, args) => {
    const songs = await ctx.db
      .query('songs')
      .withIndex('by_band', (q) => q.eq('bandId', args.bandId))
      .take(BATCH)
    const setlists =
      songs.length < BATCH
        ? await ctx.db
            .query('setlists')
            .withIndex('by_band', (q) => q.eq('bandId', args.bandId))
            .take(BATCH - songs.length)
        : []
    for (const song of songs) await deleteSong(ctx, song._id)
    for (const setlist of setlists) await deleteSetlist(ctx, setlist._id)
    if (songs.length + setlists.length > 0) {
      await ctx.scheduler.runAfter(0, internal.accountCleanup.deleteBand, args)
      return
    }
    const members = await ctx.db
      .query('bandMemberships')
      .withIndex('by_band', (q) => q.eq('bandId', args.bandId))
      .collect()
    for (const member of members) await ctx.db.delete(member._id)
    const band = await ctx.db.get(args.bandId)
    if (band) await ctx.db.delete(band._id)
  },
})
