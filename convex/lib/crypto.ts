function bytesToBase64(bytes: Uint8Array) {
  let binary = ''
  for (const byte of bytes) binary += String.fromCharCode(byte)
  return btoa(binary)
}

function base64ToBytes(value: string) {
  const binary = atob(value)
  const bytes = new Uint8Array(binary.length)
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index)
  }
  return bytes
}

async function secretKey(secret: string) {
  const digest = await crypto.subtle.digest(
    'SHA-256',
    new TextEncoder().encode(secret),
  )
  return crypto.subtle.importKey('raw', digest, 'AES-GCM', false, [
    'encrypt',
    'decrypt',
  ])
}

export function encryptionSecret() {
  const secret = process.env.AI_KEY_ENCRYPTION_SECRET
  if (!secret) failMissing()
  return secret
}

function failMissing(): never {
  throw new Error('AI_KEY_ENCRYPTION_SECRET is not set')
}

export async function encryptSecret(plain: string) {
  const key = await secretKey(encryptionSecret())
  const iv = crypto.getRandomValues(new Uint8Array(12))
  const cipher = new Uint8Array(
    await crypto.subtle.encrypt(
      { name: 'AES-GCM', iv },
      key,
      new TextEncoder().encode(plain),
    ),
  )
  return `${bytesToBase64(iv)}.${bytesToBase64(cipher)}`
}

export async function decryptSecret(payload: string) {
  const [iv, cipher] = payload.split('.')
  if (!iv || !cipher) throw new Error('INVALID_SECRET')
  const key = await secretKey(encryptionSecret())
  const plain = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: base64ToBytes(iv) },
    key,
    base64ToBytes(cipher),
  )
  return new TextDecoder().decode(plain)
}
