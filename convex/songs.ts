import { v } from 'convex/values'
import type { Id } from './_generated/dataModel'
import { mutation, query } from './_generated/server'
import type { MutationCtx } from './_generated/server'
import {
  bandNames,
  canEditBand,
  canReadSong,
  canRenameSong,
  findVisibleSong,
  openGate,
  readableVersions,
  requireIdentity,
  versionView,
  visibleVersions,
  writes,
} from './lib/access'
import { fail } from './lib/errors'
import { insertSong, uniqueVersionName } from './lib/songs'
import { STANDARD_TUNING } from '../src/lib/music/diagrams'

export const catalog = query({
  args: {},
  handler: async (ctx) => {
    const identity = await requireIdentity(ctx)
    const gate = await openGate(ctx, identity.subject)
    const versions = await visibleVersions(ctx, gate)
    const bySong = new Map<string, typeof versions>()
    for (const version of versions) {
      const rows = bySong.get(version.songId) ?? []
      rows.push(version)
      bySong.set(version.songId, rows)
    }
    const songs = (
      await Promise.all(
        [...bySong.keys()].map((id) => ctx.db.get(id as Id<'songs'>)),
      )
    ).filter((song): song is NonNullable<typeof song> => song !== null)
    songs.sort((a, b) => a.title.localeCompare(b.title))
    const names = await bandNames(
      ctx,
      versions.map((version) => version.bandId),
    )
    return songs.map((song) => ({
      song,
      versions: (bySong.get(song._id) ?? [])
        .sort((a, b) => a._creationTime - b._creationTime)
        .map((version) => versionView(version, gate, names)),
    }))
  },
})

export const get = query({
  args: { songId: v.id('songs'), bandId: v.optional(v.id('bands')) },
  handler: async (ctx, args) => {
    const song = await ctx.db.get(args.songId)
    if (!song) fail('NOT_FOUND')
    const identity = await canReadSong(ctx, song)
    const gate = await openGate(ctx, identity.subject)
    let visible = await readableVersions(ctx, song, gate)
    let band: { _id: Id<'bands'>; name: string } | null = null
    let canAdd = true
    if (args.bandId) {
      const membership = gate.bands.get(args.bandId)
      if (!membership) fail('FORBIDDEN')
      const found = await ctx.db.get(args.bandId)
      if (!found) fail('NOT_FOUND')
      band = { _id: found._id, name: found.name }
      visible = visible.filter((version) => version.bandId === args.bandId)
      canAdd = writes(membership)
    }
    const names = await bandNames(
      ctx,
      visible.map((version) => version.bandId),
    )
    const versions = visible.map((version) => versionView(version, gate, names))
    const all = await ctx.db
      .query('versions')
      .withIndex('by_song', (q) => q.eq('songId', song._id))
      .collect()
    return {
      song,
      versions,
      versionCount: all.length,
      canRename: versions.some((version) => version.canEdit),
      canAdd,
      band,
    }
  },
})

export const create = mutation({
  args: {
    title: v.string(),
    subTitle: v.optional(v.string()),
    bandId: v.optional(v.id('bands')),
    versionName: v.string(),
  },
  handler: async (ctx, args) => {
    const identity = await requireIdentity(ctx)
    if (args.bandId) await canEditBand(ctx, args.bandId)
    const title = args.title.trim() || 'Untitled'
    const subTitle = args.subTitle?.trim() || undefined
    const gate = await openGate(ctx, identity.subject)
    const existing = await findVisibleSong(ctx, gate, title)
    if (existing)
      return {
        existing: existing._id,
        title: existing.title,
        subTitle: existing.subTitle,
      }

    const songId = await insertSong(ctx, {
      title,
      subTitle,
      createdBy: identity.subject,
    })
    const versionId = await insertBlankVersion(ctx, {
      songId,
      name: args.versionName.trim() || 'Standard',
      createdBy: identity.subject,
      bandId: args.bandId,
    })
    return { songId, versionId }
  },
})

export const addVersion = mutation({
  args: {
    songId: v.id('songs'),
    versionName: v.string(),
    bandId: v.optional(v.id('bands')),
  },
  handler: async (ctx, args) => {
    const song = await ctx.db.get(args.songId)
    if (!song) fail('NOT_FOUND')
    const identity = await canReadSong(ctx, song)
    if (args.bandId) await canEditBand(ctx, args.bandId)
    const versionId = await insertBlankVersion(ctx, {
      songId: song._id,
      name: await uniqueVersionName(
        ctx,
        song._id,
        args.versionName.trim() || 'Standard',
        { userId: identity.subject, bandId: args.bandId },
      ),
      createdBy: identity.subject,
      bandId: args.bandId,
    })
    return { songId: song._id, versionId }
  },
})

export const similar = query({
  args: {
    title: v.string(),
    bandId: v.optional(v.id('bands')),
  },
  handler: async (ctx, args) => {
    const identity = await requireIdentity(ctx)
    const title = args.title.trim()
    if (title.length < 2) return []
    const gate = await openGate(ctx, identity.subject)
    const visible = new Set(
      (await visibleVersions(ctx, gate)).map((version) => version.songId),
    )
    const matches = await ctx.db
      .query('songs')
      .withSearchIndex('search_title', (q) => q.search('title', title))
      .take(20)
    return matches
      .filter((song) => visible.has(song._id))
      .map((song) => ({
        _id: song._id,
        title: song.title,
        subTitle: song.subTitle,
        exact: song.title === title,
      }))
      .sort((a, b) => Number(b.exact) - Number(a.exact))
      .slice(0, 5)
  },
})

async function insertBlankVersion(
  ctx: MutationCtx,
  fields: {
    songId: Id<'songs'>
    name: string
    createdBy: string
    bandId?: Id<'bands'>
  },
) {
  const { bandId, ...rest } = fields
  return ctx.db.insert('versions', {
    ...rest,
    ...(bandId ? { bandId } : {}),
    concertKey: 'C',
    timeSignature: '4/4',
    tuning: [...STANDARD_TUNING],
    suggestedCapo: 0,
    timeline: [],
  })
}

export const update = mutation({
  args: {
    songId: v.id('songs'),
    title: v.optional(v.string()),
    subTitle: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const song = await ctx.db.get(args.songId)
    if (!song) fail('NOT_FOUND')
    await canRenameSong(ctx, song)
    const title = args.title?.trim() || song.title
    const subTitle =
      args.subTitle === undefined
        ? song.subTitle
        : args.subTitle.trim() || undefined
    await ctx.db.patch(song._id, { title, subTitle })
    return { songId: song._id }
  },
})
