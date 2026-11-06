import { describe, expect, test } from 'bun:test'
import { displayChord, soundsAs, transposeSymbol } from './chords.ts'
import {
  chartChords,
  chordsOverLyricsToChordPro,
  isBarGridLine,
  isChordLine,
  normalizeCapoToConcert,
  parseBarGrid,
  sectionLabelOf,
  transposeChordPro,
} from './chordpro.ts'
import { lookupChordDiagram } from './diagrams.ts'
import { parseStrum } from './strum.ts'
import {
  fromLegacyMeasure,
  keepRhythm,
  measureFill,
  noteName,
  parseAsciiTab,
  previewTabShift,
  serializeAsciiTab,
  toAlphaTex,
} from './tab.ts'
import type { TabMeasure } from './tab.ts'

describe('tab beats', () => {
  const tuning = ['E2', 'A2', 'D3', 'G3', 'B3', 'E4']

  test('checks that a bar adds up to the time signature', () => {
    const full = {
      beats: [
        { d: 4 as const, dot: true as const, notes: [] },
        { d: 8 as const, notes: [] },
        { d: 2 as const, notes: [] },
      ],
    }
    expect(measureFill(full, '4/4')).toBe('full')
    expect(measureFill(full, '3/4')).toBe('long')
    expect(measureFill({ beats: [{ d: 2, notes: [] }] }, '4/4')).toBe('short')
  })

  test('names notes from tuning and fret', () => {
    expect(noteName(tuning, { s: 6, f: 0 }, 'en')).toBe('E')
    expect(noteName(tuning, { s: 2, f: 1 }, 'en')).toBe('C')
    expect(noteName(tuning, { s: 5, f: 2 }, 'de')).toBe('H')
  })

  test('flags notes that leave the fretboard when shifted', () => {
    const shifted = previewTabShift(
      [
        {
          beats: [
            {
              d: 4,
              notes: [
                { s: 1, f: 1 },
                { s: 2, f: 5 },
              ],
            },
          ],
        },
      ],
      -2,
    )
    expect(shifted.applied).toBe(false)
    expect(shifted.measures[0]?.beats[0]?.notes).toEqual([
      { s: 1, f: 1, unplayable: true },
      { s: 2, f: 5, unplayable: false },
    ])
  })

  test('converts old event measures into eighth-note beats', () => {
    expect(
      fromLegacyMeasure({
        chordAbove: 'G',
        events: [
          {
            position: 0,
            notes: [{ string: 2, fret: 3, technique: 'h', bendSemitones: 1 }],
          },
          { position: 1, notes: [{ string: 1, fret: 0 }] },
        ],
      }),
    ).toEqual({
      beats: [
        { d: 8, chord: 'G', notes: [{ s: 2, f: 3, t: 'h', bend: 1 }] },
        { d: 8, notes: [{ s: 1, f: 0 }] },
      ],
    })
    expect(fromLegacyMeasure({ chordAbove: 'C', events: [] })).toEqual({
      beats: [{ d: 1, rest: true, chord: 'C', notes: [] }],
    })
  })

  test('keeps known note lengths when only frets change', () => {
    const before: Array<TabMeasure> = [
      {
        beats: [
          { d: 4, dot: true, notes: [{ s: 1, f: 0 }] },
          { d: 8, notes: [{ s: 1, f: 2 }] },
        ],
      },
    ]
    const edited = parseAsciiTab('e|--0--5--|')
    expect(keepRhythm(edited, before)[0]?.beats).toEqual([
      { d: 4, dot: true, notes: [{ s: 1, f: 0 }] },
      { d: 8, notes: [{ s: 1, f: 5 }] },
    ])
    const longer = parseAsciiTab('e|--0--5--7--|')
    expect(keepRhythm(longer, before)).toEqual(longer)
  })

  test('writes alphaTex with durations, effects, chords and repeats', () => {
    const tex = toAlphaTex(
      [
        {
          repeat: { start: true, times: 2 },
          beats: [
            { d: 8, chord: 'Am', notes: [{ s: 3, f: 5, t: 'h' }] },
            { d: 8, notes: [{ s: 3, f: 7 }] },
            { d: 4, dot: true, notes: [{ s: 2, f: 7, t: 'b', bend: 2 }] },
            { d: 8, rest: true, notes: [] },
          ],
        },
      ],
      { tuning, timeSignature: '3/4' },
    )
    expect(tex).toContain('\\tuning (E4 B3 G3 D3 A2 E2)')
    expect(tex).toContain('\\ts (3 4)')
    expect(tex).toContain(
      '\\ro \\rc 2 (5.3{h}).8{ch "Am"} (7.3).8 (7.2{b (0 4)}).4{d} r.8',
    )
  })
})

describe('chords', () => {
  test('transposes a minor chord and keeps the quality', () => {
    expect(transposeSymbol('Am', 2)).toBe('Bm')
    expect(transposeSymbol('F#m7', 1)).toBe('Gm7')
  })

  test('transposes slash chords', () => {
    expect(transposeSymbol('C/G', 2)).toBe('D/A')
  })

  test('keeps tokens that are not chords', () => {
    expect(transposeSymbol('N.C.', 2)).toBe('N.C.')
  })

  test('spells german roots', () => {
    expect(transposeSymbol('H', 0, 'de')).toBe('H')
    expect(transposeSymbol('B', 0, 'de')).toBe('B')
    expect(transposeSymbol('B', 2, 'de')).toBe('C')
    expect(displayChord('B', 0, 0, 'de')).toBe('H')
    expect(displayChord('Bb', 0, 0, 'de')).toBe('B')
  })

  test('capo changes the shape and the sounding key stays concert', () => {
    expect(displayChord('A', 2, 0)).toBe('G')
    expect(soundsAs('A', 0)).toBe('A')
    expect(displayChord('A', 2, -2)).toBe('F')
    expect(soundsAs('A', -2)).toBe('G')
  })
})

describe('chordpro', () => {
  test('shifts bracketed chords and leaves lyrics', () => {
    expect(transposeChordPro('[Am]Hello [G]friend', 2)).toBe(
      '[Bm]Hello [A]friend',
    )
  })

  test('recognizes a bar grid and lifts capo shapes to concert pitch', () => {
    expect(isBarGridLine('| Em | G D |')).toBe(true)
    expect(normalizeCapoToConcert('| G |', 2).body).toBe('| A |')
    expect(normalizeCapoToConcert('| G |', 2).suggestedCapo).toBe(2)
  })

  test('reads repeat signs, counts and endings in bar grids', () => {
    expect(parseBarGrid('|: Em | G D :| x4')).toEqual([
      { chords: ['Em'], start: true },
      { chords: ['G', 'D'], end: true, times: 4 },
    ])
    expect(parseBarGrid('|: A :|: B :|')).toEqual([
      { chords: ['A'], start: true, end: true },
      { chords: ['B'], start: true, end: true },
    ])
    expect(parseBarGrid('|:Am | 1. F :| 2. G || C | 3×')).toEqual([
      { chords: ['Am'], start: true },
      { chords: ['F'], end: true, ending: 1 },
      { chords: ['G'], ending: 2 },
      { chords: ['C'], times: 3 },
    ])
    expect(parseBarGrid('| Em | % |')).toEqual([
      { chords: ['Em'] },
      { chords: ['%'] },
    ])
  })

  test('transposes and lists chords in grids with repeat signs', () => {
    expect(transposeChordPro('|:Em | G D:| x4', 2)).toBe('|:F#m | A E:| x4')
    expect(chartChords('|:Em | 1. G D:|')).toEqual(['Em', 'G', 'D'])
  })
})

describe('tabs', () => {
  test('parses fret numbers onto strings from high to low', () => {
    const measures = parseAsciiTab(
      'e|--0--2--|\nB|--1-----|\nG|--------|\nD|--------|\nA|--------|\nE|--------|',
    )
    expect(measures[0]?.beats[0]?.notes).toEqual([
      { s: 1, f: 0 },
      { s: 2, f: 1 },
    ])
    expect(measures[0]?.beats[1]?.notes).toEqual([{ s: 1, f: 2 }])
  })

  test('guesses note lengths from the spacing', () => {
    const lengths = (ascii: string, time?: string) =>
      parseAsciiTab(ascii, time)[0]?.beats.map(
        (beat) => `${beat.d}${beat.dot ? '.' : ''}`,
      )
    expect(lengths('e|--0--2--3--5--|')).toEqual(['4', '4', '4', '4'])
    expect(lengths('e|-0-2-3-5-7-5-3-2-|')).toEqual(Array(8).fill('8'))
    expect(lengths('e|--0-------2---3---|')).toEqual(['2', '4', '4'])
    expect(lengths('e|--0--2--3--|', '3/4')).toEqual(['4', '4', '4'])
  })

  test('places chords on the beat below them', () => {
    const [measure] = parseAsciiTab(
      '   G       D\ne|--3---2---|\nB|--0---3---|',
    )
    expect(measure?.beats.map((beat) => beat.chord)).toEqual(['G', 'D'])
  })

  test('shifts frets only when every note stays on the neck', () => {
    const measures = parseAsciiTab('e|--0--2--|')
    const blocked = previewTabShift(measures, -1)
    expect(blocked.applied).toBe(false)
    expect(blocked.measures[0]?.beats[0]?.notes[0]?.unplayable).toBe(true)
    expect(blocked.measures[0]?.beats[0]?.notes[0]?.f).toBe(0)

    const moved = previewTabShift(measures, 1)
    expect(moved.applied).toBe(true)
    expect(moved.measures[0]?.beats.map((beat) => beat.notes[0]?.f)).toEqual([
      1, 3,
    ])
  })
})

describe('diagrams', () => {
  test('returns a known open shape and nothing for an unknown symbol', () => {
    expect(lookupChordDiagram('Am')?.frets).toEqual([-1, 0, 2, 2, 1, 0])
    expect(lookupChordDiagram('Am')?.fingers).toEqual([0, 0, 2, 3, 1, 0])
    expect(lookupChordDiagram('Xyz')).toBeNull()
    expect(lookupChordDiagram('N.C.')).toBeNull()
  })

  test('marks the barre and base fret of a barre chord', () => {
    const bm = lookupChordDiagram('Bm')
    expect(bm?.barre).toEqual({ fret: 2, from: 1, to: 5 })
    expect(bm?.baseFret).toBe(2)
    expect(lookupChordDiagram('F')?.barre).toEqual({ fret: 1, from: 0, to: 5 })
    expect(lookupChordDiagram('C')?.barre).toBeUndefined()
  })

  test('builds movable shapes for roots without an open shape', () => {
    expect(lookupChordDiagram('F#m')?.frets).toEqual([2, 4, 4, 2, 2, 2])
    expect(lookupChordDiagram('Bb')?.frets).toEqual([-1, 1, 3, 3, 3, 1])
    expect(lookupChordDiagram('C#m7')?.baseFret).toBe(4)
    expect(lookupChordDiagram('H7', 'de')?.frets).toEqual([-1, 2, 1, 2, 0, 2])
  })
})

describe('strumming', () => {
  test('reads eighth-note patterns with counts', () => {
    const pattern = parseStrum('D-DU-UDU')
    expect(pattern?.slots).toEqual([
      'down',
      'rest',
      'down',
      'up',
      'rest',
      'up',
      'down',
      'up',
    ])
    expect(pattern?.counts).toEqual(['1', '&', '2', '&', '3', '&', '4', '&'])
  })

  test('accepts arrows and spacing, and gives up on prose', () => {
    expect(parseStrum('↓ ↓↑ ↑↓↑', '3/4')?.slots.length).toBe(6)
    expect(parseStrum('↓ ↓↑ ↑↓↑', '3/4')?.counts).toEqual([
      '1',
      '&',
      '2',
      '&',
      '3',
      '&',
    ])
    expect(parseStrum('DDU')?.counts).toBeNull()
    expect(parseStrum('Folk pattern')).toBeNull()
    expect(parseStrum('----')).toBeNull()
  })
})

describe('chords over lyrics', () => {
  test('detects chord lines without mistaking german lyrics', () => {
    expect(isChordLine('Em      G       D     Asus4  Em')).toBe(true)
    expect(isChordLine('D   G   (2x)')).toBe(true)
    expect(isChordLine("Doch du musst mir vertrau'n")).toBe(false)
    expect(isChordLine('Bella, Bella Napoli')).toBe(false)
    expect(isChordLine('am Abend')).toBe(false)
  })

  test('places chords at their column in the following lyric line', () => {
    expect(
      chordsOverLyricsToChordPro(
        'D              G\nEines weiß ich genau, meine Stadt',
      ),
    ).toBe('[D]Eines weiß ich [G]genau, meine Stadt')
  })

  test('keeps chord-only lines and section labels', () => {
    expect(
      chordsOverLyricsToChordPro('[Intro]\nD   G   D   Asus4\n\nBella'),
    ).toBe('[Intro]\n[D]   [G]   [D]   [Asus4]\n\nBella')
    expect(sectionLabelOf('[Strophe]')).toBe('Strophe')
    expect(sectionLabelOf('[Am]')).toBeNull()
  })

  test('converts german chord names to concert spelling', () => {
    expect(chordsOverLyricsToChordPro('H  B\nla la', 'de')).toBe('[B]la [Bb]la')
  })

  test('collects the chords of a chart once, in order', () => {
    expect(chartChords('[G]one [D]two [G]three\n| Em | C |')).toEqual([
      'G',
      'D',
      'Em',
      'C',
    ])
  })
})

describe('tab round trip', () => {
  test('serializes measures back to ascii and parses them again', () => {
    const measures: Array<TabMeasure> = [
      {
        beats: [
          { d: 4, chord: 'G', notes: [{ s: 1, f: 3 }] },
          {
            d: 4,
            notes: [
              { s: 2, f: 10, t: 'h' },
              { s: 6, f: 3 },
            ],
          },
          { d: 2, chord: 'D', notes: [{ s: 1, f: 2 }] },
        ],
      },
      {
        beats: [{ d: 1, chord: 'Em', notes: [{ s: 3, f: 0 }] }],
      },
    ]
    const labels = ['e', 'B', 'G', 'D', 'A', 'E']
    const ascii = serializeAsciiTab(measures, labels)
    expect(parseAsciiTab(ascii)).toEqual(measures)
  })

  test('reads several tab systems in a row', () => {
    const ascii = 'e|--0--|\nB|-----|\n\ne|--2--|\nB|--3--|'
    const measures = parseAsciiTab(ascii)
    expect(measures.length).toBe(2)
    expect(measures[1]?.beats[0]?.notes).toEqual([
      { s: 1, f: 2 },
      { s: 2, f: 3 },
    ])
  })
})
