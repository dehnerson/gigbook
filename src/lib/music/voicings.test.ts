import { describe, expect, test } from 'vite-plus/test'
import { chordVoicings, fingersFor } from './voicings.ts'

describe('chordVoicings', () => {
  test('finds the familiar open shapes first', () => {
    expect(chordVoicings('C')[0]?.frets).toEqual([-1, 3, 2, 0, 1, 0])
    expect(chordVoicings('G')[0]?.frets).toEqual([3, 2, 0, 0, 0, 3])
    expect(chordVoicings('Em')[0]?.frets).toEqual([0, 2, 2, 0, 0, 0])
  })

  test('offers several alternatives, including barre shapes', () => {
    const shapes = chordVoicings('F')
    expect(shapes.length).toBeGreaterThan(2)
    expect(shapes.map((shape) => shape.frets.join(','))).toContain(
      '1,3,3,2,1,1',
    )
  })

  test('keeps the bass note of slash chords lowest', () => {
    expect(chordVoicings('D/F#')[0]?.frets[0]).toBe(2)
  })

  test('follows the tuning', () => {
    const dadgad = ['D2', 'A2', 'D3', 'G3', 'A3', 'D4']
    expect(chordVoicings('D', dadgad)[0]?.frets.slice(0, 3)).toEqual([0, 0, 0])
  })

  test('returns nothing for chords it cannot read', () => {
    expect(chordVoicings('N.C.')).toEqual([])
    expect(chordVoicings('C13#11b9')).toEqual([])
  })
})

describe('fingersFor', () => {
  test('uses a barre when a shape needs more than four fingers', () => {
    expect(fingersFor([1, 3, 3, 2, 1, 1])).toEqual([1, 3, 4, 2, 1, 1])
    expect(fingersFor([-1, 3, 2, 0, 1, 0])).toEqual([0, 3, 2, 0, 1, 0])
  })
})
