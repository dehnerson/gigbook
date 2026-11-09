import { v } from 'convex/values'
import { internal } from './_generated/api'
import {
  internalMutation,
  internalQuery,
  mutation,
  query,
} from './_generated/server'
import type { Id } from './_generated/dataModel'
import type { QueryCtx } from './_generated/server'
import { decryptSecret, encryptSecret } from './lib/crypto'
import { fail } from './lib/errors'
import { requireIdentity } from './lib/access'
import { aiProvider } from './schema'
import { DEFAULT_MODEL, modelById, pickModel } from '../src/lib/import/models'
import type { AiProvider } from '../src/lib/import/models'

function userByClerk(ctx: QueryCtx, clerkUserId: string) {
  return ctx.db
    .query('users')
    .withIndex('by_clerk', (q) => q.eq('clerkUserId', clerkUserId))
    .unique()
}

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
    const credentials = await credentialsOf(ctx, user._id)
    const model = pickModel(
      user.aiModel,
      credentials.map((item) => item.provider),
    )
    return {
      locale: user.locale ?? null,
      notation: user.notation ?? 'en',
      aiKeys: credentials.map((item) => ({
        provider: item.provider,
        last4: item.last4,
      })),
      ai: model
        ? {
            model: model.id,
            provider: model.provider,
            vision: model.vision,
            pdf: model.pdf,
          }
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

function credentialsOf(ctx: QueryCtx, userId: Id<'users'>) {
  return ctx.db
    .query('userAiCredentials')
    .withIndex('by_user', (q) => q.eq('userId', userId))
    .collect()
}

function credentialFor(
  ctx: QueryCtx,
  userId: Id<'users'>,
  provider: AiProvider,
) {
  return ctx.db
    .query('userAiCredentials')
    .withIndex('by_user_provider', (q) =>
      q.eq('userId', userId).eq('provider', provider),
    )
    .unique()
}

export const saveAiKey = mutation({
  args: { provider: aiProvider, apiKey: v.string() },
  handler: async (ctx, args) => {
    const identity = await requireIdentity(ctx)
    const key = args.apiKey.trim()
    if (key.length < 10) fail('INVALID')
    const user = await userByClerk(ctx, identity.subject)
    if (!user) fail('NOT_FOUND')
    const ciphertext = await encryptSecret(key)
    const last4 = key.slice(-4)
    const existing = await credentialFor(ctx, user._id, args.provider)
    if (existing) {
      await ctx.db.patch(existing._id, { ciphertext, last4 })
    } else {
      await ctx.db.insert('userAiCredentials', {
        userId: user._id,
        provider: args.provider,
        ciphertext,
        last4,
      })
    }
    const providers = (await credentialsOf(ctx, user._id)).map(
      (item) => item.provider,
    )
    const chosen = modelById(user.aiModel)
    if (!chosen || !providers.includes(chosen.provider))
      await ctx.db.patch(user._id, { aiModel: DEFAULT_MODEL[args.provider] })
  },
})

export const deleteAiKey = mutation({
  args: { provider: aiProvider },
  handler: async (ctx, args) => {
    const identity = await requireIdentity(ctx)
    const user = await userByClerk(ctx, identity.subject)
    if (!user) return
    const existing = await credentialFor(ctx, user._id, args.provider)
    if (existing) await ctx.db.delete(existing._id)
  },
})

export const setAiModel = mutation({
  args: { model: v.string() },
  handler: async (ctx, args) => {
    const identity = await requireIdentity(ctx)
    const user = await userByClerk(ctx, identity.subject)
    if (!user) fail('NOT_FOUND')
    const model = modelById(args.model)
    if (!model) fail('INVALID')
    if (!(await credentialFor(ctx, user._id, model.provider)))
      fail('NO_API_KEY')
    await ctx.db.patch(user._id, { aiModel: model.id })
  },
})

export const internalReadAi = internalQuery({
  args: { clerkUserId: v.string(), provider: v.optional(aiProvider) },
  handler: async (ctx, args) => {
    if (!args.provider) return readAiKey(ctx, args.clerkUserId)
    const user = await userByClerk(ctx, args.clerkUserId)
    if (!user) fail('NO_API_KEY')
    const credential = await credentialFor(ctx, user._id, args.provider)
    if (!credential) fail('NO_API_KEY')
    const chosen = modelById(user.aiModel)
    const model =
      chosen?.provider === args.provider
        ? chosen
        : modelById(DEFAULT_MODEL[args.provider])
    if (!model) fail('INVALID')
    return { model, apiKey: await decryptSecret(credential.ciphertext) }
  },
})

export async function readAiKey(ctx: QueryCtx, clerkUserId: string) {
  const user = await userByClerk(ctx, clerkUserId)
  if (!user) fail('NO_API_KEY')
  const credentials = await credentialsOf(ctx, user._id)
  const model = pickModel(
    user.aiModel,
    credentials.map((item) => item.provider),
  )
  const credential = credentials.find(
    (item) => item.provider === model?.provider,
  )
  if (!model || !credential) fail('NO_API_KEY')
  return { model, apiKey: await decryptSecret(credential.ciphertext) }
}
