import { describe, expect, test } from 'bun:test'
import { songKey } from './song-key.ts'

describe('songKey', () => {
  test('ignores case, accents, punctuation and a leading "the"', () => {
    expect(songKey('The Weight', 'The Band')).toBe(songKey('weight', 'band'))
    expect(songKey('Ça plane pour moi', 'Plastic Bertrand')).toBe(
      songKey('ca plane pour moi!', 'plastic  bertrand'),
    )
    expect(songKey("Don't Stop Me Now", 'Queen')).toBe(
      songKey('Dont Stop Me Now', 'Queen'),
    )
  })

  test('treats & as and, and an unknown artist as empty', () => {
    expect(songKey('Mrs. Robinson', 'Simon & Garfunkel')).toBe(
      songKey('Mrs Robinson', 'Simon and Garfunkel'),
    )
    expect(songKey('Wonderwall', 'Unknown')).toBe(songKey('Wonderwall', ''))
  })

  test('keeps different artists apart', () => {
    expect(songKey('Hallelujah', 'Leonard Cohen')).not.toBe(
      songKey('Hallelujah', 'Jeff Buckley'),
    )
  })
})
