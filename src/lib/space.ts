import { linkOptions } from '@tanstack/react-router'
import type { Id } from '../../convex/_generated/dataModel'

type AppLink = {
  to: string
  params?: Record<string, string>
  search?: Record<string, string | number>
}

/**
 * `linkOptions` checks each branch. The union of those branches cannot be
 * spread onto `Link` or `navigate`, so callers share one result type.
 */
function asLink<T>(options: T): AppLink {
  return options as AppLink
}

export const PERSONAL = 'personal'

export type Role = 'owner' | 'editor' | 'viewer'

/**
 * One workspace. `key` is the URL segment (`personal` or a band id) and the
 * only identity. `bandId` is null for personal. `label` and `role` stay null
 * until the band list matches that key.
 */
export type Workspace = {
  key: string
  bandId: Id<'bands'> | null
  label: string | null
  role: Role | null
}

export function workspace(
  key: string,
  meta?: { label?: string | null; role?: Role | null },
): Workspace {
  return {
    key,
    bandId: key === PERSONAL ? null : (key as Id<'bands'>),
    label: meta?.label ?? null,
    role: meta?.role ?? null,
  }
}

/** The workspace that owns a document. A missing band is personal. */
export function workspaceOf(
  bandId?: string | null,
  meta?: { label?: string | null; role?: Role | null },
): Workspace {
  return workspace(bandId || PERSONAL, meta)
}

export type Leaf = 'read' | 'edit' | 'play'

export type Dest =
  | { page: 'library' }
  | { page: 'songs' }
  | { page: 'song'; songId: string }
  | {
      page: 'version'
      versionId: string
      leaf?: Leaf
      search?: { setlist?: string; index?: number }
    }
  | { page: 'setlists' }
  | { page: 'setlist'; setlistId: string }
  | { page: 'jam' }
  | { page: 'import' }
  | { page: 'draft'; draftId: string }
  | { page: 'members' }

function keyOf(at: string | null) {
  return at ?? PERSONAL
}

function versionSearch(
  search: { setlist?: string; index?: number } | undefined,
) {
  if (!search) return undefined
  const query: { setlist?: string; index?: number } = {}
  if (search.setlist) query.setlist = search.setlist
  if (search.index !== undefined) query.index = search.index
  return query.setlist || query.index !== undefined ? query : undefined
}

/**
 * Typed route options for a destination.
 * `at === null` keeps songs and versions on the library templates.
 * Setlists, jam, import, and members always sit under a workspace key.
 */
export function href(at: string | null, dest: Dest) {
  const key = keyOf(at)
  switch (dest.page) {
    case 'library':
      return asLink(linkOptions({ to: '/' }))
    case 'songs':
      if (!at) return asLink(linkOptions({ to: '/' }))
      return asLink(
        linkOptions({
          to: '/$workspace/songs',
          params: { workspace: at },
        }),
      )
    case 'song':
      if (!at)
        return asLink(
          linkOptions({
            to: '/songs/$songId',
            params: { songId: dest.songId },
          }),
        )
      return asLink(
        linkOptions({
          to: '/$workspace/songs/$songId',
          params: { workspace: at, songId: dest.songId },
        }),
      )
    case 'version':
      return versionHref(at, dest.versionId, dest.leaf, dest.search)
    case 'setlists':
      return asLink(
        linkOptions({
          to: '/$workspace/setlists',
          params: { workspace: key },
        }),
      )
    case 'setlist':
      return asLink(
        linkOptions({
          to: '/$workspace/setlists/$setlistId',
          params: { workspace: key, setlistId: dest.setlistId },
        }),
      )
    case 'jam':
      return asLink(
        linkOptions({
          to: '/$workspace/jam',
          params: { workspace: key },
        }),
      )
    case 'import':
      return asLink(
        linkOptions({
          to: '/$workspace/import',
          params: { workspace: key },
        }),
      )
    case 'draft':
      return asLink(
        linkOptions({
          to: '/$workspace/import/$draftId',
          params: { workspace: key, draftId: dest.draftId },
        }),
      )
    case 'members':
      if (key === PERSONAL)
        return asLink(
          linkOptions({
            to: '/$workspace/songs',
            params: { workspace: PERSONAL },
          }),
        )
      return asLink(
        linkOptions({
          to: '/$workspace/members',
          params: { workspace: key },
        }),
      )
    default: {
      const unreachable: never = dest
      return unreachable
    }
  }
}

function versionHref(
  at: string | null,
  versionId: string,
  leaf: Leaf | undefined,
  search: { setlist?: string; index?: number } | undefined,
) {
  const query = leaf === 'play' ? versionSearch(search) : undefined
  if (!at) {
    if (leaf === 'edit')
      return asLink(
        linkOptions({
          to: '/versions/$versionId/edit',
          params: { versionId },
        }),
      )
    if (leaf === 'play') {
      if (query)
        return asLink(
          linkOptions({
            to: '/versions/$versionId/play',
            params: { versionId },
            search: query,
          }),
        )
      return asLink(
        linkOptions({
          to: '/versions/$versionId/play',
          params: { versionId },
        }),
      )
    }
    return asLink(
      linkOptions({
        to: '/versions/$versionId',
        params: { versionId },
      }),
    )
  }
  if (leaf === 'edit')
    return asLink(
      linkOptions({
        to: '/$workspace/versions/$versionId/edit',
        params: { workspace: at, versionId },
      }),
    )
  if (leaf === 'play') {
    if (query)
      return asLink(
        linkOptions({
          to: '/$workspace/versions/$versionId/play',
          params: { workspace: at, versionId },
          search: query,
        }),
      )
    return asLink(
      linkOptions({
        to: '/$workspace/versions/$versionId/play',
        params: { workspace: at, versionId },
      }),
    )
  }
  return asLink(
    linkOptions({
      to: '/$workspace/versions/$versionId',
      params: { workspace: at, versionId },
    }),
  )
}

export type PlaceHref = ReturnType<typeof href>

const SONG_ROUTES = new Set([
  '/_authed/songs/$songId',
  '/_authed/$workspace/songs/$songId',
])
const SETLIST_ROUTES = new Set([
  '/_authed/$workspace/setlists/',
  '/_authed/$workspace/setlists/$setlistId',
])
const JAM_ROUTES = new Set(['/_authed/$workspace/jam/', '/_authed/jam/$code'])
const IMPORT_ROUTES = new Set([
  '/_authed/$workspace/import/',
  '/_authed/$workspace/import/$draftId',
])

/** Where the workspace switcher lands. A song id travels. A document id does not. */
export function switchHref(
  routeId: string,
  params: { songId?: string; [key: string]: string | undefined },
  key: string,
) {
  if (SONG_ROUTES.has(routeId) && params.songId)
    return href(key, { page: 'song', songId: params.songId })
  if (SETLIST_ROUTES.has(routeId)) return href(key, { page: 'setlists' })
  if (JAM_ROUTES.has(routeId)) return href(key, { page: 'jam' })
  if (IMPORT_ROUTES.has(routeId)) return href(key, { page: 'import' })
  if (routeId === '/_authed/$workspace/members')
    return href(key, { page: 'members' })
  return href(key, { page: 'songs' })
}
