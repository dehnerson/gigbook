export const RETURN_KEY = 'gigbook.returnTo'

function hasControl(path: string) {
  for (let i = 0; i < path.length; i++) {
    const code = path.charCodeAt(i)
    if (code < 32 || code === 127) return true
  }
  return false
}

function onePath(value: unknown) {
  if (typeof value !== 'string' || value.length === 0 || value.length > 2048)
    return '/'
  let path = value
  try {
    path = decodeURIComponent(value)
  } catch {
    return '/'
  }
  if (!path.startsWith('/') || path.startsWith('//') || hasControl(path))
    return '/'
  const pathOnly = path.split(/[?#]/)[0] ?? path
  if (pathOnly.includes('\\') || pathOnly.includes(':')) return '/'
  return path
}

function authRedirect(path: string) {
  const bare = path.split('#')[0] ?? path
  const queryIndex = bare.indexOf('?')
  const pathname = queryIndex === -1 ? bare : bare.slice(0, queryIndex)
  if (pathname !== '/sign-in' && pathname !== '/sign-in/') return null
  const query = queryIndex === -1 ? '' : bare.slice(queryIndex + 1)
  return new URLSearchParams(query).get('redirect')
}

/** Same-origin path only. Anything else becomes the library. */
export function safeNext(value: unknown) {
  let path = onePath(value)
  for (let i = 0; i < 8; i++) {
    const inner = authRedirect(path)
    if (inner === null) break
    path = onePath(inner)
  }
  return authRedirect(path) === null ? path : '/'
}

export function authSearch(search: Record<string, unknown>) {
  return {
    redirect: safeNext(search.redirect),
    code: typeof search.code === 'string' ? search.code : undefined,
    state: typeof search.state === 'string' ? search.state : undefined,
  }
}
