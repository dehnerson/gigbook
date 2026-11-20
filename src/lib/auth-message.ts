import { m } from '@/paraglide/messages'

type AuthFailure =
  | { error: 'USER_NOT_FOUND' }
  | { error: 'EMAIL_NOT_FOUND' }
  | { error: 'INVALID_EMAIL' }
  | { error: 'EMAIL_TAKEN' }
  | { error: 'INVALID_CREDENTIALS' }
  | { error: 'PASSWORD_TOO_SHORT'; minimumLength: number }
  | { error: 'PASSWORD_TOO_LONG'; maximumLength: number }
  | { error: 'PASSWORD_HAS_SURROUNDING_WHITESPACE' }
  | { error: 'PASSWORD_TOO_COMMON' }
  | { error: 'RATE_LIMITED'; retryAfterMs: number }
  | { error: 'MISSING_SECRET' }
  | { error: 'INVALID_CHALLENGE' }
  | { error: 'INCORRECT_CODE' }
  | { error: 'EXPIRED' }
  | { error: 'INVALID_FLOW' }
  | { error: 'ACCESS_DENIED' }
  | { error: 'WRONG_USER' }
  | { error: 'NOT_LOGGED_IN' }
  | { error: 'OTHER_ERROR'; cause?: unknown }

export function authMessage(error: AuthFailure | null | undefined) {
  if (!error) return null
  switch (error.error) {
    case 'USER_NOT_FOUND':
    case 'EMAIL_NOT_FOUND':
      return m.errorUserNotFound()
    case 'INVALID_EMAIL':
      return m.authInvalidEmail()
    case 'EMAIL_TAKEN':
      return m.authEmailTaken()
    case 'INVALID_CREDENTIALS':
      return m.authInvalidCredentials()
    case 'PASSWORD_TOO_SHORT':
      return m.authPasswordShort({ length: error.minimumLength })
    case 'PASSWORD_TOO_LONG':
      return m.authPasswordLong({ length: error.maximumLength })
    case 'PASSWORD_HAS_SURROUNDING_WHITESPACE':
      return m.authPasswordSpace()
    case 'PASSWORD_TOO_COMMON':
      return m.authPasswordCommon()
    case 'RATE_LIMITED':
      return m.authRateLimit({
        seconds: Math.max(1, Math.ceil(error.retryAfterMs / 1000)),
      })
    case 'MISSING_SECRET':
      return m.linkWrongBrowser()
    case 'INVALID_CHALLENGE':
    case 'INCORRECT_CODE':
    case 'EXPIRED':
    case 'INVALID_FLOW':
      return m.linkInvalid()
    case 'ACCESS_DENIED':
      return m.authCancelled()
    case 'WRONG_USER':
      return m.authWrongUser()
    case 'NOT_LOGGED_IN':
      return m.errorUnauthenticated()
    case 'OTHER_ERROR':
      console.error('Sign-in failed:', error.cause)
      return m.authFailed()
    default:
      error satisfies never
      return m.authFailed()
  }
}
