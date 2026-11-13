import { v } from 'convex/values'
import type { Infer } from 'convex/values'
import { internal } from './_generated/api'
import type { Doc } from './_generated/dataModel'
import { internalMutation } from './_generated/server'
import type { MutationCtx } from './_generated/server'
import { deleteSetlist } from './lib/cascade'
import { handBand, successor } from './lib/membership'
import { deleteVersion, removeBand } from './lib/ownership'

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
  const heir = successor(others)
  if (!heir) return false
  await handBand(ctx, row.bandId, clerkUserId, heir)
  await ctx.db.delete(row._id)
  return true
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
    const handed = await leaveBand(ctx, row, clerkUserId)
    if (!handed) await removeBand(ctx, row.bandId)
    return 'bands'
  },
  songs: async (ctx, clerkUserId) => {
    const versions = (
      await ctx.db
        .query('versions')
        .withIndex('by_creator', (q) => q.eq('createdBy', clerkUserId))
        .collect()
    ).filter((version) => !version.bandId)
    const batch = versions.slice(0, BATCH)
    for (const version of batch) await deleteVersion(ctx, version._id)
    return batch.length === BATCH ? 'songs' : 'setlists'
  },
  setlists: async (ctx, clerkUserId) => {
    const setlists = await ctx.db
      .query('setlists')
      .withIndex('by_creator', (q) => q.eq('createdBy', clerkUserId))
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
    const shapes = await ctx.db
      .query('userChordShapes')
      .withIndex('by_user', (q) => q.eq('userId', clerkUserId))
      .take(BATCH)
    for (const shape of shapes) await ctx.db.delete(shape._id)
    if (shapes.length === BATCH) return 'user'
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
