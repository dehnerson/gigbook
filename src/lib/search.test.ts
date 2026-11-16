import { describe, expect, test } from 'vite-plus/test'
import { matchesSearch } from './search.ts'

describe('matchesSearch', () => {
  const parts = ['Bella Napoli', 'Original', 'Abbruzzi']

  test('matches any field, ignoring case and accents', () => {
    expect(matchesSearch('', parts)).toBe(true)
    expect(matchesSearch('  abbruzzi ', parts)).toBe(true)
    expect(matchesSearch('original', parts)).toBe(true)
    expect(matchesSearch('napo', parts)).toBe(true)
    expect(matchesSearch('Muller', ['Müller'])).toBe(true)
    expect(matchesSearch('Müller', ['Muller'])).toBe(true)
  })

  test('rejects a query that none of the fields contain', () => {
    expect(matchesSearch('nope', parts)).toBe(false)
    expect(matchesSearch('original', ['Bella Napoli'])).toBe(false)
  })
})
