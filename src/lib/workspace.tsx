import { useConvexAuth, useQuery } from 'convex/react'
import { createContext, useContext, useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import { api } from '../../convex/_generated/api'
import type { Id } from '../../convex/_generated/dataModel'
import { PERSONAL } from '@/lib/space'
import { m } from '@/paraglide/messages'

/**
 * The workspace in the URL. Null outside a `/$workspace` route.
 * `bandId` is known on the first render. `label` and `role` stay null
 * until the band list matches that id.
 */
export type Home = {
  bandId: Id<'bands'> | null
  label: string | null
  role: 'owner' | 'editor' | 'viewer' | null
}

const HomeContext = createContext<Home | null>(null)

export function HomeProvider({
  home,
  children,
}: {
  home: Home
  children: ReactNode
}) {
  return <HomeContext value={home}>{children}</HomeContext>
}

/** The workspace route's home. Throws on a page that has no workspace in the URL. */
export function useRouteHome() {
  const home = useContext(HomeContext)
  if (!home)
    throw new Error('useRouteHome must be used inside a workspace route')
  return home
}

/** The workspace remembered for navigation when the URL does not name one. */
const LAST_HOME = 'gigbook.home'
const listeners = new Set<() => void>()

export function rememberHome(workspace: string) {
  localStorage.setItem(LAST_HOME, workspace)
  for (const listener of listeners) listener()
}

function readHome() {
  if (typeof localStorage === 'undefined') return PERSONAL
  return localStorage.getItem(LAST_HOME) || PERSONAL
}

function useRememberedHome() {
  const [workspace, setWorkspace] = useState(PERSONAL)
  useEffect(() => {
    const read = () => setWorkspace(readHome())
    read()
    listeners.add(read)
    return () => {
      listeners.delete(read)
    }
  }, [])
  return workspace
}

export type Workspace = {
  ready: boolean
  bandId: Id<'bands'> | null
  label: string
  role: 'owner' | 'editor' | 'viewer'
  sessionWorkspace: string
}

const WorkspaceContext = createContext<Workspace | null>(null)

function personalWorkspace(): Workspace {
  return {
    ready: true,
    bandId: null,
    label: m.personal(),
    role: 'owner',
    sessionWorkspace: PERSONAL,
  }
}

export function WorkspaceState({ children }: { children: ReactNode }) {
  const { isAuthenticated, isLoading } = useConvexAuth()
  const remembered = useRememberedHome()
  const bands = useQuery(api.bands.list, isAuthenticated ? {} : 'skip')
  const row = bands?.find((item) => item.band._id === remembered)
  const value: Workspace = !isAuthenticated
    ? { ...personalWorkspace(), ready: !isLoading }
    : {
        ready: !isLoading && bands !== undefined,
        bandId: row?.band._id ?? null,
        label: row?.band.name ?? m.personal(),
        role: row?.membership.role ?? 'owner',
        sessionWorkspace: row ? row.band._id : PERSONAL,
      }
  return <WorkspaceContext value={value}>{children}</WorkspaceContext>
}

export function useWorkspace() {
  return useContext(WorkspaceContext) ?? personalWorkspace()
}
