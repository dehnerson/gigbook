import { convexQuery } from '@convex-dev/react-query'
import { useQuery } from '@tanstack/react-query'
import { useRouterState } from '@tanstack/react-router'
import { useMutation } from 'convex/react'
import { createContext, useContext, useEffect, useMemo, useRef } from 'react'
import type { ReactNode } from 'react'
import { api } from '../../convex/_generated/api'
import type { Id } from '../../convex/_generated/dataModel'
import { PERSONAL, workspace } from '@/lib/space'
import type { Workspace } from '@/lib/space'
import { m } from '@/paraglide/messages'

const LAST_HOME = 'gigbook.home'

type WorkspaceValue = {
  /** Route workspace, or the remembered home when the URL has none. */
  current: Workspace
  /** The key came from the `$workspace` match, so links stay in that workspace. */
  inWorkspace: boolean
  /** Personal, then every band the user belongs to. */
  all: Array<Workspace>
  /** False until the band list has loaded. Unknown workspace URLs wait for this. */
  bandsReady: boolean
}

const WorkspaceContext = createContext<WorkspaceValue | null>(null)

function personalWorkspace(): Workspace {
  return workspace(PERSONAL, { label: m.personal(), role: 'owner' })
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
  const migrated = useRef(false)

  useEffect(() => {
    if (!me || migrated.current) return
    if (routeKey && routeKey !== PERSONAL && !bandsReady) return
    migrated.current = true
    let stored: string | null = null
    try {
      stored = localStorage.getItem(LAST_HOME)
      localStorage.removeItem(LAST_HOME)
    } catch {
      return
    }
    if (me.homeChosen || routeKey) return
    if (!stored || stored === PERSONAL) {
      if (stored === PERSONAL) void setHome({ bandId: null })
      return
    }
    void setHome({ bandId: stored as Id<'bands'> }).catch(() => {
      void setHome({ bandId: null })
    })
  }, [bandsReady, me, routeKey, setHome])

  useEffect(() => {
    if (!me || !routeKey) return
    if (routeKey === PERSONAL) {
      if (me.home.bandId !== null || !me.homeChosen)
        void setHome({ bandId: null })
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
        workspace(row.band._id, {
          label: row.band.name,
          role: row.membership.role,
        }),
      ),
    ],
    [bands],
  )
  const key = routeKey ?? me?.home.bandId ?? PERSONAL
  const current =
    key === PERSONAL
      ? personalWorkspace()
      : (all.find((item) => item.key === key) ?? workspace(key))
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
