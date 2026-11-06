import { v } from 'convex/values'
import { internal } from './_generated/api'
import { internalMutation } from './_generated/server'
import { hasLegacyMeasures, toTabMeasures } from '../src/lib/music/tab'

const cursor = v.optional(v.union(v.string(), v.null()))

export const tabBeats = internalMutation({
  args: { cursor },
  handler: async (ctx, args) => {
    const page = await ctx.db
      .query('parts')
      .paginate({ cursor: args.cursor ?? null, numItems: 100 })
    for (const part of page.page) {
      if (!hasLegacyMeasures(part.measures)) continue
      await ctx.db.patch(part._id, {
        measures: toTabMeasures(part.measures),
        rhythmGuessed: true,
      })
    }
    if (page.isDone)
      await ctx.scheduler.runAfter(0, internal.migrations.tabBeatDrafts, {})
    else
      await ctx.scheduler.runAfter(0, internal.migrations.tabBeats, {
        cursor: page.continueCursor,
      })
  },
})

export const tabBeatDrafts = internalMutation({
  args: { cursor },
  handler: async (ctx, args) => {
    const page = await ctx.db
      .query('importDrafts')
      .paginate({ cursor: args.cursor ?? null, numItems: 50 })
    for (const draft of page.page) {
      const output = draft.output
      if (
        !output?.sections.some((section) =>
          section.parts.some((part) => hasLegacyMeasures(part.measures)),
        )
      )
        continue
      await ctx.db.patch(draft._id, {
        output: {
          ...output,
          sections: output.sections.map((section) => ({
            ...section,
            parts: section.parts.map((part) =>
              hasLegacyMeasures(part.measures)
                ? {
                    ...part,
                    measures: toTabMeasures(part.measures),
                    rhythmGuessed: true,
                  }
                : part,
            ),
          })),
        },
      })
    }
    if (!page.isDone)
      await ctx.scheduler.runAfter(0, internal.migrations.tabBeatDrafts, {
        cursor: page.continueCursor,
      })
  },
})
