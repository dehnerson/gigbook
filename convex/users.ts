import { getAuthUserId } from '@convex-dev/auth/server'
import { vGoogleProfile } from '@convex-dev/auth/methods/google/server'
import { v } from 'convex/values'
import { internal } from './_generated/api'
import type { Id } from './_generated/dataModel'
import {
  internalMutation,
  internalQuery,
  mutation,
  query,
} from './_generated/server'
import type { MutationCtx, QueryCtx } from './_generated/server'
import { requireIdentity } from './lib/access'
import { loadHome } from './lib/home'
import { decryptSecret, encryptSecret } from './lib/crypto'
import { fail } from './lib/errors'
import { nameWithinLimit } from './lib/users'
import {
  AVATAR_ATTEMPT_LIMIT,
  AVATAR_ATTEMPT_WINDOW_MS,
  sniffAvatar,
} from '../src/lib/avatar'
import { aiProvider } from './schema'
import { DEFAULT_MODEL, modelById, pickModel } from '../src/lib/import/models'
import type { AiProvider } from '../src/lib/import/models'

type OauthProfile = {
  email?: string
  emailVerified?: boolean
  name?: string
  picture?: string
}

async function userById(ctx: QueryCtx | MutationCtx, userId: Id<'users'>) {
  const user = await ctx.db.get(userId)
  if (!user) fail('NOT_FOUND')

  return user
}

function verifiedOauthEmail(profile: OauthProfile) {
  if (profile.emailVerified === false) return undefined
  const email = profile.email?.trim().toLowerCase()
  return email || undefined
}

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
    return ctx.db.insert('users', {
      name: profile.name?.trim() || '',
      imageUrl: profile.picture,
      email: verifiedOauthEmail(profile),
    })
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
    const profile = args.method.profile
    const email = verifiedOauthEmail(profile)
    const name = profile.name?.trim()
    const user = await ctx.db.get(args.userId)
    if (!user) return null
    const patch: {
      name?: string
      imageUrl?: string
      email?: string
    } = {}
    if (name && !user.name) patch.name = name
    if (profile.picture && !user.imageUrl) patch.imageUrl = profile.picture
    if (email) patch.email = email
    if (Object.keys(patch).length > 0) await ctx.db.patch(args.userId, patch)
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
    const home = await loadHome(ctx, userId, user.homeBandId ?? null)
    return {
      locale: user.locale ?? null,
      home: { bandId: home?.bandId ?? null },
      notation: user.notation ?? 'en',
      email: user.email ?? null,
      name: user.name,
      imageUrl: user.imageUrl ?? null,
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

export const setHome = mutation({
  args: { bandId: v.union(v.null(), v.id('bands')) },
  handler: async (ctx, args) => {
    const identity = await requireIdentity(ctx)

    const user = await userById(ctx, identity.subject)

    if (args.bandId) {
      const home = await loadHome(ctx, identity.subject, args.bandId)
      if (!home) fail('FORBIDDEN')
    }
    await ctx.db.patch(user._id, { homeBandId: args.bandId })
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

    await ctx.db.patch(user._id, {
      locale: args.locale ?? user.locale,
      notation: args.notation ?? user.notation,
    })
  },
})

export const updateProfile = mutation({
  args: { name: v.string() },
  handler: async (ctx, args) => {
    const user = await userById(ctx, (await requireIdentity(ctx)).subject)

    const name = args.name.trim()
    if (!nameWithinLimit(name)) fail('INVALID')
    await ctx.db.patch(user._id, { name })
  },
})

export const reserveAvatarUpload = internalMutation({
  args: {},
  handler: async (ctx) => {
    const user = await userById(ctx, (await requireIdentity(ctx)).subject)
    const now = Date.now()
    const recent = (user.avatarAttempts ?? []).filter(
      (at) => now - at < AVATAR_ATTEMPT_WINDOW_MS,
    )
    if (recent.length >= AVATAR_ATTEMPT_LIMIT) fail('AVATAR_RATE_LIMIT')
    await ctx.db.patch(user._id, { avatarAttempts: [...recent, now] })
  },
})

export const commitAvatar = internalMutation({
  args: { jpeg: v.bytes() },
  handler: async (ctx, args) => {
    const user = await userById(ctx, (await requireIdentity(ctx)).subject)
    const jpeg = new Uint8Array(args.jpeg)
    if (sniffAvatar(jpeg) !== 'jpeg') fail('AVATAR_INVALID')
    const storageId = await ctx.storage.store(
      new Blob([args.jpeg], { type: 'image/jpeg' }),
    )
    const imageUrl = await ctx.storage.getUrl(storageId)
    if (!imageUrl) fail('AVATAR_INVALID')
    const previous = user.imageStorageId
    await ctx.db.patch(user._id, { imageStorageId: storageId, imageUrl })
    if (previous && previous !== storageId) await ctx.storage.delete(previous)
  },
})

export const clearAvatar = mutation({
  args: {},
  handler: async (ctx) => {
    const identity = await requireIdentity(ctx)
    const user = await userById(ctx, identity.subject)

    if (user.imageStorageId) await ctx.storage.delete(user.imageStorageId)
    await ctx.db.patch(user._id, {
      imageStorageId: undefined,
      imageUrl: undefined,
    })
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
    const user = await userById(ctx, (await requireIdentity(ctx)).subject)

    const existing = await credentialFor(ctx, user._id, args.provider)
    if (existing) await ctx.db.delete(existing._id)
  },
})

export const setAiModel = mutation({
  args: { model: v.string() },
  handler: async (ctx, args) => {
    const identity = await requireIdentity(ctx)
    const user = await userById(ctx, identity.subject)

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
    const userId = ctx.db.normalizeId('users', args.userId)
    if (!userId) fail('NOT_FOUND')
    if (!args.provider) return readAiKey(ctx, userId)
    const user = await userById(ctx, userId)

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

export async function readAiKey(ctx: QueryCtx, userId: Id<'users'>) {
  const user = await userById(ctx, userId)

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
