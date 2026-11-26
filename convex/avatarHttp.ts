import { ConvexError } from 'convex/values'
import { internal } from './_generated/api'
import { env, httpAction } from './_generated/server'
import { requireIdentity } from './lib/access'
import { MAX_AVATAR_BYTES, sniffAvatar } from '../src/lib/avatar'

const ALLOW_HEADERS = 'Content-Type, Authorization'

export const uploadAvatarOptions = httpAction((_ctx, request) => {
  const origin = allowedOrigin(request)
  const headers = request.headers
  if (
    origin &&
    headers.get('Access-Control-Request-Method') &&
    headers.get('Access-Control-Request-Headers')
  ) {
    return Promise.resolve(
      new Response(null, {
        status: 204,
        headers: corsHeaders(origin, {
          'Access-Control-Allow-Methods': 'POST',
          'Access-Control-Allow-Headers': ALLOW_HEADERS,
          'Access-Control-Max-Age': '86400',
        }),
      }),
    )
  }
  return Promise.resolve(new Response(null, { status: 204 }))
})

export const uploadAvatar = httpAction(async (ctx, request) => {
  const origin = allowedOrigin(request)
  if (!origin) return json(request, 403, 'FORBIDDEN')
  try {
    await requireIdentity(ctx)
  } catch {
    return json(request, 401, 'UNAUTHENTICATED')
  }
  const declared = Number(request.headers.get('Content-Length') ?? '')
  if (Number.isFinite(declared) && declared > MAX_AVATAR_BYTES) {
    return json(request, 413, 'AVATAR_TOO_LARGE')
  }
  const blob = await request.blob()
  if (blob.size > MAX_AVATAR_BYTES)
    return json(request, 413, 'AVATAR_TOO_LARGE')
  const header = new Uint8Array(await blob.slice(0, 16).arrayBuffer())
  if (blob.size === 0 || !sniffAvatar(header)) {
    return json(request, 415, 'AVATAR_INVALID')
  }
  try {
    await ctx.runMutation(internal.users.reserveAvatarUpload, {})
  } catch (error) {
    return json(request, statusFor(codeOf(error)), codeOf(error))
  }
  const storageId = await ctx.storage.store(blob)
  try {
    await ctx.runAction(internal.avatar.normalizeUpload, { storageId })
  } catch (error) {
    return json(request, statusFor(codeOf(error)), codeOf(error))
  }
  return json(request, 200, null)
})

function allowedOrigin(request: Request) {
  const origin = request.headers.get('Origin')
  if (!origin) return null
  if (/^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin)) return origin
  const site = env.SITE_URL?.replace(/\/$/, '')
  if (site && origin === site) return origin
  return null
}

function codeOf(error: unknown) {
  if (error instanceof ConvexError) return String(error.data)
  return 'AVATAR_INVALID'
}

function statusFor(code: string) {
  if (code === 'AVATAR_TOO_LARGE') return 413
  if (code === 'AVATAR_RATE_LIMIT') return 429
  if (code === 'UNAUTHENTICATED') return 401
  if (code === 'FORBIDDEN') return 403
  return 415
}

function corsHeaders(origin: string, extra?: Record<string, string>) {
  return new Headers({
    'Access-Control-Allow-Origin': origin,
    Vary: 'origin',
    ...extra,
  })
}

function json(request: Request, status: number, code: string | null) {
  const origin = allowedOrigin(request)
  const headers = origin ? corsHeaders(origin) : new Headers()
  if (code) headers.set('Content-Type', 'application/json')
  return new Response(code ? JSON.stringify({ code }) : null, {
    status,
    headers,
  })
}
