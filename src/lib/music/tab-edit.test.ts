import { describe, expect, test } from 'bun:test'
import {
  clearNote,
  deleteBar,
  deleteBeat,
  emptyBar,
  insertBar,
  moveBeat,
  placeShape,
  setDuration,
  setFret,
  toggleDot,
  toggleRest,
  toggleTechnique,
} from './tab-edit.ts'
import { measureFill } from './tab.ts'
import type { TabMeasure } from './tab.ts'

const start = { bar: 0, beat: 0, string: 1 }

describe('tab editing', () => {
  test('an empty bar fills the time signature', () => {
    expect(measureFill(emptyBar('4/4'), '4/4')).toBe('full')
    expect(measureFill(emptyBar('6/8'), '6/8')).toBe('full')
    expect(emptyBar('6/8').beats).toHaveLength(6)
  })

  test('frets replace rests and stay sorted by string', () => {
    let tab = [emptyBar('4/4')]
    tab = toggleRest(tab, start)
    tab = setFret(tab, { ...start, string: 3 }, 5)
    tab = setFret(tab, start, 30)
    const beat = tab[0]?.beats[0]
    expect(beat?.rest).toBeUndefined()
    expect(beat?.notes).toEqual([
      { s: 1, f: 22 },
      { s: 3, f: 5 },
    ])
    expect(clearNote(tab, start)[0]?.beats[0]?.notes).toEqual([{ s: 3, f: 5 }])
  })

  test('techniques toggle and bends get a default amount', () => {
    let tab = setFret([emptyBar('4/4')], start, 7)
    tab = toggleTechnique(tab, start, 'b')
    expect(tab[0]?.beats[0]?.notes[0]).toEqual({ s: 1, f: 7, t: 'b', bend: 2 })
    tab = toggleTechnique(tab, start, 'h')
    expect(tab[0]?.beats[0]?.notes[0]).toEqual({ s: 1, f: 7, t: 'h' })
    tab = toggleTechnique(tab, start, 'h')
    expect(tab[0]?.beats[0]?.notes[0]).toEqual({ s: 1, f: 7 })
  })

  test('32nd notes cannot be dotted', () => {
    let tab = toggleDot([emptyBar('4/4')], start)
    expect(tab[0]?.beats[0]?.dot).toBe(true)
    tab = setDuration(tab, start, 32)
    expect(tab[0]?.beats[0]).toEqual({ d: 32, notes: [] })
  })

  test('chord shapes map the lowest string to the highest number', () => {
    const tab = placeShape([emptyBar('4/4')], start, [-1, 3, 2, 0, 1, 0], 'C')
    expect(tab[0]?.beats[0]?.chord).toBe('C')
    expect(tab[0]?.beats[0]?.notes.map((note) => [note.s, note.f])).toEqual([
      [1, 0],
      [2, 1],
      [3, 0],
      [4, 2],
      [5, 3],
    ])
  })

  test('moving right past the end appends a beat only after content', () => {
    const one: Array<TabMeasure> = [{ beats: [{ d: 8, notes: [] }] }]
    expect(moveBeat(one, start, 1).measures).toBe(one)
    const filled = setFret(one, start, 3)
    const moved = moveBeat(filled, start, 1)
    expect(moved.cursor.beat).toBe(1)
    expect(moved.measures[0]?.beats[1]).toEqual({ d: 8, notes: [] })
  })

  test('moving crosses bar lines', () => {
    const tab = [emptyBar('2/4'), emptyBar('2/4')]
    expect(moveBeat(tab, { ...start, beat: 1 }, 1).cursor).toEqual({
      bar: 1,
      beat: 0,
      string: 1,
    })
    expect(moveBeat(tab, { ...start, bar: 1 }, -1).cursor).toEqual({
      bar: 0,
      beat: 1,
      string: 1,
    })
  })

  test('deleting the last beat removes the bar, but one bar always stays', () => {
    const tab = [{ beats: [{ d: 4 as const, notes: [] }] }, emptyBar('4/4')]
    expect(deleteBeat(tab, start, '4/4').measures).toHaveLength(1)
    expect(deleteBar([emptyBar('4/4')], start, '4/4').measures).toHaveLength(1)
    const added = insertBar(tab, start, '4/4')
    expect(added.measures).toHaveLength(3)
    expect(added.cursor).toEqual({ bar: 1, beat: 0, string: 1 })
  })
})
