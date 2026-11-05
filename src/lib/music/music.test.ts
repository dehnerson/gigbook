import { describe, expect, test } from 'bun:test'
import { displayChord, soundsAs, transposeSymbol } from './chords.ts'
import {
  chartChords,
  chordsOverLyricsToChordPro,
  isBarGridLine,
  isChordLine,
  normalizeCapoToConcert,
  sectionLabelOf,
  transposeChordPro,
} from './chordpro.ts'
import { lookupChordDiagram } from './diagrams.ts'
import { parseStrum } from './strum.ts'
import { parseAsciiTab, previewTabShift, serializeAsciiTab } from './tab.ts'
import {
  measureFill,
  noteName,
  shiftBeatMeasures,
  toAlphaTex,
} from './tab-beats.ts'

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
    const [measure] = shiftBeatMeasures(
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
    expect(measure?.beats[0]?.notes).toEqual([
      { s: 1, f: 1, unplayable: true },
      { s: 2, f: 3, unplayable: false },
    ])
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
})

describe('tabs', () => {
  test('parses fret numbers onto strings from high to low', () => {
    const measures = parseAsciiTab(
      'e|--0--2--|\nB|--1-----|\nG|--------|\nD|--------|\nA|--------|\nE|--------|',
    )
    expect(measures[0]?.events[0]?.notes).toEqual([
      { string: 1, fret: 0 },
      { string: 2, fret: 1 },
    ])
    expect(measures[0]?.events[1]?.notes).toEqual([{ string: 1, fret: 2 }])
  })

  test('shifts frets only when every note stays on the neck', () => {
    const measures = parseAsciiTab('e|--0--2--|')
    const blocked = previewTabShift(measures, -1)
    expect(blocked.applied).toBe(false)
    expect(blocked.measures[0]?.events[0]?.notes[0]?.unplayable).toBe(true)
    expect(blocked.measures[0]?.events[0]?.notes[0]?.fret).toBe(0)

    const moved = previewTabShift(measures, 1)
    expect(moved.applied).toBe(true)
    expect(
      moved.measures[0]?.events.map((event) => event.notes[0]?.fret),
    ).toEqual([1, 3])
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
    const measures = [
      {
        chordAbove: 'G',
        events: [
          { position: 0, notes: [{ string: 1, fret: 3 }] },
          {
            position: 1,
            notes: [
              { string: 2, fret: 10, technique: 'h' as const },
              { string: 6, fret: 3 },
            ],
          },
        ],
      },
      {
        chordAbove: 'Em',
        events: [{ position: 0, notes: [{ string: 3, fret: 0 }] }],
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
    expect(measures[1]?.events[0]?.notes).toEqual([
      { string: 1, fret: 2 },
      { string: 2, fret: 3 },
    ])
  })
})
