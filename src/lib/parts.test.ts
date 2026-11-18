import { describe, expect, test } from 'vite-plus/test'
import {
  availableLayers,
  DEFAULT_LAYERS,
  effectiveLayers,
  parseLayers,
  toggleLayer,
} from './sheet-layers.ts'
import {
  allParts,
  followsCapo,
  genericGuitarName,
  onVisiblePart,
  partTuning,
  usedParts,
} from './parts.ts'

describe('parts', () => {
  const stored = [
    { id: 'guitar', instrument: 'guitar' as const, name: 'Rhythm' },
    { id: 'abc', instrument: 'guitar' as const, name: 'Lead' },
    {
      id: 'bass1',
      instrument: 'bass' as const,
      tuning: ['D1', 'A1', 'D2', 'G2'],
    },
  ]

  test('the guitar part is built in and keeps a custom name', () => {
    expect(allParts(stored)).toEqual([
      { id: 'guitar', instrument: 'guitar', name: 'Rhythm', builtIn: true },
      { id: 'abc', instrument: 'guitar', name: 'Lead', builtIn: false },
      {
        id: 'bass1',
        instrument: 'bass',
        tuning: ['D1', 'A1', 'D2', 'G2'],
        builtIn: false,
      },
    ])
  })

  test('bass keeps its own tuning and ignores the capo', () => {
    const bass = stored[2]
    if (!bass) throw new Error('missing bass')
    expect(partTuning(bass, ['E2', 'A2', 'D3', 'G3', 'B3', 'E4'])).toEqual([
      'D1',
      'A1',
      'D2',
      'G2',
    ])
    expect(partTuning({ id: 'guitar', instrument: 'guitar' }, ['E2'])).toEqual([
      'E2',
    ])
    expect(followsCapo({ instrument: 'guitar' })).toBe(true)
    expect(followsCapo({ instrument: 'bass' })).toBe(false)
  })

  test('only parts with a tab are offered as filters', () => {
    const lines = [{ partId: 'abc' }]
    expect(usedParts(stored, lines).map((part) => part.id)).toEqual(['abc'])
    expect(onVisiblePart('abc', ['abc'])).toBe(true)
    expect(onVisiblePart('guitar', ['abc'])).toBe(false)
    expect(onVisiblePart('guitar', [])).toBe(true)
  })

  test('a plain guitar name belongs on the guitar part', () => {
    expect(genericGuitarName(' Guitar ')).toBe(true)
    expect(genericGuitarName('Gitarre')).toBe(true)
    expect(genericGuitarName('Lead')).toBe(false)
  })
})

describe('sheet layers', () => {
  test('layers come from the chord sheet and the tab', () => {
    expect(availableLayers([{ chartBody: '[G]Hello [D]world' }])).toEqual([
      'lyrics',
      'chords',
    ])
    expect(
      availableLayers([
        { chartBody: '| G | D |\n[Em] [C]', strumming: 'DDUD' },
      ]),
    ).toEqual(['chords', 'strumming'])
    expect(
      availableLayers([
        { measures: [{ beats: [{ d: 4, notes: [{ s: 1, f: 3 }] }] }] },
      ]),
    ).toEqual(['tab', 'notes'])
  })

  test('a song never opens with all of its layers hidden', () => {
    const hidden = { ...DEFAULT_LAYERS, tab: false, notes: false }
    expect(effectiveLayers(hidden, ['tab', 'notes']).tab).toBe(true)
    expect(effectiveLayers(hidden, ['lyrics', 'tab'])).toBe(hidden)
  })

  test('the last visible layer stays on', () => {
    const only = { ...DEFAULT_LAYERS, chords: false }
    expect(toggleLayer(only, 'lyrics', ['lyrics', 'chords'])).toBe(only)
    expect(toggleLayer(only, 'chords', ['lyrics', 'chords']).chords).toBe(true)
  })

  test('stored preferences', () => {
    expect(parseLayers('{"notes":true,"tab":false}')).toEqual({
      ...DEFAULT_LAYERS,
      notes: true,
      tab: false,
    })
    expect(parseLayers('nope')).toBeNull()
  })
})
