import { getAuthUserId } from '@convex-dev/auth/server'
import { vGoogleProfile } from '@convex-dev/auth/methods/google/server'
import { v } from 'convex/values'
import { components } from './_generated/api'
import type { Id } from './_generated/dataModel'
import {
  internalMutation,
  internalQuery,
  mutation,
  query,
} from './_generated/server'
import type { MutationCtx, QueryCtx } from './_generated/server'
import { requireIdentity } from './lib/access'
import { decryptSecret, encryptSecret } from './lib/crypto'
import { fail } from './lib/errors'
import { aiProvider } from './schema'
import { DEFAULT_MODEL, modelById, pickModel } from '../src/lib/import/models'
import type { AiProvider } from '../src/lib/import/models'

type OauthProfile = {
  email?: string
  emailVerified?: boolean
  name?: string
  picture?: string
}

function userById(ctx: QueryCtx | MutationCtx, userId: string) {
  const id = ctx.db.normalizeId('users', userId)
  return id ? ctx.db.get(id) : null
}

function verifiedOauthEmail(profile: OauthProfile) {
  if (profile.emailVerified === false) return undefined
  const email = profile.email?.trim().toLowerCase()
  return email || undefined
}

/** The password account that already verified this address, if there is one. */
async function userForVerifiedEmail(ctx: MutationCtx, email: string) {
  const found = await ctx.runMutation(
    components.authEmail.verifiedEmails.lookupEmail,
    { email },
  )
  if (!found.success) {
    if (found.userError.error === 'RATE_LIMITED') fail('RATE_LIMIT')
    return null
  }
  return userById(ctx, found.userId)
}

async function reuseOrCreate(ctx: MutationCtx, profile: OauthProfile) {
  const email = verifiedOauthEmail(profile)
  const name = profile.name?.trim() || ''
  const existing = email ? await userForVerifiedEmail(ctx, email) : null
  if (existing) {
    await ctx.db.patch(existing._id, {
      name: existing.name || name || existing.name,
      imageUrl: existing.imageUrl ?? profile.picture,
      oauthEmail: email,
    })
    return existing._id
  }
  return ctx.db.insert('users', {
    name,
    imageUrl: profile.picture,
    oauthEmail: email,
  })
}

async function rememberOauth(
  ctx: MutationCtx,
  userId: Id<'users'>,
  profile: OauthProfile,
) {
  const email = verifiedOauthEmail(profile)
  const name = profile.name?.trim()
  const user = await ctx.db.get(userId)
  if (!user) return
  const patch: { name?: string; imageUrl?: string; oauthEmail?: string } = {}
  if (name && !user.name) patch.name = name
  if (profile.picture && !user.imageUrl) patch.imageUrl = profile.picture
  if (email) patch.oauthEmail = email
  if (patch.name || patch.imageUrl || patch.oauthEmail)
    await ctx.db.patch(userId, patch)
}

export const createFromEmailPassword = internalMutation({
  args: {
    method: v.object({
      name: v.literal('emailPassword'),
      profile: v.object({}),
    }),
  },
  returns: v.id('users'),
  handler: async (ctx) => ctx.db.insert('users', { name: '' }),
})

export const createFromGoogle = internalMutation({
  args: {
    method: v.object({
      name: v.literal('google'),
      profile: vGoogleProfile,
    }),
  },
  returns: v.id('users'),
  handler: async (ctx, args) => reuseOrCreate(ctx, args.method.profile),
})

export const rememberGoogle = internalMutation({
  args: {
    method: v.object({
      name: v.literal('google'),
      profile: vGoogleProfile,
    }),
    userId: v.id('users'),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    await rememberOauth(ctx, args.userId, args.method.profile)
    return null
  },
})

export const me = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx)
    if (!userId) return null
    const user = await ctx.db.get(userId)
    if (!user) return null
    const credentials = await credentialsOf(ctx, user._id)
    const model = pickModel(
      user.aiModel,
      credentials.map((item) => item.provider),
    )
    const email = await ctx.runQuery(
      components.authEmail.verifiedEmails.getPrimaryEmail,
      { userId },
    )
    return {
      locale: user.locale ?? null,
      notation: user.notation ?? 'en',
      email: email ?? user.oauthEmail ?? null,
      name: user.name,
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
    const user = await userById(ctx, identity.subject)
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
    const user = await userById(ctx, identity.subject)
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
    const user = await userById(ctx, identity.subject)
    if (!user) return
    const existing = await credentialFor(ctx, user._id, args.provider)
    if (existing) await ctx.db.delete(existing._id)
  },
})

export const setAiModel = mutation({
  args: { model: v.string() },
  handler: async (ctx, args) => {
    const identity = await requireIdentity(ctx)
    const user = await userById(ctx, identity.subject)
    if (!user) fail('NOT_FOUND')
    const model = modelById(args.model)
    if (!model) fail('INVALID')
    if (!(await credentialFor(ctx, user._id, model.provider)))
      fail('NO_API_KEY')
    await ctx.db.patch(user._id, { aiModel: model.id })
  },
})

export const internalReadAi = internalQuery({
  args: { userId: v.string(), provider: v.optional(aiProvider) },
  handler: async (ctx, args) => {
    if (!args.provider) return readAiKey(ctx, args.userId)
    const user = await userById(ctx, args.userId)
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

export async function readAiKey(ctx: QueryCtx, userId: string) {
  const user = await userById(ctx, userId)
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
