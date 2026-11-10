import { ConvexError } from 'convex/values'
import { m } from '@/paraglide/messages'

export function messageFor(error: unknown) {
  const code = error instanceof ConvexError ? String(error.data) : ''
  if (code === 'UNAUTHENTICATED') return m.errorUnauthenticated()
  if (code === 'FORBIDDEN') return m.errorForbidden()
  if (code === 'NOT_FOUND') return m.errorNotFound()
  if (code === 'NO_API_KEY') return m.errorNoApiKey()
  if (code === 'RATE_LIMIT') return m.errorRateLimit()
  if (code === 'INVALID_KEY') return m.errorInvalidKey()
  if (code === 'AI_RATE_LIMIT') return m.errorAiRateLimit()
  if (code === 'MODEL_UNSUPPORTED') return m.errorModelUnsupported()
  if (code === 'IMPORT_FAILED') return m.errorImportFailed()
  if (code === 'USER_NOT_FOUND') return m.errorUserNotFound()
  if (code === 'PASTE_REQUIRED') return m.pasteRequired()
  if (code === 'INVALID') return m.errorInvalid()
  return m.errorInvalid()
}
