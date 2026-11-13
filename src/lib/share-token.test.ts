import { describe, expect, test } from 'vite-plus/test'
import { newShareToken, sameSecret } from './share-token.ts'
import { safeNext } from './return-path.ts'

describe('share tokens', () => {
  test('uses 128 bits of url-safe randomness', () => {
    const token = newShareToken()
    expect(token).toMatch(/^[\w-]{22}$/)
    expect(newShareToken()).not.toBe(token)
  })

  test('matches only the exact secret', () => {
    expect(sameSecret('abc', 'abc')).toBe(true)
    expect(sameSecret('abc', 'abd')).toBe(false)
    expect(sameSecret('abc', 'abcd')).toBe(false)
    expect(sameSecret(undefined, 'abc')).toBe(false)
    expect(sameSecret('abc', undefined)).toBe(false)
  })
})

describe('safeNext', () => {
  test('keeps in-app paths', () => {
    expect(safeNext('/share/abc-def_g')).toBe('/share/abc-def_g')
    expect(safeNext('/songs/id?band=1#top')).toBe('/songs/id?band=1#top')
  })

  test('rejects off-site targets', () => {
    expect(safeNext('https://evil.test')).toBe('/')
    expect(safeNext('//evil.test')).toBe('/')
    expect(safeNext('/\\evil.test')).toBe('/')
    expect(safeNext('/%2F%2Fevil.test')).toBe('/')
    expect(safeNext(undefined)).toBe('/')
  })
})
