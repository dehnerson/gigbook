import { z } from 'zod'

const beat = z.object({
  d: z.union([
    z.literal(1),
    z.literal(2),
    z.literal(4),
    z.literal(8),
    z.literal(16),
    z.literal(32),
  ]),
  dot: z.literal(true).optional(),
  rest: z.literal(true).optional(),
  chord: z.string().optional(),
  notes: z.array(
    z.object({
      s: z.number(),
      f: z.number(),
      t: z.enum(['h', 'p', 'b', '/', '\\', '~']).optional(),
      bend: z.number().optional(),
    }),
  ),
})

const measure = z.object({
  beats: z.array(beat),
  repeat: z
    .object({
      start: z.literal(true).optional(),
      times: z.number().optional(),
    })
    .optional(),
  ending: z.number().optional(),
})

export const draftSchema = z.object({
  title: z.string().default('Untitled'),
  artist: z.string().default('Unknown'),
  concertKey: z.string().default('C'),
  timeSignature: z.string().default('4/4'),
  bpm: z.number().optional(),
  tuning: z.array(z.string()).default(['E2', 'A2', 'D3', 'G3', 'B3', 'E4']),
  suggestedCapo: z.number().default(0),
  tabRelativeToCapo: z.boolean().default(false),
  sections: z
    .array(
      z.object({
        name: z.string(),
        notes: z.string().optional(),
        chartBody: z.string().optional(),
        strumming: z.string().optional(),
        repeat: z.number().optional(),
        lines: z
          .array(
            z.object({
              part: z.string().default('Guitar'),
              instrument: z.enum(['guitar', 'bass']).default('guitar'),
              measures: z.array(measure).optional(),
              rhythmGuessed: z.boolean().optional(),
            }),
          )
          .default([]),
      }),
    )
    .default([]),
  mapping: z.array(z.string().nullable()).optional(),
})

export type DraftOutput = z.infer<typeof draftSchema>
