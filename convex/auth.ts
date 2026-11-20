import { setupEmailPassword } from '@convex-dev/auth/methods/email-password/server'
import { setupGoogle } from '@convex-dev/auth/methods/google/server'
import { setupConvexAuth } from '@convex-dev/auth/server'
import { components, internal } from './_generated/api'
import { mailFrom, redirectOrigins, siteUrl } from './lib/mail'

const auth = setupConvexAuth({ component: components.auth })

export const { signOut, refreshSession, isAuthenticated } = auth

const from = mailFrom() ?? 'Gigbook <onboarding@resend.dev>'

export const {
  signUpWithEmailPassword,
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
  createUser: internal.users.createFromEmailPassword,
})

export const { startSignInWithGoogle, completeSignInWithGoogle } = setupGoogle(
  auth,
  {
    component: components.authGoogle,
    allowedRedirectOrigins: redirectOrigins(),
  },
).attachUserCallbacks({
  createUser: internal.users.createFromGoogle,
  onSignIn: internal.users.rememberGoogle,
})
