import { v } from 'convex/values'
import { mutation, query } from './_generated/server'
import { membership, requireIdentity } from './lib/access'
import { fail } from './lib/errors'

export const list = query({
  args: {},
  handler: async (ctx) => {
    const identity = await requireIdentity(ctx)
    const rows = await ctx.db
      .query('memberships')
      .withIndex('by_user', (q) => q.eq('userId', identity.subject))
      .collect()
    const bands = await Promise.all(
      rows.map(async (row) => {
        const band = await ctx.db.get(row.bandId)
        if (!band) return []
        const members = await ctx.db
          .query('memberships')
          .withIndex('by_band', (q) => q.eq('bandId', band._id))
          .collect()
        const songs = await ctx.db
          .query('songs')
          .withIndex('by_band', (q) => q.eq('bandId', band._id))
          .collect()
        return [
          {
            membership: row,
            band,
            memberCount: members.length,
            songCount: songs.length,
          },
        ]
      }),
    )
    return bands.flat().sort((a, b) => a.band.name.localeCompare(b.band.name))
  },
})

export const get = query({
  args: { bandId: v.id('bands') },
  handler: async (ctx, args) => {
    const identity = await requireIdentity(ctx)
    const band = await ctx.db.get(args.bandId)
    if (!band) fail('NOT_FOUND')
    const mine = await membership(ctx.db, band._id, identity.subject)
    if (!mine) fail('FORBIDDEN')
    const members = await ctx.db
      .query('memberships')
      .withIndex('by_band', (q) => q.eq('bandId', band._id))
      .collect()
    const songs = await ctx.db
      .query('songs')
      .withIndex('by_band', (q) => q.eq('bandId', band._id))
      .collect()
    const catalog = await Promise.all(
      songs
        .sort((a, b) => a.title.localeCompare(b.title))
        .map(async (song) => ({
          song,
          versions: await ctx.db
            .query('versions')
            .withIndex('by_song', (q) => q.eq('songId', song._id))
            .collect(),
        })),
    )
    const rank = { owner: 0, editor: 1, viewer: 2 }
    return {
      band,
      members: members.sort(
        (a, b) => rank[a.role] - rank[b.role] || a.name.localeCompare(b.name),
      ),
      songs: catalog,
      role: mine.role,
      me: identity.subject,
    }
  },
})

export const create = mutation({
  args: { name: v.string() },
  handler: async (ctx, args) => {
    const identity = await requireIdentity(ctx)
    const bandId = await ctx.db.insert('bands', {
      name: args.name.trim() || 'Band',
      createdBy: identity.subject,
    })
    await ctx.db.insert('memberships', {
      bandId,
      userId: identity.subject,
      role: 'owner',
      name: identity.name ?? 'Owner',
    })
    return bandId
  },
})

export const addMember = mutation({
  args: {
    bandId: v.id('bands'),
    email: v.string(),
    role: v.union(v.literal('editor'), v.literal('viewer')),
  },
  handler: async (ctx, args) => {
    const identity = await requireIdentity(ctx)
    const mine = await membership(ctx.db, args.bandId, identity.subject)
    if (!mine || mine.role !== 'owner') fail('FORBIDDEN')
    const user = await ctx.db
      .query('users')
      .withIndex('by_email', (q) =>
        q.eq('email', args.email.trim().toLowerCase()),
      )
      .unique()
    if (!user) fail('USER_NOT_FOUND')
    const existing = await membership(ctx.db, args.bandId, user.clerkUserId)
    if (existing) {
      await ctx.db.patch(existing._id, { role: args.role })
      return
    }
    await ctx.db.insert('memberships', {
      bandId: args.bandId,
      userId: user.clerkUserId,
      role: args.role,
      name: user.name,
    })
  },
})

export const removeMember = mutation({
  args: { membershipId: v.id('memberships') },
  handler: async (ctx, args) => {
    const identity = await requireIdentity(ctx)
    const row = await ctx.db.get(args.membershipId)
    if (!row) return
    const mine = await membership(ctx.db, row.bandId, identity.subject)
    if (!mine || mine.role !== 'owner' || row.role === 'owner')
      fail('FORBIDDEN')
    await ctx.db.delete(row._id)
  },
})
