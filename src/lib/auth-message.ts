import { m } from '@/paraglide/messages'

type AuthFailure =
  | { error: 'ACCESS_DENIED' }
  | { error: 'EXPIRED' }
  | { error: 'INVALID_FLOW' }
  | { error: 'OTHER_ERROR'; cause?: unknown }

export function authMessage(error: AuthFailure | null | undefined) {
  if (!error) return null
  switch (error.error) {
    case 'ACCESS_DENIED':
      return m.authCancelled()
    case 'EXPIRED':
    case 'INVALID_FLOW':
      return m.linkInvalid()
    case 'OTHER_ERROR':
      console.error('Sign-in failed:', error.cause)
      return m.authFailed()
    default:
      error satisfies never
      return m.authFailed()
  }
}
