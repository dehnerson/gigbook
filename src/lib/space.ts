import type { Id } from '../../convex/_generated/dataModel'

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

/** First segments that are pages, never a workspace. */
const APP_ROOTS = new Set([
  'songs',
  'versions',
  'settings',
  'share',
  'jam',
  'sign-in',
  'sign-up',
  'validate-email',
  'reset-password',
  'confirm-email-change',
  'invite',
  'lab',
])

/** The workspace named by the URL, or null on a library URL. */
export function placeFromPath(pathname: string): Workspace | null {
  const first = pathname.split('/').filter(Boolean)[0]
  if (!first || APP_ROOTS.has(first)) return null
  return workspace(decodeURIComponent(first))
}

/** `null` is the library, whose song and version URLs have no workspace. */
export function path(at: Workspace | null, dest: Dest) {
  const root = at ? `/${at.key}` : null
  const rooted = (suffix: string) => `${root ?? `/${PERSONAL}`}${suffix}`
  switch (dest.page) {
    case 'library':
      return '/'
    case 'songs':
      return root ? `${root}/songs` : '/'
    case 'song':
      return root ? `${root}/songs/${dest.songId}` : `/songs/${dest.songId}`
    case 'version': {
      const leaf = dest.leaf && dest.leaf !== 'read' ? `/${dest.leaf}` : ''
      const search = new URLSearchParams()
      if (dest.search?.setlist) search.set('setlist', dest.search.setlist)
      if (dest.search?.index !== undefined)
        search.set('index', String(dest.search.index))
      const queryString = search.toString()
      const query = queryString ? `?${queryString}` : ''
      const base = root
        ? `${root}/versions/${dest.versionId}${leaf}`
        : `/versions/${dest.versionId}${leaf}`
      return `${base}${query}`
    }
    case 'setlists':
      return rooted('/setlists')
    case 'setlist':
      return rooted(`/setlists/${dest.setlistId}`)
    case 'jam':
      return rooted('/jam')
    case 'import':
      return rooted('/import')
    case 'draft':
      return rooted(`/import/${dest.draftId}`)
    case 'members':
      if (at?.key === PERSONAL) return `/${PERSONAL}/songs`
      return rooted('/members')
    default: {
      const unreachable: never = dest
      return unreachable
    }
  }
}

/** Where the workspace switcher lands. Song ids travel. Documents do not. */
export function switchPath(pathname: string, key: string) {
  const at = workspace(key)
  const parts = pathname.split('/').filter(Boolean)
  const rest = parts[0] && !APP_ROOTS.has(parts[0]) ? parts.slice(1) : parts
  const section = rest[0]
  const id = rest[1]
  if (section === 'songs' && id) return path(at, { page: 'song', songId: id })
  if (section === 'setlists') return path(at, { page: 'setlists' })
  if (section === 'jam') return path(at, { page: 'jam' })
  if (section === 'import') return path(at, { page: 'import' })
  if (section === 'members') return path(at, { page: 'members' })
  return path(at, { page: 'songs' })
}

export function libraryVersionPath(versionId: string) {
  return path(null, { page: 'version', versionId })
}
