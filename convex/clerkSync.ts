import { makeFunctionReference } from 'convex/server'
import { v } from 'convex/values'
import type { Id } from './_generated/dataModel'
import { internalMutation } from './_generated/server'
import type { MutationCtx } from './_generated/server'
import { membership } from './lib/access'
import { roleFromClerk } from './lib/clerkRoles'
import { handBand, successor } from './lib/membership'

const releaseBand = makeFunctionReference<'mutation', { bandId: Id<'bands'> }>(
  'bands:release',
)

async function bandByClerk(ctx: MutationCtx, clerkOrganizationId: string) {
  return ctx.db
    .query('bands')
    .withIndex('by_clerk', (q) =>
      q.eq('clerkOrganizationId', clerkOrganizationId),
    )
    .unique()
}

export async function ensureBand(
  ctx: MutationCtx,
  clerkOrganizationId: string,
  name: string,
  createdBy?: string,
) {
  const label = name.trim() || 'Band'
  let band = await bandByClerk(ctx, clerkOrganizationId)
  if (!band) {
    const bandId = await ctx.db.insert('bands', {
      name: label,
      createdBy: createdBy ?? '',
      clerkOrganizationId,
    })
    band = await ctx.db.get(bandId)
  } else if (band.name !== label && name.trim()) {
    await ctx.db.patch(band._id, { name: label })
  }
  if (!band) throw new Error('Band missing')
  if (createdBy) {
    if (!band.createdBy) await ctx.db.patch(band._id, { createdBy })
    const existing = await membership(ctx.db, band._id, createdBy)
    if (!existing) {
      await ctx.db.insert('bandMemberships', {
        bandId: band._id,
        userId: createdBy,
        role: 'owner',
      })
    }
  }
  return band._id
}

export async function dropMembership(
  ctx: MutationCtx,
  bandId: Id<'bands'>,
  userId: string,
) {
  const row = await membership(ctx.db, bandId, userId)
  if (!row) return
  if (row.role === 'owner') {
    const others = (
      await ctx.db
        .query('bandMemberships')
        .withIndex('by_band', (q) => q.eq('bandId', bandId))
        .collect()
    ).filter((member) => member.userId !== userId)
    const heir = successor(others)
    if (!heir) {
      await ctx.scheduler.runAfter(0, releaseBand, { bandId })
      return
    }
    await handBand(ctx, bandId, userId, heir)
  }
  await ctx.db.delete(row._id)
}

export const upsertOrganization = internalMutation({
  args: {
    clerkOrganizationId: v.string(),
    name: v.string(),
    createdBy: v.optional(v.string()),
  },
  returns: v.id('bands'),
  handler: async (ctx, args) =>
    ensureBand(ctx, args.clerkOrganizationId, args.name, args.createdBy),
})

export const applyMembership = internalMutation({
  args: {
    clerkOrganizationId: v.string(),
    organizationName: v.string(),
    userId: v.string(),
    role: v.string(),
    deleted: v.boolean(),
  },
  handler: async (ctx, args) => {
    if (args.deleted) {
      const band = await bandByClerk(ctx, args.clerkOrganizationId)
      if (band) await dropMembership(ctx, band._id, args.userId)
      return
    }
    const role = roleFromClerk(args.role)
    const bandId = await ensureBand(
      ctx,
      args.clerkOrganizationId,
      args.organizationName,
      role === 'owner' ? args.userId : undefined,
    )
    const existing = await membership(ctx.db, bandId, args.userId)
    if (existing) {
      if (existing.role !== role) await ctx.db.patch(existing._id, { role })
      return
    }
    await ctx.db.insert('bandMemberships', {
      bandId,
      userId: args.userId,
      role,
    })
  },
})

export const releaseOrganization = internalMutation({
  args: { clerkOrganizationId: v.string() },
  handler: async (ctx, args) => {
    const band = await bandByClerk(ctx, args.clerkOrganizationId)
    if (!band) return
    await ctx.scheduler.runAfter(0, releaseBand, { bandId: band._id })
  },
})

export const dropMember = internalMutation({
  args: { bandId: v.id('bands'), userId: v.string() },
  handler: async (ctx, args) => dropMembership(ctx, args.bandId, args.userId),
})
