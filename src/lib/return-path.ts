export const RETURN_KEY = 'gigbook.returnTo'

function hasControl(path: string) {
  for (let i = 0; i < path.length; i++) {
    const code = path.charCodeAt(i)
    if (code < 32 || code === 127) return true
  }
  return false
}

/** Same-origin path only. Anything else becomes the library. */
export function safeNext(value: unknown) {
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

export function signInSearch(search: Record<string, unknown>) {
  return { redirect: safeNext(search.redirect) }
}
