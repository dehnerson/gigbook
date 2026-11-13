import { v } from 'convex/values'
import type { Doc, Id } from './_generated/dataModel'
import { internalQuery, mutation, query } from './_generated/server'
import type { DatabaseReader, MutationCtx, QueryCtx } from './_generated/server'
import { tabMeasure } from './schema'
import {
  canEditBand,
  canEditVersion,
  canReadVersion,
  edits,
  findVisibleSong,
  openGate,
  presentVersion,
  requireIdentity,
  sees,
  songOfVersion,
  versionView,
  bandNames,
} from './lib/access'
import { fail } from './lib/errors'
import { cloneVersionTree } from './lib/cascade'
import { copyVersion, deleteVersion, moveVersion } from './lib/ownership'
import { insertSong, uniqueVersionName } from './lib/songs'
import {
  DEFAULT_TRACK,
  isBuiltInTrack,
  meaningfulLabel,
  trackOf,
} from '../src/lib/tracks'
import { transposeSymbol } from '../src/lib/music/chords'
import { newShareToken, sameSecret } from '../src/lib/share-token'
import { transposeChordPro } from '../src/lib/music/chordpro'
import {
  cleanTabMeasures,
  mapTabChords,
  previewTabShift,
} from '../src/lib/music/tab'

const MAX_REPEAT = 16

async function loadVersion(ctx: QueryCtx, versionId: Id<'versions'>) {
  const version = await ctx.db.get(versionId)
  if (!version) fail('NOT_FOUND')
  const song = await songOfVersion(ctx, version)
  return { version, song }
}

async function editing(ctx: QueryCtx, versionId: Id<'versions'>) {
  const loaded = await loadVersion(ctx, versionId)
  await canEditVersion(ctx, loaded.version)
  return loaded
}

async function libraryCopyOf(
  ctx: QueryCtx,
  version: Doc<'versions'>,
  userId: string,
) {
  if (!version.bandId && version.createdBy === userId)
    return { songId: version.songId, versionId: version._id }
  const copies = await ctx.db
    .query('versions')
    .withIndex('by_parent_creator', (q) =>
      q.eq('parentVersionId', version._id).eq('createdBy', userId),
    )
    .collect()
  const mine = copies
    .filter((copy) => !copy.bandId)
    .sort((a, b) => b._creationTime - a._creationTime)
  if (mine.length === 0) return null
  const copy = mine[0]
  return { songId: copy.songId, versionId: copy._id }
}

async function bundle(
  ctx: { db: DatabaseReader },
  version: Doc<'versions'>,
  song: Doc<'songs'>,
  canEdit: boolean,
) {
  const sections = await ctx.db
    .query('sections')
    .withIndex('by_version', (q: any) => q.eq('versionId', version._id))
    .collect()
  const parts = await ctx.db
    .query('parts')
    .withIndex('by_version', (q: any) => q.eq('versionId', version._id))
    .collect()
  const shapes = await ctx.db
    .query('versionChordShapes')
    .withIndex('by_version', (q: any) => q.eq('versionId', version._id))
    .collect()
  const bySection = new Map(
    sections.map((section: any) => [section._id, section]),
  )
  const timeline = version.timeline
    .map((entry: any) => {
      const section: any = bySection.get(entry.sectionId)
      if (!section) return null
      return {
        ...entry,
        section,
        parts: parts
          .filter((part: any) => part.sectionId === section._id)
          .sort((a: any, b: any) => a.order - b.order),
      }
    })
    .filter(Boolean)
  const versionCount = (
    await ctx.db
      .query('versions')
      .withIndex('by_song', (q: any) => q.eq('songId', song._id))
      .collect()
  ).length
  return {
    version: presentVersion(version),
    song,
    timeline,
    shapes,
    canEdit,
    versionCount,
  }
}

export const sectionIndex = internalQuery({
  args: { versionId: v.id('versions') },
  handler: async (ctx, args) => {
    const sections = await ctx.db
      .query('sections')
      .withIndex('by_version', (q) => q.eq('versionId', args.versionId))
      .collect()
    return sections.map((section) => ({ id: section._id, name: section.name }))
  },
})

export const getBundle = query({
  args: { versionId: v.id('versions') },
  handler: async (ctx, args) => {
    const { version, song } = await loadVersion(ctx, args.versionId)
    const identity = await canReadVersion(ctx, version)
    const gate = await openGate(ctx, identity.subject)
    const names = await bandNames(ctx, [version.bandId])
    return {
      ...versionView(version, gate, names),
      ...(await bundle(ctx, version, song, edits(version, gate))),
    }
  },
})

export const getByShare = query({
  args: { token: v.string() },
  handler: async (ctx, args) => {
    const identity = await requireIdentity(ctx)
    const version = await ctx.db
      .query('versions')
      .withIndex('by_share', (q) => q.eq('shareToken', args.token))
      .unique()
    if (!version) fail('NOT_FOUND')
    const song = await songOfVersion(ctx, version)
    const names = await bandNames(ctx, [version.bandId])
    const packed = await bundle(ctx, version, song, false)
    return {
      version: packed.version,
      song: {
        title: song.title,
        ...(song.subTitle !== undefined ? { subTitle: song.subTitle } : {}),
      },
      timeline: packed.timeline,
      shapes: packed.shapes,
      ownerBandId: version.bandId ?? null,
      ownerName: version.bandId ? (names.get(version.bandId) ?? null) : null,
      libraryCopy: await libraryCopyOf(ctx, version, identity.subject),
    }
  },
})

export const updateMeta = mutation({
  args: {
    versionId: v.id('versions'),
    name: v.optional(v.string()),
    artist: v.optional(v.string()),
    concertKey: v.optional(v.string()),
    timeSignature: v.optional(v.string()),
    bpm: v.optional(v.number()),
    tuning: v.optional(v.array(v.string())),
    suggestedCapo: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const { version } = await editing(ctx, args.versionId)
    const { versionId, artist, ...rest } = args
    await ctx.db.patch(versionId, {
      ...rest,
      ...(artist !== undefined
        ? {
            artist: artist.trim(),
          }
        : {}),
    })
    return version._id
  },
})

export const saveWrittenKey = mutation({
  args: { versionId: v.id('versions'), semitones: v.number() },
  handler: async (ctx, args) => {
    const { version } = await editing(ctx, args.versionId)
    if (args.semitones === 0) return
    const parts = await ctx.db
      .query('parts')
      .withIndex('by_version', (q) => q.eq('versionId', version._id))
      .collect()
    const preview = previewTabShift(
      parts
        .filter((part) => part.kind === 'tab')
        .flatMap((part) => part.measures ?? []),
      args.semitones,
    )
    if (!preview.applied) fail('INVALID')
    for (const part of parts) {
      if (part.kind === 'chart' && part.chartBody) {
        await ctx.db.patch(part._id, {
          chartBody: transposeChordPro(part.chartBody, args.semitones),
        })
      }
      if (part.kind === 'tab' && part.measures) {
        const shifted = previewTabShift(part.measures, args.semitones)
        if (!shifted.applied) fail('INVALID')
        await ctx.db.patch(part._id, {
          measures: cleanTabMeasures(
            mapTabChords(shifted.measures, (symbol) =>
              transposeSymbol(symbol, args.semitones),
            ),
          ),
        })
      }
    }
    await ctx.db.patch(version._id, {
      concertKey: transposeSymbol(version.concertKey, args.semitones),
    })
  },
})

export const duplicate = mutation({
  args: { versionId: v.id('versions'), token: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const identity = await requireIdentity(ctx)
    const { version, song } = await loadVersion(ctx, args.versionId)
    const gate = await openGate(ctx, identity.subject)
    const party = sees(version, gate)
    if (!party && !sameSecret(version.shareToken, args.token)) fail('FORBIDDEN')

    if (party) {
      const before = await priorId(ctx, version, { userId: identity.subject })
      const versionId = await copyVersion(ctx, version, {
        userId: identity.subject,
      })
      return {
        songId: version.songId,
        versionId,
        existing: versionId === before,
        joinedSong: undefined,
      }
    }

    const sameSong = await findVisibleSong(ctx, gate, song.title)
    const copySongId =
      sameSong?._id ??
      (await insertSong(ctx, {
        title: song.title,
        subTitle: song.subTitle,
        createdBy: identity.subject,
      }))
    const copyVersionId = await cloneVersionTree(ctx, version, {
      songId: copySongId,
      name: await uniqueVersionName(ctx, copySongId, version.name, {
        userId: identity.subject,
      }),
      createdBy: identity.subject,
    })
    return {
      songId: copySongId,
      versionId: copyVersionId,
      existing: false,
      joinedSong: sameSong?.title,
    }
  },
})

export const copyTo = mutation({
  args: { versionId: v.id('versions'), bandId: v.optional(v.id('bands')) },
  handler: async (ctx, args) => {
    const { version } = await loadVersion(ctx, args.versionId)
    const identity = args.bandId
      ? await canEditVersion(ctx, version)
      : await canReadVersion(ctx, version)
    if (args.bandId) await canEditBand(ctx, args.bandId)
    if (args.bandId && version.bandId === args.bandId)
      return {
        songId: version.songId,
        versionId: version._id,
        existing: true,
      }
    const before = await priorId(ctx, version, {
      userId: identity.subject,
      bandId: args.bandId,
    })
    const versionId = await copyVersion(ctx, version, {
      userId: identity.subject,
      bandId: args.bandId,
    })
    return { songId: version.songId, versionId, existing: versionId === before }
  },
})

async function priorId(
  ctx: MutationCtx,
  version: Doc<'versions'>,
  owner: { userId: string; bandId?: Id<'bands'> },
) {
  const rows = await ctx.db
    .query('versions')
    .withIndex('by_song', (q) => q.eq('songId', version.songId))
    .collect()
  return rows.find(
    (row) =>
      row.parentVersionId === version._id &&
      (owner.bandId
        ? row.bandId === owner.bandId
        : !row.bandId && row.createdBy === owner.userId),
  )?._id
}

export const moveTo = mutation({
  args: { versionId: v.id('versions'), bandId: v.optional(v.id('bands')) },
  handler: async (ctx, args) => {
    const { version } = await loadVersion(ctx, args.versionId)
    const identity = await canEditVersion(ctx, version)
    if (args.bandId) await canEditBand(ctx, args.bandId)
    const sameOwner = args.bandId
      ? version.bandId === args.bandId
      : !version.bandId && version.createdBy === identity.subject
    if (sameOwner) return { songId: version.songId, versionId: version._id }
    const versionId = await moveVersion(ctx, version, {
      userId: identity.subject,
      bandId: args.bandId,
    })
    return { songId: version.songId, versionId }
  },
})

export const copy = mutation({
  args: { versionId: v.id('versions'), name: v.string() },
  handler: async (ctx, args) => {
    const { version, song } = await editing(ctx, args.versionId)
    const identity = await requireIdentity(ctx)
    return cloneVersionTree(ctx, version, {
      songId: song._id,
      name: await uniqueVersionName(
        ctx,
        song._id,
        args.name.trim() || version.name,
        { userId: identity.subject, bandId: version.bandId },
      ),
      createdBy: identity.subject,
      bandId: version.bandId,
    })
  },
})

export const remove = mutation({
  args: { versionId: v.id('versions') },
  handler: async (ctx, args) => {
    const { version } = await editing(ctx, args.versionId)
    const result = await deleteVersion(ctx, version._id)
    return { songId: version.songId, deletedSong: result.deletedSong }
  },
})

export const ensureShare = mutation({
  args: { versionId: v.id('versions') },
  handler: async (ctx, args) => {
    const { version } = await editing(ctx, args.versionId)
    if (version.shareToken) return version.shareToken
    const shareToken = newShareToken()
    await ctx.db.patch(version._id, { shareToken })
    return shareToken
  },
})

export const rotateShare = mutation({
  args: { versionId: v.id('versions') },
  handler: async (ctx, args) => {
    const { version } = await editing(ctx, args.versionId)
    const shareToken = newShareToken()
    await ctx.db.patch(version._id, { shareToken })
    return shareToken
  },
})

export const revokeShare = mutation({
  args: { versionId: v.id('versions') },
  handler: async (ctx, args) => {
    const { version } = await editing(ctx, args.versionId)
    if (!version.shareToken) return
    await ctx.db.patch(version._id, { shareToken: undefined })
  },
})

export const addSection = mutation({
  args: { versionId: v.id('versions'), name: v.string() },
  handler: async (ctx, args) => {
    const { version } = await editing(ctx, args.versionId)
    const sectionId = await ctx.db.insert('sections', {
      versionId: version._id,
      name: args.name.trim() || 'Section',
    })
    await ctx.db.patch(version._id, {
      timeline: [
        ...version.timeline,
        { entryId: crypto.randomUUID(), sectionId },
      ],
    })
    return sectionId
  },
})

export const repeatSection = mutation({
  args: { versionId: v.id('versions'), sectionId: v.id('sections') },
  handler: async (ctx, args) => {
    const { version } = await editing(ctx, args.versionId)
    const section = await ctx.db.get(args.sectionId)
    if (!section || section.versionId !== version._id) fail('NOT_FOUND')
    await ctx.db.patch(version._id, {
      timeline: [
        ...version.timeline,
        { entryId: crypto.randomUUID(), sectionId: section._id },
      ],
    })
  },
})

export const detachEntry = mutation({
  args: { versionId: v.id('versions'), entryId: v.string() },
  handler: async (ctx, args) => {
    const { version } = await editing(ctx, args.versionId)
    const entry = version.timeline.find(
      (item: any) => item.entryId === args.entryId,
    )
    if (!entry) fail('NOT_FOUND')
    const section = await ctx.db.get(entry.sectionId)
    if (!section) fail('NOT_FOUND')
    const copyId = await ctx.db.insert('sections', {
      versionId: version._id,
      name: section.name,
      notes: section.notes,
    })
    const parts = await ctx.db
      .query('parts')
      .withIndex('by_section', (q) => q.eq('sectionId', section._id))
      .collect()
    for (const part of parts) {
      await ctx.db.insert('parts', {
        sectionId: copyId,
        versionId: version._id,
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
    await ctx.db.patch(version._id, {
      timeline: version.timeline.map((item) =>
        item.entryId === args.entryId ? { ...item, sectionId: copyId } : item,
      ),
    })
  },
})

export const setRepeat = mutation({
  args: {
    versionId: v.id('versions'),
    entryId: v.string(),
    repeat: v.number(),
  },
  handler: async (ctx, args) => {
    const { version } = await editing(ctx, args.versionId)
    const repeat = Math.round(args.repeat)
    if (repeat < 1 || repeat > MAX_REPEAT) fail('INVALID')
    if (!version.timeline.some((entry) => entry.entryId === args.entryId))
      fail('NOT_FOUND')
    await ctx.db.patch(version._id, {
      timeline: version.timeline.map((entry) =>
        entry.entryId === args.entryId
          ? { ...entry, repeat: repeat > 1 ? repeat : undefined }
          : entry,
      ),
    })
  },
})

export const reorderTimeline = mutation({
  args: { versionId: v.id('versions'), entryIds: v.array(v.string()) },
  handler: async (ctx, args) => {
    const { version } = await editing(ctx, args.versionId)
    const byId = new Map(
      version.timeline.map((entry) => [entry.entryId, entry]),
    )
    const timeline = args.entryIds.flatMap((entryId) => {
      const entry = byId.get(entryId)
      return entry ? [entry] : []
    })
    if (timeline.length !== version.timeline.length) fail('INVALID')
    await ctx.db.patch(version._id, { timeline })
  },
})

export const updateSection = mutation({
  args: {
    sectionId: v.id('sections'),
    name: v.optional(v.string()),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const section = await ctx.db.get(args.sectionId)
    if (!section) fail('NOT_FOUND')
    await editing(ctx, section.versionId)
    await ctx.db.patch(section._id, {
      ...(args.name !== undefined
        ? { name: args.name.trim() || section.name }
        : {}),
      ...(args.notes !== undefined ? { notes: args.notes } : {}),
    })
  },
})

export const removeEntry = mutation({
  args: { versionId: v.id('versions'), entryId: v.string() },
  handler: async (ctx, args) => {
    const { version } = await editing(ctx, args.versionId)
    const entry = version.timeline.find(
      (item: any) => item.entryId === args.entryId,
    )
    if (!entry) return
    const timeline = version.timeline.filter(
      (item: any) => item.entryId !== args.entryId,
    )
    await ctx.db.patch(version._id, { timeline })
    const stillUsed = timeline.some(
      (item: any) => item.sectionId === entry.sectionId,
    )
    if (!stillUsed) {
      const parts = await ctx.db
        .query('parts')
        .withIndex('by_section', (q) => q.eq('sectionId', entry.sectionId))
        .collect()
      for (const part of parts) await ctx.db.delete(part._id)
      await ctx.db.delete(entry.sectionId)
    }
  },
})

function storedTrackId(
  version: Doc<'versions'>,
  kind: Doc<'parts'>['kind'],
  trackId: string | undefined,
) {
  if (trackId === undefined) return undefined
  const id = trackOf({ kind, trackId }, version.tracks)
  if (id !== trackId) fail('NOT_FOUND')
  return id === DEFAULT_TRACK[kind] ? undefined : id
}

export const addPart = mutation({
  args: {
    sectionId: v.id('sections'),
    kind: v.union(v.literal('chart'), v.literal('tab')),
    label: v.optional(v.string()),
    trackId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const section = await ctx.db.get(args.sectionId)
    if (!section) fail('NOT_FOUND')
    const { version } = await editing(ctx, section.versionId)
    const existing = await ctx.db
      .query('parts')
      .withIndex('by_section', (q) => q.eq('sectionId', section._id))
      .collect()
    return ctx.db.insert('parts', {
      sectionId: section._id,
      versionId: section.versionId,
      kind: args.kind,
      label: meaningfulLabel(args.label ?? ''),
      trackId: storedTrackId(version, args.kind, args.trackId),
      chartBody: args.kind === 'chart' ? '' : undefined,
      measures: args.kind === 'tab' ? [] : undefined,
      order: existing.length,
    })
  },
})

export const updatePart = mutation({
  args: {
    partId: v.id('parts'),
    label: v.optional(v.string()),
    trackId: v.optional(v.string()),
    chartBody: v.optional(v.string()),
    strumming: v.optional(v.string()),
    measures: v.optional(v.array(tabMeasure)),
    rhythmGuessed: v.optional(v.boolean()),
    repeat: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const part = await ctx.db.get(args.partId)
    if (!part) fail('NOT_FOUND')
    const { version } = await editing(ctx, part.versionId)
    const repeat =
      args.repeat === undefined ? undefined : Math.round(args.repeat)
    if (repeat !== undefined && (repeat < 1 || repeat > MAX_REPEAT))
      fail('INVALID')
    await ctx.db.patch(part._id, {
      ...(repeat !== undefined
        ? { repeat: repeat > 1 ? repeat : undefined }
        : {}),
      ...(args.label !== undefined ? { label: args.label } : {}),
      ...(args.trackId !== undefined
        ? { trackId: storedTrackId(version, part.kind, args.trackId) }
        : {}),
      ...(args.chartBody !== undefined ? { chartBody: args.chartBody } : {}),
      ...(args.strumming !== undefined ? { strumming: args.strumming } : {}),
      ...(args.measures !== undefined ? { measures: args.measures } : {}),
      ...(args.rhythmGuessed !== undefined
        ? { rhythmGuessed: args.rhythmGuessed || undefined }
        : {}),
    })
  },
})

export const removePart = mutation({
  args: { partId: v.id('parts') },
  handler: async (ctx, args) => {
    const part = await ctx.db.get(args.partId)
    if (!part) return
    await editing(ctx, part.versionId)
    await ctx.db.delete(part._id)
  },
})

const MAX_TRACK_NAME = 60

function trackName(name: string) {
  const trimmed = name.trim().slice(0, MAX_TRACK_NAME)
  if (!trimmed) fail('INVALID')
  return trimmed
}

export const addTrack = mutation({
  args: { versionId: v.id('versions'), name: v.string() },
  handler: async (ctx, args) => {
    const { version } = await editing(ctx, args.versionId)
    const id = crypto.randomUUID().slice(0, 8)
    await ctx.db.patch(version._id, {
      tracks: [...(version.tracks ?? []), { id, name: trackName(args.name) }],
    })
    return id
  },
})

export const renameTrack = mutation({
  args: { versionId: v.id('versions'), trackId: v.string(), name: v.string() },
  handler: async (ctx, args) => {
    const { version } = await editing(ctx, args.versionId)
    const tracks = version.tracks ?? []
    const name = trackName(args.name)
    if (tracks.some((track) => track.id === args.trackId)) {
      await ctx.db.patch(version._id, {
        tracks: tracks.map((track) =>
          track.id === args.trackId ? { ...track, name } : track,
        ),
      })
    } else if (isBuiltInTrack(args.trackId)) {
      await ctx.db.patch(version._id, {
        tracks: [...tracks, { id: args.trackId, name }],
      })
    } else fail('NOT_FOUND')
  },
})

/** Built-in tracks go back to their default name; parts on a removed track fall back to the built-in one. */
export const removeTrack = mutation({
  args: { versionId: v.id('versions'), trackId: v.string() },
  handler: async (ctx, args) => {
    const { version } = await editing(ctx, args.versionId)
    await ctx.db.patch(version._id, {
      tracks: (version.tracks ?? []).filter(
        (track) => track.id !== args.trackId,
      ),
    })
    if (isBuiltInTrack(args.trackId)) return
    const parts = await ctx.db
      .query('parts')
      .withIndex('by_version', (q) => q.eq('versionId', version._id))
      .collect()
    for (const part of parts)
      if (part.trackId === args.trackId)
        await ctx.db.patch(part._id, { trackId: undefined })
  },
})
