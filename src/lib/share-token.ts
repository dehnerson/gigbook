export function newShareToken() {
  const bytes = crypto.getRandomValues(new Uint8Array(16))
  let binary = ''
  for (const byte of bytes) binary += String.fromCharCode(byte)
  return btoa(binary)
    .replaceAll('+', '-')
    .replaceAll('/', '_')
    .replaceAll('=', '')
}

export function sameSecret(
  stored: string | undefined,
  given: string | undefined,
) {
  if (!stored || !given || stored.length !== given.length) return false
  let diff = 0
  for (let i = 0; i < stored.length; i++)
    diff |= stored.charCodeAt(i) ^ given.charCodeAt(i)
  return diff === 0
}
