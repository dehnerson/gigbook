import { describe, expect, test } from 'bun:test'
import { tabChords } from '../music/tab.ts'
import { parseTuning, readMetaLine, splitTitleArtist } from './meta.ts'
import { IMPORT_SAMPLES } from './samples.ts'
import { parseSongText } from './text.ts'

function sample(id: string, locale: 'en' | 'de' = 'en') {
  const found = IMPORT_SAMPLES.find((item) => item.id === id)
  if (!found) throw new Error(id)
  return parseSongText(found.text, locale)
}

function names(id: string, locale: 'en' | 'de' = 'en') {
  return sample(id, locale).draft.sections.map((section) => section.name)
}

function chart(id: string, sectionIndex: number, locale: 'en' | 'de' = 'en') {
  return sample(id, locale).draft.sections[sectionIndex]?.parts[0]?.chartBody
}

describe('metadata lines', () => {
  test('reads capo, key, tempo, time and strumming', () => {
    expect(readMetaLine('Capo: 2nd fret')).toEqual({ capo: 2 })
    expect(readMetaLine('Kapodaster im 3. Bund')).toEqual({ capo: 3 })
    expect(readMetaLine('Capo: no capo')).toEqual({ capo: 0 })
    expect(readMetaLine('Key: F#m')).toEqual({ key: 'F#m' })
    expect(readMetaLine('Tonart: h-moll')).toEqual({ key: 'Bm' })
    expect(readMetaLine('Tempo: 120 bpm')).toEqual({ bpm: 120 })
    expect(readMetaLine('Time: 6/8')).toEqual({ timeSignature: '6/8' })
    expect(readMetaLine('Strumming: D DU UDU')).toEqual({
      strumming: 'D DU UDU',
    })
  })

  test('leaves lyric lines that start with a field word alone', () => {
    expect(readMetaLine('Time is on my side')).toBeNull()
    expect(readMetaLine('Strumming my pain with his fingers')).toBeNull()
  })

  test('reads named and spelled-out tunings', () => {
    expect(parseTuning('E A D G B E')).toEqual([
      'E2',
      'A2',
      'D3',
      'G3',
      'B3',
      'E4',
    ])
    expect(parseTuning('DADGAD')).toEqual(['D2', 'A2', 'D3', 'G3', 'A3', 'D4'])
    expect(parseTuning('Drop D')).toEqual(['D2', 'A2', 'D3', 'G3', 'B3', 'E4'])
    expect(parseTuning('Half step down')).toEqual([
      'Eb2',
      'Ab2',
      'Db3',
      'Gb3',
      'Bb3',
      'Eb4',
    ])
  })

  test('splits title and artist', () => {
    expect(splitTitleArtist('Wonderwall Chords by Oasis')).toEqual({
      title: 'Wonderwall',
      artist: 'Oasis',
    })
    expect(splitTitleArtist('Stand By Me')).toEqual({ title: 'Stand By Me' })
    expect(splitTitleArtist('Hallelujah - Leonard Cohen')).toEqual({
      title: 'Hallelujah',
      artist: 'Leonard Cohen',
    })
  })
})

describe('text import samples', () => {
  test('Ultimate Guitar copy-paste', () => {
    const result = sample('rising-sun')
    expect(result.draft).toMatchObject({
      title: 'House Of The Rising Sun',
      artist: 'Traditional',
      concertKey: 'Am',
      suggestedCapo: 0,
    })
    expect(names('rising-sun')).toEqual(['Intro', 'Verse 1', 'Riff', 'Verse 2'])
    expect(result.draft.sections[2]?.parts[0]?.kind).toBe('tab')
    expect(result.stats.tabMeasures).toBe(2)
  })

  test('German songbook with numbered verses and H chords', () => {
    const result = sample('gedanken', 'de')
    expect(result.draft).toMatchObject({
      title: 'Die Gedanken sind frei',
      artist: 'Unknown',
      suggestedCapo: 2,
      concertKey: 'E',
    })
    expect(names('gedanken', 'de')).toEqual(['Strophe 1', 'Strophe 2'])
    expect(chart('gedanken', 0, 'de')?.split('\n')[0]).toBe(
      '[D]Die Gedanken sind f[A7]rei, wer[D] kann sie erraten?',
    )
    expect(chart('gedanken', 0, 'de')).toContain('wiss[Bm]en')
  })

  test('ChordPro file', () => {
    const result = sample('amazing-grace')
    expect(result.draft).toMatchObject({
      title: 'Amazing Grace',
      artist: 'John Newton',
      concertKey: 'G',
      timeSignature: '3/4',
      bpm: 80,
    })
    expect(names('amazing-grace')).toEqual(['Verse 1', 'Verse 2'])
    expect(chart('amazing-grace', 0)?.split('\n')[0]).toBe(
      'A[G]mazing [G7]grace, how [C]sweet the [G]sound',
    )
  })

  test('names sections by structure when there are no headers', () => {
    expect(names('susanna')).toEqual(['Verse 1', 'Chorus', 'Verse 2', 'Chorus'])
    expect(sample('susanna').draft.artist).toBe('Stephen Foster')
  })

  test('colon headers, chords on the header line and strumming', () => {
    const result = sample('scarborough')
    expect(names('scarborough')).toEqual(['Intro', 'Verse 1'])
    expect(result.draft.sections[0]?.parts[0]).toMatchObject({
      chartBody: '[Am]  [G]  [Am]',
      strumming: 'D DU DU',
    })
    expect(result.draft).toMatchObject({ bpm: 100, timeSignature: '3/4' })
  })

  test('tab with chord names above it', () => {
    const result = sample('greensleeves')
    const tab = result.draft.sections[0]?.parts[0]
    expect(tab?.kind).toBe('tab')
    expect(tabChords(tab?.measures ?? [])).toEqual(['Am', 'G'])
    expect(tab?.rhythmGuessed).toBe(true)
    expect(result.draft.artist).toBe('Traditional')
  })

  test('bar grid and repeat count', () => {
    const result = sample('swing-low')
    expect(result.draft.sections[0]).toMatchObject({
      name: 'Chorus',
      notes: '×2',
    })
    expect(chart('swing-low', 1)).toBe(
      '| G | C G | G | D |\n| G | C G | G D | G |',
    )
    expect(result.draft).toMatchObject({ suggestedCapo: 3, concertKey: 'Bb' })
  })

  test('Ultimate Guitar raw markup', () => {
    expect(chart('danny-boy', 0)?.split('\n')[0]).toBe(
      '[C]Oh Danny bo[C7]y, the pi[F]pes, the pi[C]pes are calling',
    )
  })

  test('flags lyrics without chords as weak', () => {
    const result = sample('auld-lang-syne')
    expect(result.strong).toBe(false)
    expect(result.warnings).toEqual(['noChords'])
    expect(result.draft.title).toBe('Auld Lang Syne')
  })

  test('chords in parentheses', () => {
    expect(chart('saints', 0)?.split('\n')[2]).toBe(
      'Oh Lord I [C]want to [C7]be in that [F]number',
    )
  })

  test('every sample except lyrics-only converts without AI', () => {
    const strong = IMPORT_SAMPLES.filter(
      (item) =>
        parseSongText(item.text, item.id === 'gedanken' ? 'de' : 'en').strong,
    ).map((item) => item.id)
    expect(strong).toHaveLength(IMPORT_SAMPLES.length - 1)
  })
})
