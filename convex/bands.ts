import { v } from 'convex/values'
import { internal } from './_generated/api'
import { internalMutation, mutation, query } from './_generated/server'
import type { Doc } from './_generated/dataModel'
import {
  bandNames,
  membership,
  openGate,
  requireIdentity,
  versionView,
} from './lib/access'
import { fail } from './lib/errors'
import { removeBand } from './lib/ownership'
import { handBand, successor } from './lib/membership'
import { withNames } from './lib/users'

export const list = query({
  args: {},
  handler: async (ctx) => {
    const identity = await requireIdentity(ctx)
    const rows = await ctx.db
      .query('bandMemberships')
      .withIndex('by_user', (q) => q.eq('userId', identity.subject))
      .collect()
    const bands = await Promise.all(
      rows.map(async (row) => {
        const band = await ctx.db.get(row.bandId)
        if (!band) return []
        const members = await ctx.db
          .query('bandMemberships')
          .withIndex('by_band', (q) => q.eq('bandId', band._id))
          .collect()
        const owned = await ctx.db
          .query('versions')
          .withIndex('by_band', (q) => q.eq('bandId', band._id))
          .collect()
        const songIds = new Set(owned.map((version) => version.songId))
        return [
          {
            membership: row,
            band,
            memberCount: members.length,
            songCount: songIds.size,
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
    const members = await withNames(
      ctx,
      await ctx.db
        .query('bandMemberships')
        .withIndex('by_band', (q) => q.eq('bandId', band._id))
        .collect(),
    )
    const setlists = await ctx.db
      .query('setlists')
      .withIndex('by_band', (q) => q.eq('bandId', band._id))
      .collect()
    const owned = await ctx.db
      .query('versions')
      .withIndex('by_band', (q) => q.eq('bandId', band._id))
      .collect()
    const gate = await openGate(ctx, identity.subject)
    const names = await bandNames(ctx, [band._id])
    const rows = new Map<
      string,
      { song: Doc<'songs'>; versions: Array<ReturnType<typeof versionView>> }
    >()
    for (const version of owned) {
      const song = await ctx.db.get(version.songId)
      if (!song) continue
      const row = rows.get(song._id) ?? { song, versions: [] }
      row.versions.push(versionView(version, gate, names))
      rows.set(song._id, row)
    }
    const catalog = [...rows.values()].sort((a, b) =>
      a.song.title.localeCompare(b.song.title),
    )
    const rank = { owner: 0, editor: 1, viewer: 2 }
    return {
      band,
      members: members.sort(
        (a, b) => rank[a.role] - rank[b.role] || a.name.localeCompare(b.name),
      ),
      songs: catalog,
      setlistCount: setlists.length,
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
    await ctx.db.insert('bandMemberships', {
      bandId,
      userId: identity.subject,
      role: 'owner',
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
    await ctx.db.insert('bandMemberships', {
      bandId: args.bandId,
      userId: user.clerkUserId,
      role: args.role,
    })
  },
})

export const removeMember = mutation({
  args: { membershipId: v.id('bandMemberships') },
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

export const leave = mutation({
  args: { bandId: v.id('bands') },
  handler: async (ctx, args) => {
    const identity = await requireIdentity(ctx)
    const mine = await membership(ctx.db, args.bandId, identity.subject)
    if (!mine) return
    const others = (
      await ctx.db
        .query('bandMemberships')
        .withIndex('by_band', (q) => q.eq('bandId', args.bandId))
        .collect()
    ).filter((member) => member.userId !== identity.subject)
    if (others.length === 0) fail('LAST_MEMBER')
    if (mine.role === 'owner') {
      const heir = successor(others)
      if (!heir) fail('LAST_MEMBER')
      await handBand(ctx, args.bandId, identity.subject, heir)
    }
    await ctx.db.delete(mine._id)
  },
})

export const remove = mutation({
  args: { bandId: v.id('bands') },
  handler: async (ctx, args) => {
    const identity = await requireIdentity(ctx)
    const mine = await membership(ctx.db, args.bandId, identity.subject)
    if (!mine || mine.role !== 'owner') fail('FORBIDDEN')
    await ctx.scheduler.runAfter(0, internal.bands.release, {
      bandId: args.bandId,
    })
  },
})

export const release = internalMutation({
  args: { bandId: v.id('bands') },
  handler: async (ctx, args) => {
    const done = await removeBand(ctx, args.bandId)
    if (!done)
      await ctx.scheduler.runAfter(0, internal.bands.release, {
        bandId: args.bandId,
      })
  },
})
