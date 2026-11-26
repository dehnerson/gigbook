import { describe, expect, test } from 'vite-plus/test'
import { normalizeAvatar } from '../../convex/avatar.ts'
import { MAX_AVATAR_BYTES, sniffAvatar } from './avatar.ts'

const PNG = Uint8Array.from(
  Buffer.from(
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
    'base64',
  ),
)

describe('normalizeAvatar', () => {
  test('re-encodes a png as a jpeg under the size cap', async () => {
    const jpeg = await normalizeAvatar(PNG)
    expect(sniffAvatar(jpeg)).toBe('jpeg')
    expect(jpeg.byteLength).toBeGreaterThan(0)
    expect(jpeg.byteLength).toBeLessThan(MAX_AVATAR_BYTES)
  })

  test('rejects an svg', async () => {
    const svg = new TextEncoder().encode(
      '<svg xmlns="http://www.w3.org/2000/svg" width="10" height="10"></svg>',
    )
    await expect(normalizeAvatar(svg)).rejects.toThrow()
  })
})
