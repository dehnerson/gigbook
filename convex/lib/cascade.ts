import type { MutationCtx } from '../_generated/server'
import type { Doc, Id } from '../_generated/dataModel'

export async function cloneVersionTree(
  ctx: MutationCtx,
  version: Doc<'versions'>,
  target: {
    songId: Id<'songs'>
    name: string
    createdBy: string
    bandId?: Id<'bands'>
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
    tracks: version.tracks,
    timeline: [],
    parentVersionId: version._id,
    createdBy: target.createdBy,
    ...(target.bandId ? { bandId: target.bandId } : {}),
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
        trackId: part.trackId,
        chartBody: part.chartBody,
        strumming: part.strumming,
        measures: part.measures,
        rhythmGuessed: part.rhythmGuessed,
        repeat: part.repeat,
        order: part.order,
      })
    }
  }
  const shapes = await ctx.db
    .query('versionChordShapes')
    .withIndex('by_version', (q) => q.eq('versionId', version._id))
    .collect()
  for (const shape of shapes)
    await ctx.db.insert('versionChordShapes', {
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

export async function removeSetlistItem(
  ctx: MutationCtx,
  item: Doc<'setlistItems'>,
) {
  const items = await ctx.db
    .query('setlistItems')
    .withIndex('by_setlist', (q) => q.eq('setlistId', item.setlistId))
    .collect()
  const ordered = items.sort((a, b) => a.order - b.order)
  const index = ordered.findIndex((row) => row._id === item._id)
  const rest = ordered.filter((row) => row._id !== item._id)
  await ctx.db.delete(item._id)
  const rooms = await ctx.db
    .query('jamRooms')
    .withIndex('by_setlist', (q) => q.eq('setlistId', item.setlistId))
    .collect()
  for (const room of rooms) {
    let setlistIndex = room.setlistIndex
    if (index >= 0 && setlistIndex > index) setlistIndex -= 1
    if (rest.length === 0) setlistIndex = 0
    else if (setlistIndex >= rest.length) setlistIndex = rest.length - 1
    const landed = rest.at(setlistIndex)
    await ctx.db.patch(room._id, {
      setlistIndex,
      ...(room.versionId === item.versionId
        ? { versionId: landed?.versionId }
        : {}),
    })
  }
}

async function clearJamVersion(ctx: MutationCtx, versionId: Id<'versions'>) {
  const rooms = await ctx.db
    .query('jamRooms')
    .withIndex('by_version', (q) => q.eq('versionId', versionId))
    .collect()
  for (const room of rooms)
    await ctx.db.patch(room._id, { versionId: undefined })
  const members = await ctx.db
    .query('jamMembers')
    .withIndex('by_personal_version', (q) =>
      q.eq('personalVersionId', versionId),
    )
    .collect()
  for (const member of members)
    await ctx.db.patch(member._id, { personalVersionId: undefined })
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
    .query('versionChordShapes')
    .withIndex('by_version', (q) => q.eq('versionId', versionId))
    .collect()
  const items = await ctx.db
    .query('setlistItems')
    .withIndex('by_version', (q) => q.eq('versionId', versionId))
    .collect()
  for (const part of parts) await ctx.db.delete(part._id)
  for (const section of sections) await ctx.db.delete(section._id)
  for (const shape of shapes) await ctx.db.delete(shape._id)
  for (const item of items) await removeSetlistItem(ctx, item)
  await clearJamVersion(ctx, versionId)
  const drafts = await ctx.db
    .query('importDrafts')
    .withIndex('by_target', (q) => q.eq('targetVersionId', versionId))
    .collect()
  for (const draft of drafts)
    await ctx.db.patch(draft._id, { targetVersionId: undefined })
  await ctx.db.delete(versionId)
}

export async function deleteSetlist(
  ctx: MutationCtx,
  setlistId: Id<'setlists'>,
) {
  const rooms = await ctx.db
    .query('jamRooms')
    .withIndex('by_setlist', (q) => q.eq('setlistId', setlistId))
    .collect()
  for (const room of rooms)
    await ctx.db.patch(room._id, { setlistId: undefined, setlistIndex: 0 })
  const items = await ctx.db
    .query('setlistItems')
    .withIndex('by_setlist', (q) => q.eq('setlistId', setlistId))
    .collect()
  for (const item of items) await ctx.db.delete(item._id)
  await ctx.db.delete(setlistId)
}
