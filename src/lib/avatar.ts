/** Originals up to this size are resized before they are stored. */
export const MAX_AVATAR_BYTES = 10 * 1024 * 1024

export const AVATAR_ATTEMPT_LIMIT = 10

export const AVATAR_ATTEMPT_WINDOW_MS = 10 * 60 * 1000

export const AVATAR_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
] as const

export const AVATAR_ACCEPT = AVATAR_MIME_TYPES.join(',')

const JPEG = [0xff, 0xd8, 0xff]
const PNG = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]
const RIFF = [0x52, 0x49, 0x46, 0x46]
const WEBP = [0x57, 0x45, 0x42, 0x50]

export function avatarTypeAllowed(type: string) {
  return AVATAR_MIME_TYPES.some((item) => item === type)
}

export function sniffAvatar(bytes: Uint8Array) {
  if (hasBytes(bytes, JPEG, 0)) return 'jpeg' as const
  if (hasBytes(bytes, PNG, 0)) return 'png' as const
  if (hasBytes(bytes, RIFF, 0) && hasBytes(bytes, WEBP, 8))
    return 'webp' as const
  return null
}

export function avatarByteError(bytes: Uint8Array) {
  if (bytes.byteLength > MAX_AVATAR_BYTES) return 'too-large' as const
  if (bytes.byteLength === 0 || sniffAvatar(bytes) === null)
    return 'invalid' as const
  return null
}

function hasBytes(bytes: Uint8Array, signature: Array<number>, offset: number) {
  if (bytes.byteLength < offset + signature.length) return false
  return signature.every((byte, index) => bytes[offset + index] === byte)
}
