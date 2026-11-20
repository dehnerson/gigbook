import { getAuthUserId } from '@convex-dev/auth/server'
import { v } from 'convex/values'
import { internal } from './_generated/api'
import type { Id } from './_generated/dataModel'
import { internalMutation, mutation, query } from './_generated/server'
import type { MutationCtx, QueryCtx } from './_generated/server'
import { membership, requireIdentity } from './lib/access'
import { fail } from './lib/errors'
import { sendInvite } from './lib/mail'
import { handBand, successor } from './lib/membership'
import { removeBand } from './lib/ownership'
import { displayName, sessionAddresses, withNames } from './lib/users'

const INVITE_MS = 14 * 24 * 60 * 60 * 1000

function inviteByToken(ctx: QueryCtx | MutationCtx, token: string) {
  return ctx.db
    .query('invitations')
    .withIndex('by_token', (q) => q.eq('token', token))
    .unique()
}

async function ownerOf(ctx: QueryCtx | MutationCtx, bandId: Id<'bands'>) {
  const identity = await requireIdentity(ctx)
  const band = await ctx.db.get(bandId)
  if (!band) fail('NOT_FOUND')
  const mine = await membership(ctx.db, band._id, identity.subject)
  if (!mine || mine.role !== 'owner') fail('FORBIDDEN')
  return { identity, band, mine }
}

async function leaveRow(
  ctx: MutationCtx,
  row: {
    _id: Id<'bandMemberships'>
    bandId: Id<'bands'>
    userId: string
    role: string
  },
) {
  const others = (
    await ctx.db
      .query('bandMemberships')
      .withIndex('by_band', (q) => q.eq('bandId', row.bandId))
      .collect()
  ).filter((member) => member.userId !== row.userId)
  if (others.length === 0) fail('LAST_MEMBER')
  if (row.role === 'owner') {
    const heir = successor(others)
    if (!heir) fail('LAST_MEMBER')
    await handBand(ctx, row.bandId, row.userId, heir)
  }
  await ctx.db.delete(row._id)
}

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
        return [{ membership: row, band, memberCount: members.length }]
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
    const rank = { owner: 0, editor: 1, viewer: 2 }
    const invites =
      mine.role === 'owner'
        ? (
            await ctx.db
              .query('invitations')
              .withIndex('by_band', (q) => q.eq('bandId', band._id))
              .collect()
          ).filter((invite) => invite.expiresAt > Date.now())
        : []
    return {
      band,
      members: members.sort(
        (a, b) => rank[a.role] - rank[b.role] || a.name.localeCompare(b.name),
      ),
      role: mine.role,
      me: identity.subject,
      invites: invites.map((invite) => ({
        _id: invite._id,
        email: invite.email,
        role: invite.role,
      })),
    }
  },
})

export const create = mutation({
  args: { name: v.string() },
  handler: async (ctx, args) => {
    const identity = await requireIdentity(ctx)
    const name = args.name.trim() || 'Band'
    const bandId = await ctx.db.insert('bands', {
      name,
      createdBy: identity.subject,
    })
    await ctx.db.insert('bandMemberships', {
      bandId,
      userId: identity.subject,
      role: 'owner',
    })
    return { bandId }
  },
})

export const invite = mutation({
  args: {
    bandId: v.id('bands'),
    email: v.string(),
    role: v.union(v.literal('editor'), v.literal('viewer')),
  },
  handler: async (ctx, args) => {
    const { identity, band } = await ownerOf(ctx, args.bandId)
    const email = args.email.trim().toLowerCase()
    if (!email.includes('@')) fail('INVALID')
    const inviter = (await displayName(ctx, identity.subject)) || 'Someone'
    const existing = await ctx.db
      .query('invitations')
      .withIndex('by_band_email', (q) =>
        q.eq('bandId', band._id).eq('email', email),
      )
      .unique()
    if (existing) await ctx.db.delete(existing._id)
    const token = crypto.randomUUID().replaceAll('-', '')
    await ctx.db.insert('invitations', {
      bandId: band._id,
      email,
      role: args.role,
      token,
      expiresAt: Date.now() + INVITE_MS,
    })
    await sendInvite(ctx, {
      to: email,
      band: band.name,
      token,
      inviter,
    })
  },
})

export const revoke = mutation({
  args: { invitationId: v.id('invitations') },
  handler: async (ctx, args) => {
    const row = await ctx.db.get(args.invitationId)
    if (!row) return
    await ownerOf(ctx, row.bandId)
    await ctx.db.delete(row._id)
  },
})

export const preview = query({
  args: { token: v.string() },
  handler: async (ctx, args) => {
    const row = await inviteByToken(ctx, args.token)
    if (!row || row.expiresAt <= Date.now()) return null
    const band = await ctx.db.get(row.bandId)
    if (!band) return null
    const userId = await getAuthUserId(ctx)
    const addresses = userId ? await sessionAddresses(ctx, userId) : []
    return {
      bandName: band.name,
      email: row.email,
      role: row.role,
      signedIn: Boolean(userId),
      emailMatches: addresses.includes(row.email),
    }
  },
})

export const accept = mutation({
  args: { token: v.string() },
  handler: async (ctx, args) => {
    const identity = await requireIdentity(ctx)
    const row = await inviteByToken(ctx, args.token)
    if (!row || row.expiresAt <= Date.now()) fail('NOT_FOUND')
    const addresses = await sessionAddresses(ctx, identity.subject)
    if (!addresses.includes(row.email)) fail('FORBIDDEN')
    const existing = await membership(ctx.db, row.bandId, identity.subject)
    if (!existing) {
      await ctx.db.insert('bandMemberships', {
        bandId: row.bandId,
        userId: identity.subject,
        role: row.role,
      })
    }
    await ctx.db.delete(row._id)
    return { bandId: row.bandId }
  },
})

export const removeMember = mutation({
  args: { membershipId: v.id('bandMemberships') },
  handler: async (ctx, args) => {
    const row = await ctx.db.get(args.membershipId)
    if (!row) fail('NOT_FOUND')
    const { mine } = await ownerOf(ctx, row.bandId)
    if (row._id === mine._id || row.role === 'owner') fail('FORBIDDEN')
    await ctx.db.delete(row._id)
  },
})

export const leave = mutation({
  args: { bandId: v.id('bands') },
  handler: async (ctx, args) => {
    const identity = await requireIdentity(ctx)
    const row = await membership(ctx.db, args.bandId, identity.subject)
    if (!row) fail('NOT_FOUND')
    await leaveRow(ctx, row)
  },
})

export const remove = mutation({
  args: { bandId: v.id('bands') },
  handler: async (ctx, args) => {
    await ownerOf(ctx, args.bandId)
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
