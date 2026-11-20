import { setupEmailPassword } from '@convex-dev/auth/methods/email-password/server'
import {
  normalizeGoogleProfile,
  setupGoogle,
} from '@convex-dev/auth/methods/google/server'
import { getAuthUserId, setupConvexAuth } from '@convex-dev/auth/server'
import { createFunctionHandle } from 'convex/server'
import { v } from 'convex/values'
import { components, internal } from './_generated/api'
import { mailFrom, redirectOrigins, siteUrl } from './lib/mail'
import { validateNewPassword } from './lib/password'
import { componentPathOf, decryptTicketPayload, sha256Hex } from './lib/ticket'
import { nameWithinLimit } from './lib/users'
import { mutation } from './_generated/server'
import type { MutationCtx } from './_generated/server'

const auth = setupConvexAuth({ component: components.auth })

export const { signOut, refreshSession, isAuthenticated } = auth

const from = mailFrom() ?? 'Gigbook <onboarding@resend.dev>'

export const {
  completeSignUpWithEmailPassword,
  signInWithEmailPassword,
  changePassword,
  startChangeEmail,
  completeChangeEmail,
  startPasswordRecovery,
  checkPasswordRecovery,
  completePasswordRecovery,
} = setupEmailPassword(auth, {
  component: components.authEmail,
  passwordComponent: components.authPassword,
  emailSender: {
    kind: 'resend',
    sendEmail: components.resend.lib.sendEmail,
    apiKey: process.env.RESEND_API_KEY ?? '',
    from,
  },
  urls: {
    signUp: `${siteUrl()}/validate-email`,
    changeEmail: `${siteUrl()}/confirm-email-change`,
    recovery: `${siteUrl()}/reset-password`,
  },
}).attachUserCallbacks({
  // The display name is application data, so createUser writes it onto the
  // users table. The email component remains the source of the address.
  createUser: internal.users.createFromEmailPassword as never,
})

const google = setupGoogle(auth, {
  component: components.authGoogle,
  allowedRedirectOrigins: redirectOrigins(),
}).attachUserCallbacks({
  createUser: internal.users.createFromGoogle,
  onSignIn: internal.users.rememberGoogle,
})

export const { startSignInWithGoogle } = google

// The library redemption always signs in whoever already owns the Google
// account. This replacement keeps a signed-in user on their own session and
// attaches Google to them instead.
export const { completeSignInWithGoogle: redeemGoogleSignIn } = google

const TOKEN_TTL = {
  accessTokenTtlSeconds: 60,
  refreshInactivityTimeoutSeconds: 30 * 24 * 60 * 60,
  sessionMaxLifetimeSeconds: 30 * 24 * 60 * 60,
}

const MIN_PASSWORD = 10

const invalidCode = {
  status: 'error' as const,
  userError: { error: 'INVALID_CODE' as const },
}

type AuthTokens = {
  accessToken: string
  refreshToken: string
  refreshTokenExpiresAt: number
  userId: string
}

type GoogleSignInResult =
  | { status: 'complete'; tokens: AuthTokens }
  | typeof invalidCode

type SignUpFailure = {
  success: false
  userError:
    | { error: 'INVALID_NAME' }
    | { error: 'INVALID_EMAIL' }
    | { error: 'RATE_LIMITED'; retryAfterMs: number }
    | { error: 'EMAIL_TAKEN' }
    | { error: 'PASSWORD_TOO_SHORT'; minimumLength: number }
    | { error: 'PASSWORD_TOO_LONG'; maximumLength: number }
    | { error: 'PASSWORD_HAS_SURROUNDING_WHITESPACE' }
    | { error: 'PASSWORD_TOO_COMMON' }
}

type SignUpResult = { success: true; browserSecret: string } | SignUpFailure

export const signUpWithEmailPassword = mutation({
  args: { email: v.string(), password: v.string(), name: v.string() },
  handler: async (ctx, { email, password, name }): Promise<SignUpResult> => {
    const displayName = name.trim()
    if (!displayName || !nameWithinLimit(displayName)) {
      return {
        success: false as const,
        userError: { error: 'INVALID_NAME' as const },
      }
    }
    const emailError = await ctx.runMutation(
      components.authEmail.challenge.signUp.check,
      { email },
    )
    if (emailError !== null) {
      return { success: false as const, userError: emailError }
    }
    const passwordError = validateNewPassword(password, MIN_PASSWORD)
    if (passwordError !== null) {
      return { success: false as const, userError: passwordError }
    }
    const created: { userId: string } = await ctx.runMutation(
      components.auth.public._internal_dangerous_signUpWithoutSession,
      {
        claims: { method: 'emailPassword', profile: { name: displayName } },
        createUserHandle: await createFunctionHandle(
          internal.users.createFromEmailPassword,
        ),
      },
    )
    const { userId } = created
    const setResult = await ctx.runMutation(
      components.authPassword.public._internal_dangerous_setPassword,
      { userId, password, minimumLength: MIN_PASSWORD },
    )
    if (!setResult.success) {
      throw new Error(
        `Unexpected error when setting the password: ${setResult.userError.error}`,
        { cause: setResult.userError },
      )
    }
    const start:
      | {
          success: true
          browserSecret: string
        }
      | {
          success: false
          userError: { error: string }
        } = await ctx.runMutation(
      components.authEmail.challenge.signUp._internal_dangerous_start,
      {
        email,
        userId,
        url: `${siteUrl()}/validate-email`,
        emailSender: await senderConfig(),
      },
    )
    if (!start.success) {
      throw new Error(
        `Unexpected error when starting the email validation: ${start.userError.error}`,
        { cause: start.userError },
      )
    }
    return { success: true as const, browserSecret: start.browserSecret }
  },
})

async function senderConfig() {
  return {
    kind: 'resend' as const,
    sendEmailHandle: await createFunctionHandle(
      components.resend.lib.sendEmail,
    ),
    from,
    apiKey: process.env.RESEND_API_KEY ?? '',
    initialBackoffMs: 30 * 1000,
    retryAttempts: 5,
  }
}

export const completeSignInWithGoogle = mutation({
  args: { code: v.string(), state: v.string() },
  handler: async (ctx, args): Promise<GoogleSignInResult> => {
    const ticket = await ctx.runMutation(
      components.authGoogle.provider.claimTicket,
      {
        ticketCodeHash: await sha256Hex(args.code),
        stateHash: await sha256Hex(args.state),
      },
    )
    if (!ticket) return invalidCode
    let profile: ReturnType<typeof normalizeGoogleProfile>
    try {
      const payload = JSON.parse(
        await decryptTicketPayload(args.code, ticket.encryptedPayload),
      ) as { claims?: Parameters<typeof normalizeGoogleProfile>[0] }
      profile = normalizeGoogleProfile(payload.claims)
    } catch {
      return invalidCode
    }
    if (!profile.id) return invalidCode

    const sessionUserId = await getAuthUserId(ctx)
    const existingUserId = await ctx.runQuery(
      components.authGoogle.provider.getUserIdByAccount,
      { providerAccountId: profile.id },
    )
    const signIn = async (
      userId: string,
      notify: boolean,
    ): Promise<AuthTokens> =>
      ctx.runMutation(components.auth.public._internal_dangerous_signIn, {
        userId,
        claims: { method: 'google', profile },
        componentPath: componentPathOf(components.authGoogle),
        onSignInHandle: notify
          ? await createFunctionHandle(internal.users.rememberGoogle)
          : undefined,
        ...TOKEN_TTL,
      })

    if (sessionUserId) {
      const taken =
        (existingUserId !== null && existingUserId !== sessionUserId) ||
        (existingUserId === null &&
          (await googleEmailOwnedBySomeoneElse(
            ctx,
            profile.email,
            profile.emailVerified,
            sessionUserId,
          )))
      if (taken) {
        await ctx.db.patch(sessionUserId, { googleLinkNotice: 'taken' })
        const tokens = await signIn(sessionUserId, false)
        return { status: 'complete' as const, tokens }
      }
      if (existingUserId === null) {
        await ctx.runMutation(
          components.authGoogle.provider._internal_dangerous_createAccount,
          { providerAccountId: profile.id, userId: sessionUserId },
        )
      }
      await ctx.db.patch(sessionUserId, { googleLinkNotice: 'linked' })
      const tokens = await signIn(sessionUserId, true)
      return { status: 'complete' as const, tokens }
    }

    if (existingUserId !== null) {
      const tokens = await signIn(existingUserId, true)
      return { status: 'complete' as const, tokens }
    }
    const tokens = await ctx.runMutation(
      components.auth.public._internal_dangerous_signUp,
      {
        claims: { method: 'google', profile },
        componentPath: componentPathOf(components.authGoogle),
        createUserHandle: await createFunctionHandle(
          internal.users.createFromGoogle,
        ),
        onSignInHandle: await createFunctionHandle(
          internal.users.rememberGoogle,
        ),
        ...TOKEN_TTL,
      },
    )
    await ctx.runMutation(
      components.authGoogle.provider._internal_dangerous_createAccount,
      { providerAccountId: profile.id, userId: tokens.userId },
    )
    return { status: 'complete' as const, tokens }
  },
})

async function googleEmailOwnedBySomeoneElse(
  ctx: MutationCtx,
  email: string | undefined,
  emailVerified: boolean,
  sessionUserId: string,
) {
  if (!emailVerified) return false
  const address = email?.trim().toLowerCase()
  if (!address) return false
  const found = await ctx.runMutation(
    components.authEmail.verifiedEmails.lookupEmail,
    { email: address },
  )
  if (!found.success) return found.userError.error === 'RATE_LIMITED'
  return found.userId !== sessionUserId
}

export const startAddPassword = mutation({
  args: { email: v.string(), password: v.string() },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx)
    if (!userId)
      return {
        success: false as const,
        userError: { error: 'NOT_LOGGED_IN' as const },
      }
    const existing = await ctx.runQuery(
      components.authEmail.verifiedEmails.getPrimaryEmail,
      { userId },
    )
    if (existing)
      return {
        success: false as const,
        userError: { error: 'HAS_PASSWORD' as const },
      }
    const emailError = await ctx.runMutation(
      components.authEmail.challenge.addEmail.check,
      { email: args.email },
    )
    if (emailError) return { success: false as const, userError: emailError }
    const setResult = await ctx.runMutation(
      components.authPassword.public._internal_dangerous_setPassword,
      { userId, password: args.password, minimumLength: MIN_PASSWORD },
    )
    if (!setResult.success)
      return { success: false as const, userError: setResult.userError }
    const start = await ctx.runMutation(
      components.authEmail.challenge.addEmail._internal_dangerous_start,
      {
        email: args.email,
        userId,
        url: `${siteUrl()}/confirm-add-password`,
        emailSender: await senderConfig(),
      },
    )
    if (!start.success)
      return { success: false as const, userError: start.userError }
    return { success: true as const, browserSecret: start.browserSecret }
  },
})

export const completeAddPassword = mutation({
  args: { emailCode: v.string(), browserSecret: v.string() },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx)
    if (!userId)
      return {
        success: false as const,
        userError: { error: 'NOT_LOGGED_IN' as const },
      }
    const complete = await ctx.runMutation(
      components.authEmail.challenge.addEmail.complete,
      {
        emailCode: args.emailCode,
        browserSecret: args.browserSecret,
        userId,
      },
    )
    if (!complete.success)
      return { success: false as const, userError: complete.userError }
    return { success: true as const }
  },
})
