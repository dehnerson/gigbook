import { getAuthUserId } from '@convex-dev/auth/server'
import { vGoogleProfile } from '@convex-dev/auth/methods/google/server'
import { v } from 'convex/values'
import { components, internal } from './_generated/api'
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
import { nameWithinLimit } from './lib/users'
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
      googleLinked: true,
    })
    return existing._id
  }
  return ctx.db.insert('users', {
    name,
    imageUrl: profile.picture,
    oauthEmail: email,
    googleLinked: true,
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
  const patch: {
    googleLinked: true
    name?: string
    imageUrl?: string
    oauthEmail?: string
  } = { googleLinked: true }
  if (name && !user.name) patch.name = name
  if (profile.picture && !user.imageUrl) patch.imageUrl = profile.picture
  if (email) patch.oauthEmail = email
  await ctx.db.patch(userId, patch)
}

export const createFromEmailPassword = internalMutation({
  args: {
    method: v.object({
      name: v.literal('emailPassword'),
      profile: v.object({ name: v.string() }),
    }),
  },
  returns: v.id('users'),
  handler: async (ctx, args) =>
    ctx.db.insert('users', { name: args.method.profile.name }),
})

export const createFromGoogle = internalMutation({
  args: {
    method: v.object({
      name: v.literal('google'),
      profile: vGoogleProfile,
    }),
  },
  returns: v.id('users'),
  handler: async (ctx, args) => {
    const profile = args.method.profile
    const sessionUserId = await getAuthUserId(ctx)
    if (!sessionUserId) return reuseOrCreate(ctx, profile)
    const email = verifiedOauthEmail(profile)
    const owner = email ? await userForVerifiedEmail(ctx, email) : null
    if (owner && owner._id !== sessionUserId) fail('EMAIL_TAKEN')
    const user = await ctx.db.get(sessionUserId)
    if (!user) return reuseOrCreate(ctx, profile)
    await rememberOauth(ctx, sessionUserId, profile)
    return sessionUserId
  },
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
    const passwordEmail = await ctx.runQuery(
      components.authEmail.verifiedEmails.getPrimaryEmail,
      { userId },
    )
    return {
      locale: user.locale ?? null,
      notation: user.notation ?? 'en',
      email: passwordEmail ?? user.oauthEmail ?? null,
      name: user.name,
      imageUrl: user.imageUrl ?? null,
      password: passwordEmail ? { email: passwordEmail } : null,
      google:
        user.googleLinked || user.oauthEmail
          ? { email: user.oauthEmail ?? null }
          : null,
      googleLinkNotice: user.googleLinkNotice ?? null,
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

const MAX_AVATAR_BYTES = 5 * 1024 * 1024

export const updateProfile = mutation({
  args: { name: v.string() },
  handler: async (ctx, args) => {
    const identity = await requireIdentity(ctx)
    const user = await userById(ctx, identity.subject)
    if (!user) fail('NOT_FOUND')
    const name = args.name.trim()
    if (!nameWithinLimit(name)) fail('INVALID')
    await ctx.db.patch(user._id, { name })
  },
})

export const generateAvatarUploadUrl = mutation({
  args: {},
  handler: async (ctx) => {
    await requireIdentity(ctx)
    return ctx.storage.generateUploadUrl()
  },
})

export const setAvatar = mutation({
  args: { storageId: v.id('_storage') },
  handler: async (ctx, args) => {
    const identity = await requireIdentity(ctx)
    const user = await userById(ctx, identity.subject)
    if (!user) fail('NOT_FOUND')
    const meta = await ctx.storage.getMetadata(args.storageId)
    const type = meta?.contentType ?? ''
    if (!type.startsWith('image/') || (meta?.size ?? 0) > MAX_AVATAR_BYTES) {
      await ctx.storage.delete(args.storageId)
      fail('INVALID')
    }
    const imageUrl = await ctx.storage.getUrl(args.storageId)
    if (!imageUrl) {
      await ctx.storage.delete(args.storageId)
      fail('INVALID')
    }
    if (user.imageStorageId && user.imageStorageId !== args.storageId)
      await ctx.storage.delete(user.imageStorageId)
    await ctx.db.patch(user._id, {
      imageStorageId: args.storageId,
      imageUrl,
    })
  },
})

export const clearAvatar = mutation({
  args: {},
  handler: async (ctx) => {
    const identity = await requireIdentity(ctx)
    const user = await userById(ctx, identity.subject)
    if (!user) return
    if (user.imageStorageId) await ctx.storage.delete(user.imageStorageId)
    await ctx.db.patch(user._id, {
      imageStorageId: undefined,
      imageUrl: undefined,
    })
  },
})

export const disconnectGoogle = mutation({
  args: {},
  handler: async (ctx) => {
    const identity = await requireIdentity(ctx)
    const user = await userById(ctx, identity.subject)
    if (!user) fail('NOT_FOUND')
    const passwordEmail = await ctx.runQuery(
      components.authEmail.verifiedEmails.getPrimaryEmail,
      { userId: user._id },
    )
    if (!passwordEmail) fail('INVALID')
    await ctx.runMutation(components.authGoogle.provider.deleteUser, {
      userId: user._id,
    })
    await ctx.db.patch(user._id, {
      googleLinked: undefined,
      oauthEmail: undefined,
      googleLinkNotice: undefined,
      imageUrl: user.imageStorageId ? user.imageUrl : undefined,
    })
  },
})

export const clearGoogleLinkNotice = mutation({
  args: {},
  handler: async (ctx) => {
    const identity = await requireIdentity(ctx)
    const user = await userById(ctx, identity.subject)
    if (!user?.googleLinkNotice) return
    await ctx.db.patch(user._id, { googleLinkNotice: undefined })
  },
})

export const deleteAccount = mutation({
  args: {},
  handler: async (ctx) => {
    const identity = await requireIdentity(ctx)
    await ctx.scheduler.runAfter(0, internal.accountCleanup.run, {
      userId: identity.subject,
      phase: 'bands',
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
