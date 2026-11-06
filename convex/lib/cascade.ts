import type { MutationCtx } from '../_generated/server'
import type { Doc, Id } from '../_generated/dataModel'

export async function cloneVersionTree(
  ctx: MutationCtx,
  version: Doc<'versions'>,
  target: {
    songId: Id<'songs'>
    name: string
    bandId?: Id<'bands'>
    createdBy: string
  },
) {
  const copyVersionId = await ctx.db.insert('versions', {
    songId: target.songId,
    name: target.name,
    artist: version.artist,
    concertKey: version.concertKey,
    timeSignature: version.timeSignature,
    bpm: version.bpm,
    tuning: version.tuning,
    suggestedCapo: version.suggestedCapo,
    timeline: [],
    parentVersionId: version._id,
    bandId: target.bandId,
    createdBy: target.createdBy,
  })
  const sections = await ctx.db
    .query('sections')
    .withIndex('by_version', (q) => q.eq('versionId', version._id))
    .collect()
  const idMap = new Map<Id<'sections'>, Id<'sections'>>()
  for (const section of sections) {
    const newId = await ctx.db.insert('sections', {
      versionId: copyVersionId,
      name: section.name,
      notes: section.notes,
    })
    idMap.set(section._id, newId)
    const parts = await ctx.db
      .query('parts')
      .withIndex('by_section', (q) => q.eq('sectionId', section._id))
      .collect()
    for (const part of parts) {
      await ctx.db.insert('parts', {
        sectionId: newId,
        versionId: copyVersionId,
        kind: part.kind,
        label: part.label,
        chartBody: part.chartBody,
        strumming: part.strumming,
        measures: part.measures,
        order: part.order,
      })
    }
  }
  const shapes = await ctx.db
    .query('chordShapes')
    .withIndex('by_version', (q) => q.eq('versionId', version._id))
    .collect()
  for (const shape of shapes)
    await ctx.db.insert('chordShapes', {
      versionId: copyVersionId,
      symbol: shape.symbol,
      shift: shape.shift,
      frets: shape.frets,
      fingers: shape.fingers,
    })
  await ctx.db.patch(copyVersionId, {
    timeline: version.timeline.flatMap((entry) => {
      const sectionId = idMap.get(entry.sectionId)
      return sectionId
        ? [{ entryId: crypto.randomUUID(), sectionId, repeat: entry.repeat }]
        : []
    }),
  })
  return copyVersionId
}

export async function deleteVersionTree(
  ctx: MutationCtx,
  versionId: Id<'versions'>,
) {
  const sections = await ctx.db
    .query('sections')
    .withIndex('by_version', (q) => q.eq('versionId', versionId))
    .collect()
  const parts = await ctx.db
    .query('parts')
    .withIndex('by_version', (q) => q.eq('versionId', versionId))
    .collect()
  const shapes = await ctx.db
    .query('chordShapes')
    .withIndex('by_version', (q) => q.eq('versionId', versionId))
    .collect()
  const items = await ctx.db
    .query('setlistItems')
    .withIndex('by_version', (q) => q.eq('versionId', versionId))
    .collect()
  for (const part of parts) await ctx.db.delete(part._id)
  for (const section of sections) await ctx.db.delete(section._id)
  for (const shape of shapes) await ctx.db.delete(shape._id)
  for (const item of items) await ctx.db.delete(item._id)
  await ctx.db.delete(versionId)
}
