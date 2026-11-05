import type {
  BeatMeasure,
  BeatNote,
  Duration,
  TabBeat,
} from '@/lib/music/tab-beats'

export type TestPiece = {
  id: string
  name: string
  description: string
  timeSignature: string
  tempo: number
  tuning: Array<string>
  measures: Array<BeatMeasure>
}

const STANDARD = ['E2', 'A2', 'D3', 'G3', 'B3', 'E4']

function n(spec: string): BeatNote {
  const match = spec.match(/^(\d+)\.(\d)([hpb/\\~])?(\d)?$/)
  if (!match) throw new Error(`Bad note ${spec}`)
  const note: BeatNote = { f: Number(match[1]), s: Number(match[2]) }
  if (match[3]) note.t = match[3] as BeatNote['t']
  if (match[4]) note.bend = Number(match[4])
  return note
}

function b(
  d: Duration,
  notes: string,
  extra: Partial<Omit<TabBeat, 'd' | 'notes'>> = {},
): TabBeat {
  return {
    d,
    notes: notes ? notes.split(' ').map(n) : [],
    ...extra,
  }
}

function rest(d: Duration, extra: Partial<TabBeat> = {}): TabBeat {
  return { d, rest: true, notes: [], ...extra }
}

const riff: TestPiece = {
  id: 'riff',
  name: 'Riff',
  description: 'Mixed note lengths, rests, dotted notes, chords and a repeat.',
  timeSignature: '4/4',
  tempo: 96,
  tuning: STANDARD,
  measures: [
    {
      repeat: { start: true },
      beats: [
        b(8, '0.6', { chord: 'Em' }),
        b(8, '0.6'),
        b(8, '3.6'),
        b(16, '0.6'),
        b(16, '2.5'),
        rest(4),
        b(4, '2.5 2.4 0.3'),
      ],
    },
    {
      repeat: { times: 2 },
      beats: [
        b(4, '3.6', { chord: 'G', dot: true }),
        b(8, '5.5'),
        b(4, '3.6 2.5 0.4 0.3'),
        b(4, '5.5 4.4 2.3 3.2', { chord: 'D' }),
      ],
    },
    {
      beats: [
        b(8, '0.6 2.5 2.4', { chord: 'Em' }),
        b(8, '0.6 2.5 2.4'),
        rest(8),
        b(8, '0.6 2.5 2.4'),
        b(2, '0.5 2.4 2.3 2.2', { chord: 'A' }),
      ],
    },
    {
      beats: [b(1, '0.6 2.5 2.4 0.3 0.2 0.1', { chord: 'Em' })],
    },
  ],
}

const lick: TestPiece = {
  id: 'lick',
  name: 'Lick',
  description: 'Hammer-ons, pull-offs, bends, slides and vibrato on 16ths.',
  timeSignature: '4/4',
  tempo: 84,
  tuning: STANDARD,
  measures: [
    {
      beats: [
        b(16, '5.3h', { chord: 'Am' }),
        b(16, '7.3'),
        b(8, '5.2'),
        b(16, '8.2p'),
        b(16, '5.2'),
        b(8, '7.3'),
        b(4, '7.2b2'),
        b(4, '5.1~'),
      ],
    },
    {
      beats: [
        b(8, '7.3/', { chord: 'G' }),
        b(8, '9.3'),
        b(16, '7.2'),
        b(16, '5.2'),
        b(8, '7.3'),
        b(2, '5.3~', { chord: 'Am' }),
      ],
    },
    {
      beats: [
        b(16, '8.1p', { chord: 'F' }),
        b(16, '5.1'),
        b(16, '8.2p'),
        b(16, '5.2'),
        b(8, '7.3b1'),
        b(8, '5.3'),
        b(16, '7.4h'),
        b(16, '9.4'),
        b(8, '7.4'),
        b(4, '10.3\\'),
      ],
    },
    {
      beats: [b(2, '5.4 7.3 5.2', { chord: 'Am', dot: true }), rest(4)],
    },
  ],
}

function eighths(chord: string, notes: Array<string>): Array<TabBeat> {
  return notes.map((spec, index) => b(8, spec, index === 0 ? { chord } : {}))
}

const solo: TestPiece = {
  id: 'solo',
  name: 'Solo (3/4)',
  description:
    'Ten bars that wrap across lines, with a repeat and 1st/2nd endings.',
  timeSignature: '3/4',
  tempo: 120,
  tuning: STANDARD,
  measures: [
    {
      repeat: { start: true },
      beats: eighths('Am', ['5.1', '8.1', '5.2', '8.2', '7.3', '5.3']),
    },
    { beats: eighths('F', ['5.2', '6.2', '7.3', '5.3', '7.4', '5.4']) },
    { beats: eighths('C', ['8.1', '5.1', '8.2', '5.2', '7.3', '5.3']) },
    { beats: eighths('G', ['7.3', '5.3', '7.4', '5.4', '7.5', '5.5']) },
    {
      beats: [
        b(4, '5.4 5.3 5.2', { chord: 'Am' }),
        b(8, '7.3h'),
        b(8, '9.3'),
        b(8, '7.2'),
        b(8, '10.2b2'),
      ],
    },
    {
      beats: [
        b(16, '12.1p', { chord: 'Dm' }),
        b(16, '10.1'),
        b(16, '13.2p'),
        b(16, '10.2'),
        b(8, '12.3'),
        b(8, '10.3'),
        b(4, '12.4~'),
      ],
    },
    {
      ending: 1,
      repeat: { times: 2 },
      beats: [b(4, '7.2', { chord: 'E', dot: true }), b(8, '5.2'), b(4, '4.3')],
    },
    {
      ending: 2,
      beats: [
        b(8, '5.1', { chord: 'E7' }),
        b(8, '4.1'),
        b(8, '7.2'),
        b(8, '5.2'),
        b(8, '4.3'),
        b(8, '6.3'),
      ],
    },
    {
      beats: [
        b(4, '7.3 5.2 5.1', { chord: 'Am' }),
        b(4, '5.3 5.2 5.1', { chord: 'Dm' }),
        b(4, '4.3 5.2 4.1', { chord: 'E' }),
      ],
    },
    { beats: [b(2, '7.4 5.3 5.2 5.1', { chord: 'Am', dot: true })] },
  ],
}

export const TEST_PIECES = [riff, lick, solo]
