import { describe, expect, test } from 'bun:test'
import { resolveChord, voicingOptions } from './shapes.ts'

const base = {
  capo: 0,
  transpose: 0,
  notation: 'en' as const,
  tuning: [],
  versionShapes: [],
  personalShapes: [],
}

describe('resolveChord', () => {
  test('falls back to the built-in diagram', () => {
    const chord = resolveChord({ ...base, symbol: 'C' })
    expect(chord.source).toBe('default')
    expect(chord.diagram?.frets).toEqual([-1, 3, 2, 0, 1, 0])
  })

  test('prefers the version shape, then the personal one', () => {
    const versionShapes = [{ symbol: 'C', frets: [-1, 3, 5, 5, 5, 3] }]
    const personalShapes = [{ symbol: 'C', frets: [8, 10, 10, 9, 8, 8] }]
    expect(
      resolveChord({ ...base, symbol: 'C', versionShapes, personalShapes })
        .source,
    ).toBe('version')
    expect(
      resolveChord({ ...base, symbol: 'C', personalShapes }).diagram?.frets,
    ).toEqual([8, 10, 10, 9, 8, 8])
  })

  test('matches version shapes only at the capo they were chosen for', () => {
    const versionShapes = [
      { symbol: 'A', shift: -2, frets: [3, 2, 0, 0, 3, 3] },
    ]
    expect(
      resolveChord({ ...base, symbol: 'A', capo: 2, versionShapes }).source,
    ).toBe('version')
    expect(resolveChord({ ...base, symbol: 'A', versionShapes }).source).toBe(
      'default',
    )
  })

  test('keys personal shapes by the chord as played', () => {
    const personalShapes = [{ symbol: 'G', frets: [3, 2, 0, 0, 3, 3] }]
    const chord = resolveChord({
      ...base,
      symbol: 'A',
      capo: 2,
      personalShapes,
    })
    expect(chord.played).toBe('G')
    expect(chord.source).toBe('mine')
  })

  test('generates diagrams for other tunings', () => {
    const tuning = ['D2', 'A2', 'D3', 'G3', 'B3', 'E4']
    const chord = resolveChord({ ...base, symbol: 'D', tuning })
    expect(chord.diagram?.frets.slice(0, 3)).toEqual([0, 0, 0])
  })
})

describe('voicingOptions', () => {
  test('puts the built-in shape first without duplicates', () => {
    const options = voicingOptions('G', [])
    expect(options[0]?.frets).toEqual([3, 2, 0, 0, 0, 3])
    const keys = options.map((option) => option.frets.join(','))
    expect(new Set(keys).size).toBe(keys.length)
  })
})
