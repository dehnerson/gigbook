import { describe, expect, test } from 'vite-plus/test'
import {
  AVATAR_ACCEPT,
  MAX_AVATAR_BYTES,
  avatarByteError,
  avatarTypeAllowed,
  sniffAvatar,
} from './avatar.ts'

const PNG = Uint8Array.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])

describe('avatar files', () => {
  test('accepts jpeg, png, and webp headers', () => {
    expect(sniffAvatar(Uint8Array.from([0xff, 0xd8, 0xff]))).toBe('jpeg')
    expect(sniffAvatar(PNG)).toBe('png')
    const webp = new Uint8Array(12)
    webp.set([0x52, 0x49, 0x46, 0x46], 0)
    webp.set([0x57, 0x45, 0x42, 0x50], 8)
    expect(sniffAvatar(webp)).toBe('webp')
    expect(avatarByteError(Uint8Array.from([0xff, 0xd8, 0xff]))).toBeNull()
  })

  test('rejects empty files, svg, and anything over the size cap', () => {
    expect(avatarByteError(new Uint8Array())).toBe('invalid')
    expect(
      avatarByteError(
        new TextEncoder().encode('<svg xmlns="http://www.w3.org/2000/svg"/>'),
      ),
    ).toBe('invalid')
    const huge = new Uint8Array(MAX_AVATAR_BYTES + 1)
    huge.set([0xff, 0xd8, 0xff], 0)
    expect(avatarByteError(huge)).toBe('too-large')
  })

  test('limits the picker to jpeg, png, and webp', () => {
    expect(avatarTypeAllowed('image/jpeg')).toBe(true)
    expect(avatarTypeAllowed('image/png')).toBe(true)
    expect(avatarTypeAllowed('image/webp')).toBe(true)
    expect(avatarTypeAllowed('image/svg+xml')).toBe(false)
    expect(avatarTypeAllowed('')).toBe(false)
    expect(AVATAR_ACCEPT).toBe('image/jpeg,image/png,image/webp')
  })
})
