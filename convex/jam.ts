import { v } from 'convex/values'
import { mutation, query } from './_generated/server'
import { canReadVersion, requireIdentity } from './lib/access'
import { fail } from './lib/errors'
import { withNames } from './lib/users'

function roomCode() {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  let code = ''
  const bytes = crypto.getRandomValues(new Uint8Array(6))
  for (const byte of bytes) code += alphabet[byte % alphabet.length]
  return code
}

export const create = mutation({
  args: {},
  handler: async (ctx) => {
    const identity = await requireIdentity(ctx)
    const code = roomCode()
    const roomId = await ctx.db.insert('jamRooms', {
      code,
      hostUserId: identity.subject,
      setlistIndex: 0,
      timelineIndex: 0,
      concertTranspose: 0,
    })
    await ctx.db.insert('jamMembers', {
      roomId,
      userId: identity.subject,
      capo: 0,
      following: true,
      visibleTrackIds: [],
    })
    return { roomId, code }
  },
})

export const join = mutation({
  args: { code: v.string() },
  handler: async (ctx, args) => {
    const identity = await requireIdentity(ctx)
    const room = await ctx.db
      .query('jamRooms')
      .withIndex('by_code', (q: any) =>
        q.eq('code', args.code.trim().toUpperCase()),
      )
      .unique()
    if (!room) fail('NOT_FOUND')
    const existing = await ctx.db
      .query('jamMembers')
      .withIndex('by_room_user', (q: any) =>
        q.eq('roomId', room._id).eq('userId', identity.subject),
      )
      .unique()
    if (!existing) {
      await ctx.db.insert('jamMembers', {
        roomId: room._id,
        userId: identity.subject,
        capo: 0,
        following: true,
        visibleTrackIds: [],
      })
    }
    return { roomId: room._id, code: room.code }
  },
})

export const get = query({
  args: { code: v.string() },
  handler: async (ctx, args) => {
    const identity = await requireIdentity(ctx)
    const room = await ctx.db
      .query('jamRooms')
      .withIndex('by_code', (q: any) => q.eq('code', args.code))
      .unique()
    if (!room) fail('NOT_FOUND')
    const members = await withNames(
      ctx,
      await ctx.db
        .query('jamMembers')
        .withIndex('by_room', (q: any) => q.eq('roomId', room._id))
        .collect(),
    )
    if (!members.some((member) => member.userId === identity.subject))
      fail('FORBIDDEN')
    return {
      room,
      members,
      me: members.find((member) => member.userId === identity.subject),
    }
  },
})

export const setVersion = mutation({
  args: { code: v.string(), versionId: v.id('versions') },
  handler: async (ctx, args) => {
    const identity = await requireIdentity(ctx)
    const room = await ctx.db
      .query('jamRooms')
      .withIndex('by_code', (q: any) => q.eq('code', args.code))
      .unique()
    if (!room || room.hostUserId !== identity.subject) fail('FORBIDDEN')
    const version = await ctx.db.get(args.versionId)
    if (!version) fail('NOT_FOUND')
    await canReadVersion(ctx, version)
    await ctx.db.patch(room._id, { versionId: version._id, timelineIndex: 0 })
  },
})

export const setTransport = mutation({
  args: {
    code: v.string(),
    timelineIndex: v.optional(v.number()),
    concertTranspose: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const identity = await requireIdentity(ctx)
    const room = await ctx.db
      .query('jamRooms')
      .withIndex('by_code', (q: any) => q.eq('code', args.code))
      .unique()
    if (!room || room.hostUserId !== identity.subject) fail('FORBIDDEN')
    await ctx.db.patch(room._id, {
      timelineIndex: args.timelineIndex ?? room.timelineIndex,
      concertTranspose: args.concertTranspose ?? room.concertTranspose,
    })
  },
})

export const advanceSetlist = mutation({
  args: { code: v.string() },
  handler: async (ctx, args) => {
    const identity = await requireIdentity(ctx)
    const room = await ctx.db
      .query('jamRooms')
      .withIndex('by_code', (q: any) => q.eq('code', args.code))
      .unique()
    if (!room || room.hostUserId !== identity.subject || !room.setlistId)
      fail('FORBIDDEN')
    const items = await ctx.db
      .query('setlistItems')
      .withIndex('by_setlist', (q: any) => q.eq('setlistId', room.setlistId))
      .collect()
    const ordered = items.sort((a, b) => a.order - b.order)
    const next = ordered.at(room.setlistIndex + 1)
    if (!next) return null
    await ctx.db.patch(room._id, {
      setlistIndex: room.setlistIndex + 1,
      versionId: next.versionId,
      timelineIndex: 0,
    })
    return { versionId: next.versionId }
  },
})

export const attachSetlist = mutation({
  args: { code: v.string(), setlistId: v.id('setlists') },
  handler: async (ctx, args) => {
    const identity = await requireIdentity(ctx)
    const room = await ctx.db
      .query('jamRooms')
      .withIndex('by_code', (q: any) => q.eq('code', args.code))
      .unique()
    if (!room || room.hostUserId !== identity.subject) fail('FORBIDDEN')
    const items = await ctx.db
      .query('setlistItems')
      .withIndex('by_setlist', (q: any) => q.eq('setlistId', args.setlistId))
      .collect()
    const first = items.sort((a, b) => a.order - b.order).at(0)
    await ctx.db.patch(room._id, {
      setlistId: args.setlistId,
      setlistIndex: 0,
      versionId: first?.versionId,
      timelineIndex: 0,
    })
  },
})

export const setMemberView = mutation({
  args: {
    code: v.string(),
    capo: v.number(),
    following: v.boolean(),
    visibleTrackIds: v.array(v.string()),
    personalVersionId: v.optional(v.id('versions')),
  },
  handler: async (ctx, args) => {
    const identity = await requireIdentity(ctx)
    const room = await ctx.db
      .query('jamRooms')
      .withIndex('by_code', (q: any) => q.eq('code', args.code))
      .unique()
    if (!room) fail('NOT_FOUND')
    const member = await ctx.db
      .query('jamMembers')
      .withIndex('by_room_user', (q: any) =>
        q.eq('roomId', room._id).eq('userId', identity.subject),
      )
      .unique()
    if (!member) fail('FORBIDDEN')
    await ctx.db.patch(member._id, {
      capo: args.capo,
      following: args.following,
      visibleTrackIds: args.visibleTrackIds,
      personalVersionId: args.personalVersionId,
    })
  },
})
