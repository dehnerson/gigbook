import { v } from 'convex/values'
import type { Doc, Id } from './_generated/dataModel'
import { internalQuery, mutation, query } from './_generated/server'
import type { QueryCtx } from './_generated/server'
import { tabMeasure } from './schema'
import {
  canEditSong,
  canReadSong,
  requireIdentity,
  songOfVersion,
} from './lib/access'
import { fail } from './lib/errors'
import { cloneVersionTree, deleteVersionTree } from './lib/cascade'
import { findSongByKey, insertSong, uniqueVersionName } from './lib/songs'
import { songKey } from '../src/lib/song-key'
import { transposeSymbol } from '../src/lib/music/chords'
import { transposeChordPro } from '../src/lib/music/chordpro'
import { previewTabShift } from '../src/lib/music/tab'

const MAX_REPEAT = 16

function token() {
  return crypto.randomUUID().replaceAll('-', '').slice(0, 12)
}

async function loadVersion(ctx: QueryCtx, versionId: Id<'versions'>) {
  const version = await ctx.db.get(versionId)
  if (!version) fail('NOT_FOUND')
  const song = await songOfVersion(ctx, version)
  return { version, song }
}

async function libraryCopyOf(
  ctx: QueryCtx,
  version: Doc<'versions'>,
  userId: string,
) {
  if (version.createdBy === userId && !version.bandId) {
    return { songId: version.songId, versionId: version._id }
  }
  const copies = await ctx.db
    .query('versions')
    .withIndex('by_parent_creator', (q) =>
      q.eq('parentVersionId', version._id).eq('createdBy', userId),
    )
    .collect()
  const personal = copies.find((copy) => !copy.bandId)
  return personal ? { songId: personal.songId, versionId: personal._id } : null
}

async function bundle(ctx: any, version: any, song: any, canEdit: boolean) {
  const sections = await ctx.db
    .query('sections')
    .withIndex('by_version', (q: any) => q.eq('versionId', version._id))
    .collect()
  const parts = await ctx.db
    .query('parts')
    .withIndex('by_version', (q: any) => q.eq('versionId', version._id))
    .collect()
  const shapes = await ctx.db
    .query('chordShapes')
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
  return { version, song, timeline, shapes, canEdit }
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
    await canReadSong(ctx, song)
    let canEdit = true
    try {
      await canEditSong(ctx, song)
    } catch {
      canEdit = false
    }
    return bundle(ctx, version, song, canEdit)
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
    return {
      ...(await bundle(ctx, version, song, false)),
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
    const { version, song } = await loadVersion(ctx, args.versionId)
    await canEditSong(ctx, song)
    const { versionId, artist, ...rest } = args
    const performer = artist?.trim()
    await ctx.db.patch(versionId, {
      ...rest,
      ...(artist !== undefined
        ? {
            artist:
              performer && performer !== song.artist ? performer : undefined,
          }
        : {}),
    })
    return version._id
  },
})

export const saveWrittenKey = mutation({
  args: { versionId: v.id('versions'), semitones: v.number() },
  handler: async (ctx, args) => {
    const { version, song } = await loadVersion(ctx, args.versionId)
    await canEditSong(ctx, song)
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
    if (!preview.applied && args.semitones !== 0) fail('INVALID')
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
          measures: shifted.measures.map((measure) => ({
            chordAbove: measure.chordAbove
              ? transposeSymbol(measure.chordAbove, args.semitones)
              : undefined,
            events: measure.events.map((event) => ({
              position: event.position,
              notes: event.notes.map((note) => ({
                string: note.string,
                fret: note.fret,
                ...(note.technique ? { technique: note.technique } : {}),
                ...(note.bendSemitones !== undefined
                  ? { bendSemitones: note.bendSemitones }
                  : {}),
              })),
            })),
          })),
        })
      }
    }
    await ctx.db.patch(version._id, {
      concertKey: transposeSymbol(version.concertKey, args.semitones),
    })
  },
})

export const duplicate = mutation({
  args: { versionId: v.id('versions') },
  handler: async (ctx, args) => {
    const identity = await requireIdentity(ctx)
    const { version, song } = await loadVersion(ctx, args.versionId)
    try {
      await canReadSong(ctx, song)
    } catch {
      if (!version.shareToken) fail('FORBIDDEN')
    }
    const existing = await libraryCopyOf(ctx, version, identity.subject)
    if (existing) return { ...existing, existing: true, joinedSong: undefined }
    const sameSong = await findSongByKey(
      ctx,
      { userId: identity.subject },
      songKey(song.title, song.artist),
    )
    const copySongId =
      sameSong?._id ??
      (await insertSong(ctx, {
        title: song.title,
        artist: song.artist,
        createdBy: identity.subject,
      }))
    const copyVersionId = await cloneVersionTree(ctx, version, {
      songId: copySongId,
      name: sameSong
        ? await uniqueVersionName(ctx, copySongId, version.name)
        : version.name,
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

export const copy = mutation({
  args: { versionId: v.id('versions'), name: v.string() },
  handler: async (ctx, args) => {
    const { version, song } = await loadVersion(ctx, args.versionId)
    const identity = await canEditSong(ctx, song)
    return cloneVersionTree(ctx, version, {
      songId: song._id,
      name: args.name.trim() || version.name,
      bandId: version.bandId,
      createdBy: identity.subject,
    })
  },
})

export const remove = mutation({
  args: { versionId: v.id('versions') },
  handler: async (ctx, args) => {
    const { version, song } = await loadVersion(ctx, args.versionId)
    await canEditSong(ctx, song)
    const siblings = await ctx.db
      .query('versions')
      .withIndex('by_song', (q) => q.eq('songId', song._id))
      .collect()
    if (siblings.length <= 1) fail('LAST_VERSION')
    await deleteVersionTree(ctx, version._id)
    return song._id
  },
})

export const ensureShare = mutation({
  args: { versionId: v.id('versions') },
  handler: async (ctx, args) => {
    const { version, song } = await loadVersion(ctx, args.versionId)
    await canEditSong(ctx, song)
    const shareToken = version.shareToken ?? token()
    await ctx.db.patch(version._id, { shareToken })
    return shareToken
  },
})

export const addSection = mutation({
  args: { versionId: v.id('versions'), name: v.string() },
  handler: async (ctx, args) => {
    const { version, song } = await loadVersion(ctx, args.versionId)
    await canEditSong(ctx, song)
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
    const { version, song } = await loadVersion(ctx, args.versionId)
    await canEditSong(ctx, song)
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
    const { version, song } = await loadVersion(ctx, args.versionId)
    await canEditSong(ctx, song)
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
        chartBody: part.chartBody,
        strumming: part.strumming,
        measures: part.measures,
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
    const { version, song } = await loadVersion(ctx, args.versionId)
    await canEditSong(ctx, song)
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
    const { version, song } = await loadVersion(ctx, args.versionId)
    await canEditSong(ctx, song)
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
    const { song } = await loadVersion(ctx, section.versionId)
    await canEditSong(ctx, song)
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
    const { version, song } = await loadVersion(ctx, args.versionId)
    await canEditSong(ctx, song)
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

export const addPart = mutation({
  args: {
    sectionId: v.id('sections'),
    kind: v.union(v.literal('chart'), v.literal('tab')),
    label: v.string(),
  },
  handler: async (ctx, args) => {
    const section = await ctx.db.get(args.sectionId)
    if (!section) fail('NOT_FOUND')
    const { song } = await loadVersion(ctx, section.versionId)
    await canEditSong(ctx, song)
    const existing = await ctx.db
      .query('parts')
      .withIndex('by_section', (q) => q.eq('sectionId', section._id))
      .collect()
    return ctx.db.insert('parts', {
      sectionId: section._id,
      versionId: section.versionId,
      kind: args.kind,
      label: args.label.trim() || (args.kind === 'chart' ? 'Chords' : 'Tab'),
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
    chartBody: v.optional(v.string()),
    strumming: v.optional(v.string()),
    measures: v.optional(v.array(tabMeasure)),
  },
  handler: async (ctx, args) => {
    const part = await ctx.db.get(args.partId)
    if (!part) fail('NOT_FOUND')
    const { song } = await loadVersion(ctx, part.versionId)
    await canEditSong(ctx, song)
    await ctx.db.patch(part._id, {
      ...(args.label !== undefined ? { label: args.label } : {}),
      ...(args.chartBody !== undefined ? { chartBody: args.chartBody } : {}),
      ...(args.strumming !== undefined ? { strumming: args.strumming } : {}),
      ...(args.measures !== undefined ? { measures: args.measures } : {}),
    })
  },
})

export const removePart = mutation({
  args: { partId: v.id('parts') },
  handler: async (ctx, args) => {
    const part = await ctx.db.get(args.partId)
    if (!part) return
    const { song } = await loadVersion(ctx, part.versionId)
    await canEditSong(ctx, song)
    await ctx.db.delete(part._id)
  },
})

export const upsertShape = mutation({
  args: {
    versionId: v.id('versions'),
    symbol: v.string(),
    frets: v.array(v.number()),
  },
  handler: async (ctx, args) => {
    const { version, song } = await loadVersion(ctx, args.versionId)
    await canEditSong(ctx, song)
    const shapes = await ctx.db
      .query('chordShapes')
      .withIndex('by_version', (q) => q.eq('versionId', version._id))
      .collect()
    const existing = shapes.find((shape) => shape.symbol === args.symbol)
    if (existing) await ctx.db.patch(existing._id, { frets: args.frets })
    else {
      await ctx.db.insert('chordShapes', {
        versionId: version._id,
        symbol: args.symbol,
        frets: args.frets,
      })
    }
  },
})
