import type { Id } from '../../convex/_generated/dataModel'

export const PERSONAL = 'personal'

export function homeKey(bandId?: string | null) {
  return bandId || PERSONAL
}

export function bandIdFromPath(workspace: string): Id<'bands'> | null {
  return workspace === PERSONAL ? null : (workspace as Id<'bands'>)
}

export type Trail =
  | { kind: 'library' }
  | { kind: 'workspace'; workspace: string }

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

export function libraryTrail(): Trail {
  return { kind: 'library' }
}

export function workspaceTrail(workspace: string): Trail {
  return { kind: 'workspace', workspace }
}

export function trailFromPath(pathname: string): Trail {
  const match = /^\/w\/([^/]+)/.exec(pathname)
  if (!match?.[1]) return libraryTrail()
  return workspaceTrail(decodeURIComponent(match[1]))
}

function workspaceRoot(trail: Trail) {
  if (trail.kind === 'library') return null
  return `/w/${trail.workspace}`
}

function rooted(trail: Trail, suffix: string) {
  return `${workspaceRoot(trail) ?? `/w/${PERSONAL}`}${suffix}`
}

export function path(trail: Trail, dest: Dest) {
  const root = workspaceRoot(trail)
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
      return rooted(trail, '/setlists')
    case 'setlist':
      return rooted(trail, `/setlists/${dest.setlistId}`)
    case 'jam':
      return rooted(trail, '/jam')
    case 'import':
      return rooted(trail, '/import')
    case 'draft':
      return rooted(trail, `/import/${dest.draftId}`)
    case 'members':
      if (trail.kind === 'workspace' && trail.workspace === PERSONAL)
        return `/w/${PERSONAL}/songs`
      return rooted(trail, '/members')
    default: {
      const unreachable: never = dest
      return unreachable
    }
  }
}

/** Where the workspace switcher lands. Song ids travel. Documents do not. */
export function switchPath(pathname: string, workspace: string) {
  const trail = workspaceTrail(workspace)
  const parts = pathname.split('/').filter(Boolean)
  const rest = parts[0] === 'w' ? parts.slice(2) : parts
  const section = rest[0]
  const id = rest[1]
  if (section === 'songs' && id)
    return path(trail, { page: 'song', songId: id })
  if (section === 'setlists') return path(trail, { page: 'setlists' })
  if (section === 'jam') return path(trail, { page: 'jam' })
  if (section === 'import') return path(trail, { page: 'import' })
  if (section === 'members') return path(trail, { page: 'members' })
  return path(trail, { page: 'songs' })
}

export function libraryVersionPath(versionId: string) {
  return path(libraryTrail(), { page: 'version', versionId })
}
