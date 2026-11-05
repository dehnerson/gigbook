import { v } from 'convex/values'
import { mutation, query } from './_generated/server'
import {
  canEditSong,
  canReadSong,
  membership,
  requireIdentity,
} from './lib/access'
import { fail } from './lib/errors'
import { deleteVersionTree } from './lib/cascade'
import { STANDARD_TUNING } from '../src/lib/music/diagrams'

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
    const songId = await ctx.db.insert('songs', {
      title: args.title.trim() || 'Untitled',
      artist: args.artist.trim() || 'Unknown',
      createdBy: identity.subject,
      bandId: args.bandId,
    })
    const versionId = await ctx.db.insert('versions', {
      songId,
      name: args.versionName.trim() || 'Standard',
      concertKey: args.concertKey.trim() || 'C',
      timeSignature: '4/4',
      tuning: [...STANDARD_TUNING],
      suggestedCapo: 0,
      timeline: [],
      bandId: args.bandId,
      createdBy: identity.subject,
    })
    return { songId, versionId }
  },
})

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
    const title = args.title?.trim()
    const artist = args.artist?.trim()
    await ctx.db.patch(song._id, {
      ...(title ? { title } : {}),
      ...(artist ? { artist } : {}),
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
