import { v } from 'convex/values'
import { mutation, query } from './_generated/server'
import {
  bandNames,
  canReadVersion,
  membership,
  openGate,
  permitted,
  requireIdentity,
  presentVersion,
  versionView,
  writes,
} from './lib/access'
import { deleteSetlist, removeSetlistItem } from './lib/cascade'
import { fail } from './lib/errors'

async function canEditSetlist(ctx: any, setlist: any, userId: string) {
  if (setlist.createdBy === userId && !setlist.bandId) return
  if (!setlist.bandId) fail('FORBIDDEN')
  if (!writes(await membership(ctx.db, setlist.bandId, userId)))
    fail('FORBIDDEN')
}

export const list = query({
  args: {},
  handler: async (ctx) => {
    const identity = await requireIdentity(ctx)
    const own = await ctx.db
      .query('setlists')
      .withIndex('by_creator', (q) => q.eq('createdBy', identity.subject))
      .filter((q) => q.eq(q.field('bandId'), undefined))
      .collect()
    const memberships = await ctx.db
      .query('bandMemberships')
      .withIndex('by_user', (q) => q.eq('userId', identity.subject))
      .collect()
    const bandLists = (
      await Promise.all(
        memberships.map((row) =>
          ctx.db
            .query('setlists')
            .withIndex('by_band', (q) => q.eq('bandId', row.bandId))
            .collect(),
        ),
      )
    ).flat()
    const byId = new Map(own.map((row) => [row._id, row]))
    for (const row of bandLists) byId.set(row._id, row)
    const lists = await Promise.all(
      [...byId.values()].map(async (setlist) => {
        const items = await ctx.db
          .query('setlistItems')
          .withIndex('by_setlist', (q) => q.eq('setlistId', setlist._id))
          .collect()
        const titles = (
          await Promise.all(
            items
              .sort((a, b) => a.order - b.order)
              .map(async (item) => {
                const version = await ctx.db.get(item.versionId)
                const song = version ? await ctx.db.get(version.songId) : null
                return song?.title
              }),
          )
        ).filter((title) => title !== undefined)
        const band = setlist.bandId ? await ctx.db.get(setlist.bandId) : null
        return {
          ...setlist,
          count: items.length,
          bandName: band?.name,
          titles,
          preview: titles.slice(0, 3),
        }
      }),
    )
    return lists.sort((a, b) => b._creationTime - a._creationTime)
  },
})

export const get = query({
  args: { setlistId: v.id('setlists') },
  handler: async (ctx, args) => {
    const identity = await requireIdentity(ctx)
    const setlist = await ctx.db.get(args.setlistId)
    if (!setlist) fail('NOT_FOUND')
    if (setlist.bandId) {
      const row = await membership(ctx.db, setlist.bandId, identity.subject)
      if (!row) fail('FORBIDDEN')
    } else if (setlist.createdBy !== identity.subject) fail('FORBIDDEN')
    const items = await ctx.db
      .query('setlistItems')
      .withIndex('by_setlist', (q) => q.eq('setlistId', setlist._id))
      .collect()
    const gate = await openGate(ctx, identity.subject)
    const loaded = []
    for (const item of items.sort((a, b) => a.order - b.order)) {
      const version = await ctx.db.get(item.versionId)
      const song = version ? await ctx.db.get(version.songId) : null
      if (version && song) loaded.push({ item, version, song })
    }
    const names = await bandNames(
      ctx,
      loaded.map((row) => row.version.bandId),
    )
    const entries = loaded.map((row) => ({
      item: row.item,
      song: row.song,
      version: presentVersion(row.version),
      ...versionView(row.version, gate, names),
    }))
    const canEdit = await permitted(() =>
      canEditSetlist(ctx, setlist, identity.subject),
    )
    const band = setlist.bandId ? await ctx.db.get(setlist.bandId) : null
    return {
      setlist,
      canEdit,
      bandName: band?.name,
      entries: entries.flat(),
    }
  },
})

export const rename = mutation({
  args: { setlistId: v.id('setlists'), name: v.string() },
  handler: async (ctx, args) => {
    const identity = await requireIdentity(ctx)
    const setlist = await ctx.db.get(args.setlistId)
    if (!setlist) fail('NOT_FOUND')
    await canEditSetlist(ctx, setlist, identity.subject)
    const name = args.name.trim()
    if (!name) fail('INVALID')
    await ctx.db.patch(setlist._id, { name })
  },
})

export const remove = mutation({
  args: { setlistId: v.id('setlists') },
  handler: async (ctx, args) => {
    const identity = await requireIdentity(ctx)
    const setlist = await ctx.db.get(args.setlistId)
    if (!setlist) return
    await canEditSetlist(ctx, setlist, identity.subject)
    await deleteSetlist(ctx, setlist._id)
  },
})

export const reorder = mutation({
  args: { setlistId: v.id('setlists'), itemIds: v.array(v.id('setlistItems')) },
  handler: async (ctx, args) => {
    const identity = await requireIdentity(ctx)
    const setlist = await ctx.db.get(args.setlistId)
    if (!setlist) fail('NOT_FOUND')
    await canEditSetlist(ctx, setlist, identity.subject)
    const items = await ctx.db
      .query('setlistItems')
      .withIndex('by_setlist', (q) => q.eq('setlistId', setlist._id))
      .collect()
    const known = new Set(items.map((item) => item._id))
    if (
      args.itemIds.length !== items.length ||
      !args.itemIds.every((id) => known.has(id))
    )
      fail('INVALID')
    for (const [order, itemId] of args.itemIds.entries())
      await ctx.db.patch(itemId, { order })
  },
})

export const create = mutation({
  args: { name: v.string(), bandId: v.optional(v.id('bands')) },
  handler: async (ctx, args) => {
    const identity = await requireIdentity(ctx)
    if (args.bandId) {
      const row = await membership(ctx.db, args.bandId, identity.subject)
      if (!row || row.role === 'viewer') fail('FORBIDDEN')
    }
    return ctx.db.insert('setlists', {
      name: args.name.trim() || 'Setlist',
      createdBy: identity.subject,
      bandId: args.bandId,
    })
  },
})

export const addVersion = mutation({
  args: { setlistId: v.id('setlists'), versionId: v.id('versions') },
  handler: async (ctx, args) => {
    const identity = await requireIdentity(ctx)
    const setlist = await ctx.db.get(args.setlistId)
    if (!setlist) fail('NOT_FOUND')
    await canEditSetlist(ctx, setlist, identity.subject)
    const version = await ctx.db.get(args.versionId)
    if (!version) fail('NOT_FOUND')
    await canReadVersion(ctx, version)
    const items = await ctx.db
      .query('setlistItems')
      .withIndex('by_setlist', (q) => q.eq('setlistId', setlist._id))
      .collect()
    await ctx.db.insert('setlistItems', {
      setlistId: setlist._id,
      versionId: version._id,
      order: items.length,
    })
  },
})

export const removeItem = mutation({
  args: { itemId: v.id('setlistItems') },
  handler: async (ctx, args) => {
    const identity = await requireIdentity(ctx)
    const item = await ctx.db.get(args.itemId)
    if (!item) return
    const setlist = await ctx.db.get(item.setlistId)
    if (!setlist) return
    await canEditSetlist(ctx, setlist, identity.subject)
    await removeSetlistItem(ctx, item)
  },
})
