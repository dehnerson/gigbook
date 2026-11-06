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
                  beats: z.array(
                    z.object({
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
                    }),
                  ),
                }),
              )
              .optional(),
            rhythmGuessed: z.boolean().optional(),
          }),
        ),
      }),
    )
    .default([]),
  mapping: z.array(z.string().nullable()).optional(),
})

export type DraftOutput = z.infer<typeof draftSchema>
