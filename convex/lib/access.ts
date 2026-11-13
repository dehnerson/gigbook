import type {
  GenericDatabaseReader,
  GenericDatabaseWriter,
  UserIdentity,
} from 'convex/server'
import { fail } from './errors'
import type { Doc, Id } from '../_generated/dataModel'
import type { DatabaseReader } from '../_generated/server'

type Db = GenericDatabaseReader<any> | GenericDatabaseWriter<any>
type Ctx = { db: Db; auth: any }

export type Gate = {
  userId: string
  bands: Map<Id<'bands'>, Doc<'bandMemberships'>>
}

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

export function writes(row: { role: string } | null) {
  return Boolean(row && row.role !== 'viewer')
}

export async function permitted(check: () => Promise<unknown>) {
  try {
    await check()
    return true
  } catch {
    return false
  }
}

export async function openGate(ctx: { db: Db }, userId: string): Promise<Gate> {
  const rows = await ctx.db
    .query('bandMemberships')
    .withIndex('by_user', (q: any) => q.eq('userId', userId))
    .collect()
  return {
    userId,
    bands: new Map(
      rows.map((row: Doc<'bandMemberships'>) => [row.bandId, row]),
    ),
  }
}

export function sees(version: Doc<'versions'>, gate: Gate) {
  if (!version.bandId) return version.createdBy === gate.userId
  return gate.bands.has(version.bandId)
}

export function edits(version: Doc<'versions'>, gate: Gate) {
  if (!version.bandId) return version.createdBy === gate.userId
  return writes(gate.bands.get(version.bandId) ?? null)
}

export async function visibleVersions(ctx: { db: Db }, gate: Gate) {
  const personal = (
    await ctx.db
      .query('versions')
      .withIndex('by_creator', (q: any) => q.eq('createdBy', gate.userId))
      .collect()
  ).filter((version: Doc<'versions'>) => !version.bandId)
  const bandOwned = (
    await Promise.all(
      [...gate.bands.keys()].map((bandId) =>
        ctx.db
          .query('versions')
          .withIndex('by_band', (q: any) => q.eq('bandId', bandId))
          .collect(),
      ),
    )
  ).flat()
  const byId = new Map<string, Doc<'versions'>>()
  for (const version of [...personal, ...bandOwned])
    byId.set(version._id, version)
  return [...byId.values()]
}

export async function canEditBand(ctx: Ctx, bandId: Id<'bands'>) {
  const identity = await requireIdentity(ctx)
  const gate = await openGate(ctx, identity.subject)
  if (!writes(gate.bands.get(bandId) ?? null)) fail('FORBIDDEN')
  return identity
}

export async function canReadVersion(ctx: Ctx, version: Doc<'versions'>) {
  const identity = await requireIdentity(ctx)
  const gate = await openGate(ctx, identity.subject)
  if (!sees(version, gate)) fail('FORBIDDEN')
  return identity
}

export async function canEditVersion(ctx: Ctx, version: Doc<'versions'>) {
  const identity = await requireIdentity(ctx)
  const gate = await openGate(ctx, identity.subject)
  if (!edits(version, gate)) fail('FORBIDDEN')
  return identity
}

export async function canReadSong(ctx: Ctx, song: Doc<'songs'>) {
  const identity = await requireIdentity(ctx)
  const gate = await openGate(ctx, identity.subject)
  const versions = await versionsOf(ctx, song._id)
  if (versions.some((version) => sees(version, gate))) return identity
  fail('FORBIDDEN')
}

export async function canRenameSong(ctx: Ctx, song: Doc<'songs'>) {
  const identity = await requireIdentity(ctx)
  const gate = await openGate(ctx, identity.subject)
  const versions = await versionsOf(ctx, song._id)
  if (versions.some((version) => edits(version, gate))) return identity
  fail('FORBIDDEN')
}

export async function songOfVersion(
  ctx: { db: DatabaseReader },
  version: { songId: Id<'songs'> },
) {
  const song = await ctx.db.get(version.songId)
  if (!song) fail('NOT_FOUND')
  return song
}

async function versionsOf(ctx: { db: Db }, songId: Id<'songs'>) {
  return ctx.db
    .query('versions')
    .withIndex('by_song', (q: any) => q.eq('songId', songId))
    .collect() as Promise<Array<Doc<'versions'>>>
}

export async function readableVersions(
  ctx: { db: Db },
  song: Doc<'songs'>,
  gate: Gate,
) {
  const versions = await versionsOf(ctx, song._id)
  return versions
    .filter((version) => sees(version, gate))
    .sort((a, b) => a._creationTime - b._creationTime)
}

export async function bandNames(
  ctx: { db: Db },
  bandIds: Iterable<Id<'bands'> | null | undefined>,
) {
  const names = new Map<string, string>()
  for (const bandId of bandIds) {
    if (!bandId || names.has(bandId)) continue
    const band = await ctx.db.get(bandId)
    if (band) names.set(bandId, band.name)
  }
  return names
}

/** Fields a reader needs. The share secret and account ids stay on the server. */
export function presentVersion(version: Doc<'versions'>) {
  const {
    shareToken: _shareToken,
    createdBy: _createdBy,
    parentVersionId: _parentVersionId,
    ...safe
  } = version
  return safe
}

export function versionView(
  version: Doc<'versions'>,
  gate: Gate,
  names: Map<string, string>,
) {
  const canEdit = edits(version, gate)
  return {
    ...presentVersion(version),
    ownerBandId: version.bandId ?? null,
    ownerName: version.bandId ? (names.get(version.bandId) ?? null) : null,
    canEdit,
    shared: canEdit && version.shareToken !== undefined,
  }
}

export async function findVisibleSong(
  ctx: { db: Db },
  gate: Gate,
  title: string,
) {
  const versions = await visibleVersions(ctx, gate)
  const seen = new Set<string>()
  for (const version of versions) {
    if (seen.has(version.songId)) continue
    seen.add(version.songId)
    const song = await ctx.db.get(version.songId)
    if (song && song.title === title) return song
  }
  return null
}
