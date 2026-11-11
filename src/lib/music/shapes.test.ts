import { describe, expect, test } from 'vite-plus/test'
import { previewTabShift } from './tab.ts'
import type { TabMeasure } from './tab.ts'
import {
  notesForFrets,
  overlayChordShapes,
  resolveChord,
  voicingOptions,
} from './shapes.ts'

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
    const versionShapes = [
      { symbol: 'C', shift: 0, frets: [-1, 3, 5, 5, 5, 3] },
    ]
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

function grip(chord: string, frets: Array<number>): TabMeasure {
  return { beats: [{ d: 1, chord, notes: notesForFrets(frets) }] }
}

describe('overlayChordShapes', () => {
  const show = (
    measures: Array<TabMeasure>,
    extra: Partial<Parameters<typeof overlayChordShapes>[2]> = {},
    transpose = 0,
  ) =>
    overlayChordShapes(
      measures,
      previewTabShift(measures, transpose).measures,
      {
        ...base,
        transpose,
        ...extra,
      },
    )

  test('replaces a library grip with the personal shape', () => {
    const measures = [grip('G', [3, 2, 0, 0, 0, 3])]
    const [bar] = show(measures, {
      personalShapes: [{ symbol: 'G', frets: [3, 2, 0, 0, 3, 3] }],
    })
    expect(bar?.beats[0]?.notes.map((note) => [note.s, note.f])).toEqual(
      notesForFrets([3, 2, 0, 0, 3, 3]).map((note) => [note.s, note.f]),
    )
  })

  test('prefers the version shape over the personal one', () => {
    const measures = [grip('G', [3, 2, 0, 0, 0, 3])]
    const [bar] = show(measures, {
      versionShapes: [{ symbol: 'G', shift: 0, frets: [3, 5, 5, 4, 3, 3] }],
      personalShapes: [{ symbol: 'G', frets: [3, 2, 0, 0, 3, 3] }],
    })
    expect(bar?.beats[0]?.notes).toEqual(notesForFrets([3, 5, 5, 4, 3, 3]))
  })

  test('leaves a riff and a fretted technique on the written notes', () => {
    const measures: Array<TabMeasure> = [
      {
        beats: [
          { d: 4, chord: 'G', notes: [{ s: 1, f: 3 }] },
          {
            d: 4,
            chord: 'G',
            notes: notesForFrets([3, 2, 0, 0, 0, 3]).map((note, index) =>
              index === 0 ? { ...note, t: 'h' } : note,
            ),
          },
        ],
      },
    ]
    const [bar] = show(measures, {
      personalShapes: [{ symbol: 'G', frets: [3, 2, 0, 0, 3, 3] }],
    })
    const fretsOf = (index: number) =>
      bar?.beats[index]?.notes.map((note) => [note.s, note.f])
    expect(fretsOf(0)).toEqual([[1, 3]])
    expect(bar?.beats[1]?.notes[0]?.t).toBe('h')
    expect(fretsOf(1)).toEqual(
      notesForFrets([3, 2, 0, 0, 0, 3]).map((note) => [note.s, note.f]),
    )
  })

  test('uses the transposed chord shape instead of sliding the old grip', () => {
    const measures: Array<TabMeasure> = [
      {
        beats: [
          ...grip('G', [3, 2, 0, 0, 0, 3]).beats,
          { d: 4, notes: [{ s: 1, f: 0 }] },
        ],
      },
    ]
    const [bar] = show(measures, {}, 2)
    expect(bar?.beats[0]?.notes).toEqual(notesForFrets([-1, 0, 2, 2, 2, 0]))
    expect(bar?.beats[1]?.notes.map((note) => [note.s, note.f])).toEqual([
      [1, 2],
    ])
  })

  test('follows the shape for the capo the same way the diagram does', () => {
    const measures = [grip('A', [-1, 0, 2, 2, 2, 0])]
    const [bar] = show(measures, {
      capo: 2,
      personalShapes: [{ symbol: 'G', frets: [3, 2, 0, 0, 3, 3] }],
    })
    expect(bar?.beats[0]?.notes).toEqual(notesForFrets([3, 2, 0, 0, 3, 3]))
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
