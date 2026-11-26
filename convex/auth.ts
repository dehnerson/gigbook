import { setupGoogle } from '@convex-dev/auth/methods/google/server'
import { setupConvexAuth } from '@convex-dev/auth/server'
import { components, internal } from './_generated/api'
import { redirectOrigins } from './lib/mail'

const auth = setupConvexAuth({ component: components.auth })

export const { signOut, refreshSession, isAuthenticated } = auth

const google = setupGoogle(auth, {
  component: components.authGoogle,
  allowedRedirectOrigins: redirectOrigins(),
}).attachUserCallbacks({
  createUser: internal.users.createFromGoogle,
  onSignIn: internal.users.rememberGoogle,
})

export const { startSignInWithGoogle, completeSignInWithGoogle } = google
