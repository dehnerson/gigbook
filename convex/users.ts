import { v } from 'convex/values'
import { internal } from './_generated/api'
import {
  internalMutation,
  internalQuery,
  mutation,
  query,
} from './_generated/server'
import type { QueryCtx } from './_generated/server'
import { decryptSecret, encryptSecret } from './lib/crypto'
import { fail } from './lib/errors'
import { requireIdentity } from './lib/access'

function userByClerk(ctx: QueryCtx, clerkUserId: string) {
  return ctx.db
    .query('users')
    .withIndex('by_clerk', (q) => q.eq('clerkUserId', clerkUserId))
    .unique()
}

export const ensure = mutation({
  args: {},
  handler: async (ctx) => {
    const identity = await requireIdentity(ctx)
    const existing = await userByClerk(ctx, identity.subject)
    const email = identity.email?.toLowerCase()
    const name = identity.name ?? identity.email ?? 'Player'
    if (existing) {
      await ctx.db.patch(existing._id, {
        name,
        email,
        imageUrl: identity.pictureUrl ?? existing.imageUrl,
      })
      return existing._id
    }
    return ctx.db.insert('users', {
      clerkUserId: identity.subject,
      name,
      email,
      imageUrl: identity.pictureUrl,
    })
  },
})

export const upsertFromClerk = internalMutation({
  args: {
    clerkUserId: v.string(),
    name: v.string(),
    email: v.optional(v.string()),
    imageUrl: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const existing = await userByClerk(ctx, args.clerkUserId)
    const email = args.email?.toLowerCase()
    if (existing) {
      await ctx.db.patch(existing._id, {
        name: args.name,
        email: email ?? existing.email,
        imageUrl: args.imageUrl ?? existing.imageUrl,
      })
      return
    }
    await ctx.db.insert('users', {
      clerkUserId: args.clerkUserId,
      name: args.name,
      email,
      imageUrl: args.imageUrl,
    })
  },
})

export const deleteFromClerk = internalMutation({
  args: { clerkUserId: v.string() },
  handler: async (ctx, args) => {
    await ctx.scheduler.runAfter(0, internal.accountCleanup.run, {
      clerkUserId: args.clerkUserId,
      phase: 'bands',
    })
  },
})

export const me = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity()
    if (!identity) return null
    const user = await userByClerk(ctx, identity.subject)
    if (!user) return null
    const credential = await ctx.db
      .query('userAiCredentials')
      .withIndex('by_user', (q) => q.eq('userId', user._id))
      .unique()
    return {
      locale: user.locale ?? null,
      notation: user.notation ?? 'en',
      ai: credential
        ? { provider: credential.provider, last4: credential.last4 }
        : null,
    }
  },
})

export const setPreferences = mutation({
  args: {
    locale: v.optional(v.union(v.literal('en'), v.literal('de'))),
    notation: v.optional(v.union(v.literal('en'), v.literal('de'))),
  },
  handler: async (ctx, args) => {
    const identity = await requireIdentity(ctx)
    const user = await userByClerk(ctx, identity.subject)
    if (!user) fail('NOT_FOUND')
    await ctx.db.patch(user._id, {
      locale: args.locale ?? user.locale,
      notation: args.notation ?? user.notation,
    })
  },
})

export const saveAiKey = mutation({
  args: { apiKey: v.string() },
  handler: async (ctx, args) => {
    const identity = await requireIdentity(ctx)
    const key = args.apiKey.trim()
    if (key.length < 10) fail('INVALID')
    const user = await userByClerk(ctx, identity.subject)
    if (!user) fail('NOT_FOUND')
    const ciphertext = await encryptSecret(key)
    const last4 = key.slice(-4)
    const existing = await ctx.db
      .query('userAiCredentials')
      .withIndex('by_user', (q) => q.eq('userId', user._id))
      .unique()
    if (existing) {
      await ctx.db.patch(existing._id, {
        ciphertext,
        last4,
        provider: 'google',
      })
      return
    }
    await ctx.db.insert('userAiCredentials', {
      userId: user._id,
      provider: 'google',
      ciphertext,
      last4,
    })
  },
})

export const deleteAiKey = mutation({
  args: {},
  handler: async (ctx) => {
    const identity = await requireIdentity(ctx)
    const user = await userByClerk(ctx, identity.subject)
    if (!user) return
    const existing = await ctx.db
      .query('userAiCredentials')
      .withIndex('by_user', (q) => q.eq('userId', user._id))
      .unique()
    if (existing) await ctx.db.delete(existing._id)
  },
})

export const internalReadAiKey = internalQuery({
  args: { clerkUserId: v.string() },
  handler: async (ctx, args) => readAiKey(ctx, args.clerkUserId),
})

export async function readAiKey(ctx: QueryCtx, clerkUserId: string) {
  const user = await userByClerk(ctx, clerkUserId)
  if (!user) fail('NO_API_KEY')
  const credential = await ctx.db
    .query('userAiCredentials')
    .withIndex('by_user', (q) => q.eq('userId', user._id))
    .unique()
  if (!credential) fail('NO_API_KEY')
  return decryptSecret(credential.ciphertext)
}
