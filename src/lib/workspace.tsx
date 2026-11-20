import { useConvexAuth, useQuery } from 'convex/react'
import { useRouterState } from '@tanstack/react-router'
import { createContext, useContext, useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import { api } from '../../convex/_generated/api'
import { PERSONAL, placeFromPath, workspace } from '@/lib/space'
import type { Workspace } from '@/lib/space'
import { m } from '@/paraglide/messages'

const RouteContext = createContext<Workspace | null>(null)

export function RouteWorkspace({
  workspace: value,
  children,
}: {
  workspace: Workspace
  children: ReactNode
}) {
  return <RouteContext value={value}>{children}</RouteContext>
}

/** The workspace in the URL. Throws outside a `/$workspace` route. */
export function useRouteWorkspace() {
  const value = useContext(RouteContext)
  if (!value)
    throw new Error('useRouteWorkspace must be used inside a workspace route')
  return value
}

/** The workspace named by the current URL, or null on a library URL. */
export function usePlace() {
  const pathname = useRouterState({
    select: (state) => state.location.pathname,
  })
  return placeFromPath(pathname)
}

/** The workspace remembered for navigation when the URL does not name one. */
const LAST_HOME = 'gigbook.home'
const listeners = new Set<() => void>()

export function rememberHome(key: string) {
  localStorage.setItem(LAST_HOME, key)
  for (const listener of listeners) listener()
}

function readHome() {
  if (typeof localStorage === 'undefined') return PERSONAL
  return localStorage.getItem(LAST_HOME) || PERSONAL
}

function useRememberedHome() {
  const [key, setKey] = useState(PERSONAL)
  useEffect(() => {
    const read = () => setKey(readHome())
    read()
    listeners.add(read)
    return () => {
      listeners.delete(read)
    }
  }, [])
  return key
}

function personalWorkspace(): Workspace {
  return workspace(PERSONAL, { label: m.personal(), role: 'owner' })
}

const SessionContext = createContext<Workspace | null>(null)

export function WorkspaceState({ children }: { children: ReactNode }) {
  const { isAuthenticated } = useConvexAuth()
  const remembered = useRememberedHome()
  const bands = useQuery(api.bands.list, isAuthenticated ? {} : 'skip')
  const row = bands?.find((item) => item.band._id === remembered)
  const value: Workspace = !isAuthenticated
    ? personalWorkspace()
    : row
      ? workspace(row.band._id, {
          label: row.band.name,
          role: row.membership.role,
        })
      : personalWorkspace()
  return <SessionContext value={value}>{children}</SessionContext>
}

/** The remembered workspace. Shell and library filing use this when the URL has none. */
export function useWorkspace() {
  return useContext(SessionContext) ?? personalWorkspace()
}
