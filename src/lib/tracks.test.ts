import { describe, expect, test } from 'bun:test'
import {
  availableLayers,
  DEFAULT_LAYERS,
  effectiveLayers,
  layersFromMode,
  parseLayers,
  toggleLayer,
} from './sheet-layers.ts'
import {
  allTracks,
  meaningfulLabel,
  onVisibleTrack,
  trackOf,
  usedTracks,
} from './tracks.ts'

describe('tracks', () => {
  const stored = [
    { id: 'guitar', name: 'Rhythm guitar' },
    { id: 'abc', name: 'Lead riff' },
  ]

  test('built-in tracks come first and can be renamed', () => {
    expect(allTracks(stored)).toEqual([
      { id: 'vocals', name: undefined, builtIn: true },
      { id: 'guitar', name: 'Rhythm guitar', builtIn: true },
      { id: 'abc', name: 'Lead riff', builtIn: false },
    ])
  })

  test('parts without a known track use the one for their kind', () => {
    expect(trackOf({ kind: 'chart' })).toBe('vocals')
    expect(trackOf({ kind: 'tab', trackId: 'gone' }, stored)).toBe('guitar')
    expect(trackOf({ kind: 'tab', trackId: 'abc' }, stored)).toBe('abc')
  })

  test('only tracks with parts are offered as filters', () => {
    const parts = [{ kind: 'tab' as const, trackId: 'abc' }]
    expect(usedTracks(stored, parts).map((track) => track.id)).toEqual(['abc'])
    expect(onVisibleTrack(parts[0] ?? { kind: 'tab' }, stored, ['abc'])).toBe(
      true,
    )
    expect(onVisibleTrack({ kind: 'chart' }, stored, ['abc'])).toBe(false)
    expect(onVisibleTrack({ kind: 'chart' }, stored, [])).toBe(true)
  })

  test('generic labels are dropped', () => {
    expect(meaningfulLabel(' Tab ')).toBe('')
    expect(meaningfulLabel('Text & Akkorde')).toBe('')
    expect(meaningfulLabel('Solo riff')).toBe('Solo riff')
  })
})

describe('sheet layers', () => {
  test('layers come from the content', () => {
    expect(
      availableLayers([{ kind: 'chart', chartBody: '[G]Hello [D]world' }]),
    ).toEqual(['lyrics', 'chords'])
    expect(
      availableLayers([
        { kind: 'chart', chartBody: '| G | D |\n[Em] [C]', strumming: 'DDUD' },
      ]),
    ).toEqual(['chords', 'strumming'])
    expect(
      availableLayers([
        {
          kind: 'tab',
          measures: [{ beats: [{ d: 4, notes: [{ s: 1, f: 3 }] }] }],
        },
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

  test('stored and legacy preferences', () => {
    expect(parseLayers('{"notes":true,"tab":false}')).toEqual({
      ...DEFAULT_LAYERS,
      notes: true,
      tab: false,
    })
    expect(parseLayers('nope')).toBeNull()
    expect(layersFromMode('chords')?.lyrics).toBe(false)
    expect(layersFromMode('lyrics')?.tab).toBe(false)
    expect(layersFromMode('both')).toBeNull()
  })
})
