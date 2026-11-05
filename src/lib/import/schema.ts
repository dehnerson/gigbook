import { z } from 'zod'

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
        parts: z.array(
          z.object({
            kind: z.enum(['chart', 'tab']),
            label: z.string().default('Part'),
            chartBody: z.string().optional(),
            strumming: z.string().optional(),
            measures: z
              .array(
                z.object({
                  chordAbove: z.string().optional(),
                  events: z.array(
                    z.object({
                      position: z.number(),
                      notes: z.array(
                        z.object({
                          string: z.number(),
                          fret: z.number(),
                          technique: z.enum(['h', 'p', 'b', '/']).optional(),
                          bendSemitones: z.number().optional(),
                        }),
                      ),
                    }),
                  ),
                }),
              )
              .optional(),
          }),
        ),
      }),
    )
    .default([]),
  mapping: z.array(z.string().nullable()).optional(),
})

export type DraftOutput = z.infer<typeof draftSchema>
