import { describe, expect, test } from 'vite-plus/test'
import { entryOfPass, passOf, timelinePasses } from './passes.ts'

describe('timelinePasses', () => {
  const timeline = [
    { entryId: 'verse' },
    { entryId: 'chorus', repeat: 2 },
    { entryId: 'outro', repeat: 1 },
  ]

  test('writes out repeats and keeps plain entry ids for single passes', () => {
    expect(timelinePasses(timeline).map((item) => item.id)).toEqual([
      'verse',
      'chorus~1',
      'chorus~2',
      'outro',
    ])
  })

  test('numbers each pass and maps it back to its entry', () => {
    const second = timelinePasses(timeline)[2]
    expect(second?.pass).toBe(2)
    expect(second?.total).toBe(2)
    expect(passOf('chorus~2')).toBe(2)
    expect(passOf('verse')).toBe(1)
    expect(entryOfPass('chorus~2')).toBe('chorus')
  })
})
