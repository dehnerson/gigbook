'use node'

import { v } from 'convex/values'
import sharp from 'sharp'
import { internal } from './_generated/api'
import { internalAction } from './_generated/server'
import { requireIdentity } from './lib/access'
import { fail } from './lib/errors'
import { avatarByteError, sniffAvatar } from '../src/lib/avatar'

const MAX_PIXELS = 48_000_000

export async function normalizeAvatar(bytes: Uint8Array) {
  if (!sniffAvatar(bytes)) throw new Error('AVATAR_INVALID')
  const jpeg = await sharp(bytes, {
    failOn: 'error',
    limitInputPixels: MAX_PIXELS,
    animated: false,
    pages: 1,
  })
    .rotate()
    .resize(256, 256, { fit: 'cover', position: 'centre' })
    .jpeg({ quality: 85 })
    .toBuffer()
  return new Uint8Array(jpeg)
}

export const normalizeUpload = internalAction({
  args: { storageId: v.id('_storage') },
  handler: async (ctx, args) => {
    await requireIdentity(ctx)
    try {
      const file = await ctx.storage.get(args.storageId)
      if (!file) fail('AVATAR_INVALID')
      const bytes = new Uint8Array(await file.arrayBuffer())
      const problem = avatarByteError(bytes)
      if (problem === 'too-large') fail('AVATAR_TOO_LARGE')
      if (problem) fail('AVATAR_INVALID')
      let jpeg: Uint8Array
      try {
        jpeg = await normalizeAvatar(bytes)
      } catch {
        fail('AVATAR_INVALID')
      }
      const copy = new ArrayBuffer(jpeg.byteLength)
      new Uint8Array(copy).set(jpeg)
      await ctx.runMutation(internal.users.commitAvatar, { jpeg: copy })
    } finally {
      await ctx.storage.delete(args.storageId)
    }
  },
})
