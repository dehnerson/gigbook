import { convexQuery } from '@convex-dev/react-query'
import { useQuery } from '@tanstack/react-query'
import { linkOptions, useRouterState } from '@tanstack/react-router'
import { useMutation } from 'convex/react'
import { createContext, useContext, useEffect, useMemo } from 'react'
import type { ReactNode } from 'react'
import { api } from '../../convex/_generated/api'
import { m } from '@/paraglide/messages'
import type { Id } from '../../convex/_generated/dataModel'

export type Role = 'owner' | 'editor' | 'viewer'

/**
 * One workspace. `key` is the URL segment (`personal` or a band id) and the
 * only identity. `bandId` is null for personal. `label` and `role` stay null
 * until the band list matches that key.
 */
export type Workspace = {
  key: string
  bandId: Id<'bands'> | null
  label: string
  role: Role
}

type WorkspaceValue = {
  /** Route workspace, or the remembered home when the URL has none. */
  current: Workspace
  /** Personal, then every band the user belongs to. */
  all: Array<Workspace>
  /** False until the band list has loaded. Unknown workspace URLs wait for this. */
  bandsReady: boolean
}

const WorkspaceContext = createContext<WorkspaceValue | null>(null)

function workspace(key: string, label: string, role: Role): Workspace {
  return {
    key,
    bandId: key === PERSONAL ? null : (key as Id<'bands'>),
    label: label,
    role: role,
  }
}

export const PERSONAL = 'personal'

function personalWorkspace(): Workspace {
  return workspace(PERSONAL, m.personal(), 'owner')
}

export function WorkspaceProvider({ children }: { children: ReactNode }) {
  const routeKey = useRouterState({
    select: (state) => {
      for (const match of state.matches) {
        if (match.routeId !== '/_authed/$workspace') continue
        const key = match.params.workspace
        return typeof key === 'string' ? key : undefined
      }
      return undefined
    },
  })
  const { data: me } = useQuery(convexQuery(api.users.me, {}))
  const { data: bands } = useQuery(convexQuery(api.bands.list, {}))
  const setHome = useMutation(api.users.setHome)
  const bandsReady = bands !== undefined

  useEffect(() => {
    if (!me || !routeKey) return

    if (routeKey === PERSONAL) {
      if (me.home.bandId !== null) void setHome({ bandId: null })
      return
    }

    if (!bands) return
    const row = bands.find((item) => item.band._id === routeKey)
    if (!row || me.home.bandId === row.band._id) return

    void setHome({ bandId: row.band._id })
  }, [bands, me, routeKey, setHome])

  const all = useMemo(
    () => [
      personalWorkspace(),
      ...(bands ?? []).map((row) =>
        workspace(row.band._id, row.band.name, row.membership.role),
      ),
    ],
    [bands],
  )

  const key = routeKey ?? me?.home.bandId ?? PERSONAL

  const current = all.find((item) => item.key === key) ?? personalWorkspace()

  const value = useMemo<WorkspaceValue>(
    () => ({
      current,
      inWorkspace: routeKey !== undefined,
      all,
      bandsReady,
    }),
    [all, bandsReady, current, routeKey],
  )
  return <WorkspaceContext value={value}>{children}</WorkspaceContext>
}

export function useWorkspace() {
  const value = useContext(WorkspaceContext)
  if (!value)
    throw new Error('useWorkspace must be used inside WorkspaceProvider')
  return value
}

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
export function switchWorkspace(
  routeId: string,
  params: { songId?: string; [key: string]: string | undefined },
  key: string,
) {
  if (SONG_ROUTES.has(routeId) && params.songId)
    return linkOptions({
      to: '/$workspace/songs/$songId',
      params: { workspace: key, songId: params.songId },
    })

  if (SETLIST_ROUTES.has(routeId))
    return linkOptions({
      to: '/$workspace/setlists',
      params: { workspace: key },
    })

  if (JAM_ROUTES.has(routeId))
    return linkOptions({ to: '/$workspace/jam', params: { workspace: key } })

  if (IMPORT_ROUTES.has(routeId))
    return linkOptions({ to: '/$workspace/import', params: { workspace: key } })

  if (routeId === '/_authed/$workspace/members')
    return linkOptions({
      to: '/$workspace/members',
      params: { workspace: key },
    })

  return linkOptions({ to: '/$workspace/songs', params: { workspace: key } })
}
