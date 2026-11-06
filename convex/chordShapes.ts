import { v } from 'convex/values'
import { mutation, query } from './_generated/server'
import type { MutationCtx } from './_generated/server'
import type { Id } from './_generated/dataModel'
import { canEditSong, requireIdentity, songOfVersion } from './lib/access'
import { fail } from './lib/errors'

const MAX_STRINGS = 12
const MAX_FRET = 24

function validShape(frets: Array<number>, fingers?: Array<number>) {
  if (frets.length < 1 || frets.length > MAX_STRINGS) fail('INVALID')
  if (
    !frets.every(
      (fret) => Number.isInteger(fret) && fret >= -1 && fret <= MAX_FRET,
    )
  )
    fail('INVALID')
  if (
    fingers &&
    (fingers.length !== frets.length ||
      !fingers.every(
        (finger) => Number.isInteger(finger) && finger >= 0 && finger <= 4,
      ))
  )
    fail('INVALID')
}

async function editableVersion(ctx: MutationCtx, versionId: Id<'versions'>) {
  const version = await ctx.db.get(versionId)
  if (!version) fail('NOT_FOUND')
  await canEditSong(ctx, await songOfVersion(ctx, version))
  return version
}

async function versionShape(
  ctx: MutationCtx,
  versionId: Id<'versions'>,
  symbol: string,
  shift: number,
) {
  const shapes = await ctx.db
    .query('chordShapes')
    .withIndex('by_version', (q) => q.eq('versionId', versionId))
    .collect()
  return shapes.find(
    (shape) => shape.symbol === symbol && shape.shift === shift,
  )
}

async function myShape(
  ctx: MutationCtx,
  userId: string,
  tuning: string,
  symbol: string,
) {
  return ctx.db
    .query('userChordShapes')
    .withIndex('by_user_tuning_symbol', (q) =>
      q.eq('userId', userId).eq('tuning', tuning).eq('symbol', symbol),
    )
    .unique()
}

export const mine = query({
  args: { tuning: v.string() },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity()
    if (!identity) return []
    const shapes = await ctx.db
      .query('userChordShapes')
      .withIndex('by_user_tuning_symbol', (q) =>
        q.eq('userId', identity.subject).eq('tuning', args.tuning),
      )
      .collect()
    return shapes.map(({ symbol, frets, fingers }) => ({
      symbol,
      frets,
      fingers,
    }))
  },
})

export const setMine = mutation({
  args: {
    tuning: v.string(),
    symbol: v.string(),
    frets: v.array(v.number()),
    fingers: v.optional(v.array(v.number())),
  },
  handler: async (ctx, args) => {
    const identity = await requireIdentity(ctx)
    validShape(args.frets, args.fingers)
    const existing = await myShape(
      ctx,
      identity.subject,
      args.tuning,
      args.symbol,
    )
    if (existing)
      await ctx.db.patch(existing._id, {
        frets: args.frets,
        fingers: args.fingers,
      })
    else
      await ctx.db.insert('userChordShapes', {
        userId: identity.subject,
        tuning: args.tuning,
        symbol: args.symbol,
        frets: args.frets,
        fingers: args.fingers,
      })
  },
})

export const clearMine = mutation({
  args: { tuning: v.string(), symbol: v.string() },
  handler: async (ctx, args) => {
    const identity = await requireIdentity(ctx)
    const existing = await myShape(
      ctx,
      identity.subject,
      args.tuning,
      args.symbol,
    )
    if (existing) await ctx.db.delete(existing._id)
  },
})

export const setForVersion = mutation({
  args: {
    versionId: v.id('versions'),
    symbol: v.string(),
    shift: v.number(),
    frets: v.array(v.number()),
    fingers: v.optional(v.array(v.number())),
  },
  handler: async (ctx, args) => {
    const version = await editableVersion(ctx, args.versionId)
    validShape(args.frets, args.fingers)
    const existing = await versionShape(
      ctx,
      version._id,
      args.symbol,
      args.shift,
    )
    if (existing)
      await ctx.db.patch(existing._id, {
        frets: args.frets,
        fingers: args.fingers,
      })
    else
      await ctx.db.insert('chordShapes', {
        versionId: version._id,
        symbol: args.symbol,
        shift: args.shift,
        frets: args.frets,
        fingers: args.fingers,
      })
  },
})

export const clearForVersion = mutation({
  args: { versionId: v.id('versions'), symbol: v.string(), shift: v.number() },
  handler: async (ctx, args) => {
    const version = await editableVersion(ctx, args.versionId)
    const existing = await versionShape(
      ctx,
      version._id,
      args.symbol,
      args.shift,
    )
    if (existing) await ctx.db.delete(existing._id)
  },
})
