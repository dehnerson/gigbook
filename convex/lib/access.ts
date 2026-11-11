import type {
  GenericDatabaseReader,
  GenericDatabaseWriter,
  UserIdentity,
} from 'convex/server'
import { fail } from './errors'
import type { Id } from '../_generated/dataModel'
import type { DatabaseReader } from '../_generated/server'

type Db = GenericDatabaseReader<any> | GenericDatabaseWriter<any>

export async function requireIdentity(ctx: {
  auth: { getUserIdentity: () => Promise<UserIdentity | null> }
}) {
  const identity = await ctx.auth.getUserIdentity()
  if (!identity) fail('UNAUTHENTICATED')
  return identity
}

export async function membership(db: Db, bandId: string, userId: string) {
  const rows = await db
    .query('bandMemberships')
    .withIndex('by_user', (q: any) => q.eq('userId', userId))
    .collect()
  return rows.find((row: any) => row.bandId === bandId) ?? null
}

export async function canReadSong(ctx: { db: Db; auth: any }, song: any) {
  const identity = await requireIdentity(ctx)
  if (song.createdBy === identity.subject) return identity
  if (song.bandId && (await membership(ctx.db, song.bandId, identity.subject)))
    return identity
  fail('FORBIDDEN')
}

export async function canEditSong(ctx: { db: Db; auth: any }, song: any) {
  const identity = await requireIdentity(ctx)
  if (song.createdBy === identity.subject && !song.bandId) return identity
  if (!song.bandId) fail('FORBIDDEN')
  const row = await membership(ctx.db, song.bandId, identity.subject)
  if (!row || row.role === 'viewer') fail('FORBIDDEN')
  return identity
}

export async function songOfVersion(
  ctx: { db: DatabaseReader },
  version: { songId: Id<'songs'> },
) {
  const song = await ctx.db.get(version.songId)
  if (!song) fail('NOT_FOUND')
  return song
}
