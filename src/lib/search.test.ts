import { describe, expect, test } from 'vite-plus/test'
import { matchesScope, matchesSearch } from './search.ts'

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

describe('matchesScope', () => {
  test('all keeps every row', () => {
    expect(matchesScope('all', { personal: false, band: false })).toBe(true)
    expect(matchesScope('all', { personal: true, band: true })).toBe(true)
  })

  test('personal and band follow the flags', () => {
    const both = { personal: true, band: true }
    expect(matchesScope('personal', both)).toBe(true)
    expect(matchesScope('band', both)).toBe(true)
    expect(matchesScope('personal', { personal: false, band: true })).toBe(
      false,
    )
    expect(matchesScope('band', { personal: true, band: false })).toBe(false)
  })
})
