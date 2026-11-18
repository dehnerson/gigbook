import { v } from 'convex/values'
import { internal } from './_generated/api'
import type { Id } from './_generated/dataModel'
import {
  action,
  internalMutation,
  internalQuery,
  query,
} from './_generated/server'
import { membership, requireIdentity } from './lib/access'
import { clerk } from './lib/clerkApi'
import { roleToClerk } from './lib/clerkRoles'
import { fail } from './lib/errors'
import { removeBand } from './lib/ownership'
import { successor } from './lib/membership'
import { PERSONAL, loadHome } from './lib/home'
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
        return [{ membership: row, band, memberCount: members.length }]
      }),
    )
    return bands.flat().sort((a, b) => a.band.name.localeCompare(b.band.name))
  },
})

export const resolve = query({
  args: { workspace: v.string() },
  handler: async (ctx, args) => {
    const identity = await requireIdentity(ctx)
    if (args.workspace === PERSONAL)
      return loadHome(ctx, identity.subject, null)
    const bandId = ctx.db.normalizeId('bands', args.workspace)
    if (!bandId) return null
    return loadHome(ctx, identity.subject, bandId)
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
    return {
      band,
      members: members.sort(
        (a, b) => rank[a.role] - rank[b.role] || a.name.localeCompare(b.name),
      ),
      role: mine.role,
      me: identity.subject,
    }
  },
})

export const ownerRecord = internalQuery({
  args: { bandId: v.id('bands') },
  handler: async (ctx, args) => {
    const identity = await requireIdentity(ctx)
    const band = await ctx.db.get(args.bandId)
    if (!band) fail('NOT_FOUND')
    const mine = await membership(ctx.db, band._id, identity.subject)
    if (!mine || mine.role !== 'owner') fail('FORBIDDEN')
    return {
      userId: identity.subject,
      organizationId: band.clerkOrganizationId,
      bandId: band._id,
    }
  },
})

export const leaveRecord = internalQuery({
  args: { bandId: v.id('bands') },
  handler: async (ctx, args) => {
    const identity = await requireIdentity(ctx)
    const band = await ctx.db.get(args.bandId)
    if (!band) fail('NOT_FOUND')
    const mine = await membership(ctx.db, band._id, identity.subject)
    if (!mine) fail('NOT_FOUND')
    const others = (
      await ctx.db
        .query('bandMemberships')
        .withIndex('by_band', (q) => q.eq('bandId', band._id))
        .collect()
    ).filter((member) => member.userId !== identity.subject)
    if (others.length === 0) fail('LAST_MEMBER')
    const heir = mine.role === 'owner' ? successor(others) : null
    if (mine.role === 'owner' && !heir) fail('LAST_MEMBER')
    return {
      userId: identity.subject,
      organizationId: band.clerkOrganizationId,
      heirUserId: heir?.userId ?? null,
    }
  },
})

function clerkFailed(error: unknown): never {
  console.error(error)
  fail('INVALID')
}

export const create = action({
  args: { name: v.string() },
  handler: async (
    ctx,
    args,
  ): Promise<{ bandId: Id<'bands'>; organizationId: string }> => {
    const identity = await ctx.auth.getUserIdentity()
    if (!identity) fail('UNAUTHENTICATED')
    const name = args.name.trim() || 'Band'
    let org: { id: string; name: string }
    try {
      org = await clerk('/organizations', 'POST', {
        name,
        created_by: identity.subject,
      })
    } catch (error) {
      clerkFailed(error)
    }
    const bandId: Id<'bands'> = await ctx.runMutation(
      internal.clerkSync.upsertOrganization,
      {
        clerkOrganizationId: org.id,
        name: org.name || name,
        createdBy: identity.subject,
      },
    )
    return { bandId, organizationId: org.id }
  },
})

export const invite = action({
  args: {
    bandId: v.id('bands'),
    email: v.string(),
    role: v.union(v.literal('editor'), v.literal('viewer')),
    redirectUrl: v.string(),
  },
  handler: async (ctx, args) => {
    const gate = await ctx.runQuery(internal.bands.ownerRecord, {
      bandId: args.bandId,
    })
    const email = args.email.trim().toLowerCase()
    if (!email || !/^https?:\/\//.test(args.redirectUrl)) fail('INVALID')
    try {
      await clerk(`/organizations/${gate.organizationId}/invitations`, 'POST', {
        email_address: email,
        role: roleToClerk(args.role),
        inviter_user_id: gate.userId,
        redirect_url: args.redirectUrl,
      })
    } catch (error) {
      clerkFailed(error)
    }
  },
})

export const memberRecord = internalQuery({
  args: { membershipId: v.id('bandMemberships') },
  handler: async (ctx, args) => {
    const identity = await requireIdentity(ctx)
    const row = await ctx.db.get(args.membershipId)
    if (!row) fail('NOT_FOUND')
    const band = await ctx.db.get(row.bandId)
    if (!band) fail('NOT_FOUND')
    const mine = await membership(ctx.db, band._id, identity.subject)
    if (!mine || mine.role !== 'owner' || row.role === 'owner')
      fail('FORBIDDEN')
    return {
      userId: row.userId,
      bandId: band._id,
      organizationId: band.clerkOrganizationId,
    }
  },
})

export const removeMember = action({
  args: { membershipId: v.id('bandMemberships') },
  handler: async (ctx, args) => {
    const row = await ctx.runQuery(internal.bands.memberRecord, {
      membershipId: args.membershipId,
    })
    try {
      await clerk(
        `/organizations/${row.organizationId}/memberships/${row.userId}`,
        'DELETE',
      )
    } catch (error) {
      clerkFailed(error)
    }
    await ctx.runMutation(internal.clerkSync.dropMember, {
      bandId: row.bandId,
      userId: row.userId,
    })
  },
})

export const leave = action({
  args: { bandId: v.id('bands') },
  handler: async (ctx, args) => {
    const plan = await ctx.runQuery(internal.bands.leaveRecord, {
      bandId: args.bandId,
    })
    try {
      if (plan.heirUserId) {
        await clerk(
          `/organizations/${plan.organizationId}/memberships/${plan.heirUserId}`,
          'PATCH',
          { role: 'org:admin' },
        )
      }
      await clerk(
        `/organizations/${plan.organizationId}/memberships/${plan.userId}`,
        'DELETE',
      )
    } catch (error) {
      clerkFailed(error)
    }
    await ctx.runMutation(internal.clerkSync.dropMember, {
      bandId: args.bandId,
      userId: plan.userId,
    })
  },
})

export const remove = action({
  args: { bandId: v.id('bands') },
  handler: async (ctx, args) => {
    const gate = await ctx.runQuery(internal.bands.ownerRecord, {
      bandId: args.bandId,
    })
    try {
      await clerk(`/organizations/${gate.organizationId}`, 'DELETE')
    } catch (error) {
      clerkFailed(error)
    }
    await ctx.runMutation(internal.bands.release, { bandId: args.bandId })
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
