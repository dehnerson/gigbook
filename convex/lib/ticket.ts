import { getFunctionAddress } from 'convex/server'

const CHILD_COMPONENT_PREFIX = '_reference/childComponent/'

/** Path of a mounted Convex component, for example `authGoogle`. */
export function componentPathOf(component: object) {
  let reference: string | undefined
  try {
    reference = getFunctionAddress(component).reference
  } catch {
    reference = undefined
  }
  if (
    reference === undefined ||
    !reference.startsWith(CHILD_COMPONENT_PREFIX) ||
    reference.length === CHILD_COMPONENT_PREFIX.length
  ) {
    throw new Error('Expected a reference inside a mounted component')
  }
  return reference.slice(CHILD_COMPONENT_PREFIX.length)
}

export async function sha256Hex(value: string) {
  const digest = await crypto.subtle.digest(
    'SHA-256',
    new TextEncoder().encode(value),
  )
  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('')
}

function base64UrlDecode(value: string) {
  const base64 = value
    .replace(/-/g, '+')
    .replace(/_/g, '/')
    .padEnd(Math.ceil(value.length / 4) * 4, '=')
  const binary = atob(base64)
  return Uint8Array.from(binary, (char) => char.charCodeAt(0))
}

/** Decrypt an OAuth ticket payload. The key is derived from the raw ticket code. */
export async function decryptTicketPayload(
  ticketCode: string,
  encrypted: string,
) {
  const keyBytes = await crypto.subtle.digest(
    'SHA-256',
    new TextEncoder().encode(`convex-auth-ticket-payload:${ticketCode}`),
  )
  const key = await crypto.subtle.importKey('raw', keyBytes, 'AES-GCM', false, [
    'decrypt',
  ])
  const combined = base64UrlDecode(encrypted)
  const plaintext = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: combined.slice(0, 12) },
    key,
    combined.slice(12),
  )
  return new TextDecoder().decode(plaintext)
}
