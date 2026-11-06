import { v } from 'convex/values'
import { internal } from './_generated/api'
import type { Id } from './_generated/dataModel'
import { internalMutation, mutation, query } from './_generated/server'
import type { MutationCtx } from './_generated/server'
import {
  canEditSong,
  canReadSong,
  membership,
  requireIdentity,
} from './lib/access'
import { fail } from './lib/errors'
import { deleteVersionTree } from './lib/cascade'
import { findSongByKey, insertSong, uniqueVersionName } from './lib/songs'
import { STANDARD_TUNING } from '../src/lib/music/diagrams'
import { songKey } from '../src/lib/song-key'

export const list = query({
  args: {},
  handler: async (ctx) => {
    const identity = await requireIdentity(ctx)
    const own = await ctx.db
      .query('songs')
      .withIndex('by_creator', (q) => q.eq('createdBy', identity.subject))
      .collect()
    const memberships = await ctx.db
      .query('memberships')
      .withIndex('by_user', (q) => q.eq('userId', identity.subject))
      .collect()
    const bandSongs = (
      await Promise.all(
        memberships.map((row) =>
          ctx.db
            .query('songs')
            .withIndex('by_band', (q) => q.eq('bandId', row.bandId))
            .collect(),
        ),
      )
    ).flat()
    const byId = new Map<string, (typeof own)[number]>()
    for (const song of [...own, ...bandSongs]) byId.set(song._id, song)
    return [...byId.values()].sort((a, b) => a.title.localeCompare(b.title))
  },
})

export const catalog = query({
  args: {},
  handler: async (ctx) => {
    const identity = await requireIdentity(ctx)
    const own = await ctx.db
      .query('songs')
      .withIndex('by_creator', (q) => q.eq('createdBy', identity.subject))
      .collect()
    const memberships = await ctx.db
      .query('memberships')
      .withIndex('by_user', (q) => q.eq('userId', identity.subject))
      .collect()
    const bandSongs = (
      await Promise.all(
        memberships.map((row) =>
          ctx.db
            .query('songs')
            .withIndex('by_band', (q) => q.eq('bandId', row.bandId))
            .collect(),
        ),
      )
    ).flat()
    const byId = new Map<string, (typeof own)[number]>()
    for (const song of [...own, ...bandSongs]) byId.set(song._id, song)
    const songs = [...byId.values()].sort((a, b) =>
      a.title.localeCompare(b.title),
    )
    const bandNames = new Map<string, string>()
    for (const row of memberships) {
      const band = await ctx.db.get(row.bandId)
      if (band) bandNames.set(band._id, band.name)
    }
    return Promise.all(
      songs.map(async (song) => {
        const versions = await ctx.db
          .query('versions')
          .withIndex('by_song', (q) => q.eq('songId', song._id))
          .collect()
        return {
          song,
          versions,
          bandName: song.bandId ? bandNames.get(song.bandId) : undefined,
        }
      }),
    )
  },
})

export const get = query({
  args: { songId: v.id('songs') },
  handler: async (ctx, args) => {
    const song = await ctx.db.get(args.songId)
    if (!song) fail('NOT_FOUND')
    await canReadSong(ctx, song)
    const versions = await ctx.db
      .query('versions')
      .withIndex('by_song', (q) => q.eq('songId', song._id))
      .collect()
    let canEdit = true
    try {
      await canEditSong(ctx, song)
    } catch {
      canEdit = false
    }
    const band = song.bandId ? await ctx.db.get(song.bandId) : null
    return {
      song,
      versions: versions.sort((a, b) => a._creationTime - b._creationTime),
      canEdit,
      bandName: band?.name,
    }
  },
})

export const create = mutation({
  args: {
    title: v.string(),
    artist: v.string(),
    bandId: v.optional(v.id('bands')),
    versionName: v.string(),
    concertKey: v.string(),
  },
  handler: async (ctx, args) => {
    const identity = await requireIdentity(ctx)
    if (args.bandId) {
      const row = await membership(ctx.db, args.bandId, identity.subject)
      if (!row || row.role === 'viewer') fail('FORBIDDEN')
    }
    const title = args.title.trim() || 'Untitled'
    const artist = args.artist.trim() || 'Unknown'
    const existing = await findSongByKey(
      ctx,
      { userId: identity.subject, bandId: args.bandId },
      songKey(title, artist),
    )
    if (existing) return { existing: existing._id, title: existing.title }
    const songId = await insertSong(ctx, {
      title,
      artist,
      createdBy: identity.subject,
      bandId: args.bandId,
    })
    const versionId = await insertBlankVersion(ctx, {
      songId,
      name: args.versionName.trim() || 'Standard',
      concertKey: args.concertKey,
      bandId: args.bandId,
      createdBy: identity.subject,
    })
    return { songId, versionId }
  },
})

export const addVersion = mutation({
  args: {
    songId: v.id('songs'),
    versionName: v.string(),
    concertKey: v.string(),
  },
  handler: async (ctx, args) => {
    const song = await ctx.db.get(args.songId)
    if (!song) fail('NOT_FOUND')
    const identity = await canEditSong(ctx, song)
    const versionId = await insertBlankVersion(ctx, {
      songId: song._id,
      name: await uniqueVersionName(
        ctx,
        song._id,
        args.versionName.trim() || 'Standard',
      ),
      concertKey: args.concertKey,
      bandId: song.bandId,
      createdBy: identity.subject,
    })
    return { songId: song._id, versionId }
  },
})

export const similar = query({
  args: {
    title: v.string(),
    artist: v.string(),
    bandId: v.optional(v.id('bands')),
  },
  handler: async (ctx, args) => {
    const identity = await requireIdentity(ctx)
    const title = args.title.trim()
    if (title.length < 2) return []
    if (
      args.bandId &&
      !(await membership(ctx.db, args.bandId, identity.subject))
    )
      return []
    const bandId = args.bandId
    const matches = await ctx.db
      .query('songs')
      .withSearchIndex('search_title', (q) =>
        bandId
          ? q.search('title', title).eq('bandId', bandId)
          : q.search('title', title).eq('createdBy', identity.subject),
      )
      .take(20)
    const key = songKey(title, args.artist)
    return matches
      .filter((song) => (bandId ? true : !song.bandId))
      .map((song) => ({
        _id: song._id,
        title: song.title,
        artist: song.artist,
        exact: (song.key ?? songKey(song.title, song.artist)) === key,
      }))
      .sort((a, b) => Number(b.exact) - Number(a.exact))
      .slice(0, 5)
  },
})

export const backfillKeys = internalMutation({
  args: { cursor: v.optional(v.union(v.string(), v.null())) },
  handler: async (ctx, args) => {
    const page = await ctx.db
      .query('songs')
      .paginate({ cursor: args.cursor ?? null, numItems: 100 })
    for (const song of page.page) {
      const key = songKey(song.title, song.artist)
      if (song.key !== key) await ctx.db.patch(song._id, { key })
    }
    if (!page.isDone)
      await ctx.scheduler.runAfter(0, internal.songs.backfillKeys, {
        cursor: page.continueCursor,
      })
  },
})

async function insertBlankVersion(
  ctx: MutationCtx,
  fields: {
    songId: Id<'songs'>
    name: string
    concertKey: string
    bandId?: Id<'bands'>
    createdBy: string
  },
) {
  return ctx.db.insert('versions', {
    ...fields,
    concertKey: fields.concertKey.trim() || 'C',
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
    artist: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const song = await ctx.db.get(args.songId)
    if (!song) fail('NOT_FOUND')
    await canEditSong(ctx, song)
    const title = args.title?.trim() || song.title
    const artist = args.artist?.trim() || song.artist
    await ctx.db.patch(song._id, {
      title,
      artist,
      key: songKey(title, artist),
    })
  },
})

export const remove = mutation({
  args: { songId: v.id('songs') },
  handler: async (ctx, args) => {
    const song = await ctx.db.get(args.songId)
    if (!song) return
    await canEditSong(ctx, song)
    const versions = await ctx.db
      .query('versions')
      .withIndex('by_song', (q) => q.eq('songId', song._id))
      .collect()
    for (const version of versions) await deleteVersionTree(ctx, version._id)
    await ctx.db.delete(song._id)
  },
})
