import {
  useAuth,
  useOrganization,
  useOrganizationList,
  useUser,
} from '@clerk/tanstack-react-start'
import { useConvexAuth, useQuery } from 'convex/react'
import { createContext, useContext } from 'react'
import type { ReactNode } from 'react'
import { api } from '../../convex/_generated/api'
import type { Id } from '../../convex/_generated/dataModel'
import { PERSONAL } from '@/lib/space'
import { m } from '@/paraglide/messages'

export type Workspace = {
  ready: boolean
  bandId: Id<'bands'> | null
  label: string
  role: 'owner' | 'editor' | 'viewer'
  organizationId: string | null
  sessionWorkspace: string
  activate: (organizationId: string | null) => Promise<void>
  switchTo: (bandId: string | null) => Promise<void>
}

const WorkspaceContext = createContext<Workspace | null>(null)

function personalWorkspace(): Workspace {
  return {
    ready: true,
    bandId: null,
    label: m.personal(),
    role: 'owner',
    organizationId: null,
    sessionWorkspace: PERSONAL,
    activate: async () => {},
    switchTo: async () => {},
  }
}

export function WorkspaceState({ children }: { children: ReactNode }) {
  const { isLoaded, isSignedIn } = useAuth()
  if (!isLoaded || !isSignedIn) {
    return (
      <WorkspaceContext value={personalWorkspace()}>{children}</WorkspaceContext>
    )
  }
  return <ActiveWorkspace>{children}</ActiveWorkspace>
}

function ActiveWorkspace({ children }: { children: ReactNode }) {
  const { isAuthenticated } = useConvexAuth()
  const { organization, isLoaded: orgLoaded } = useOrganization()
  const { user } = useUser()
  const { setActive, isLoaded: listLoaded } = useOrganizationList()
  const bands = useQuery(api.bands.list, isAuthenticated ? {} : 'skip')
  const organizationId = organization?.id ?? null
  const row = bands?.find(
    (item) => item.band.clerkOrganizationId === organizationId,
  )
  const waiting = Boolean(organizationId) && bands !== undefined && !row
  const value: Workspace = {
    ready: Boolean(
      isAuthenticated &&
        orgLoaded &&
        listLoaded &&
        bands !== undefined &&
        !waiting,
    ),
    bandId: organizationId ? (row?.band._id ?? null) : null,
    label: organizationId
      ? (row?.band.name ?? organization?.name ?? m.personal())
      : m.personal(),
    role: row?.membership.role ?? 'owner',
    organizationId,
    sessionWorkspace: row?.band._id ?? PERSONAL,
    async activate(next) {
      if (
        next &&
        !user?.organizationMemberships.some(
          (membership) => membership.organization.id === next,
        )
      )
        await user?.reload()
      await setActive?.({ organization: next })
    },
    async switchTo(bandId) {
      if (!bandId) {
        await this.activate(null)
        return
      }
      const match = bands?.find((item) => item.band._id === bandId)
      if (match) await this.activate(match.band.clerkOrganizationId)
    },
  }
  return <WorkspaceContext value={value}>{children}</WorkspaceContext>
}

export function useWorkspace() {
  return useContext(WorkspaceContext) ?? personalWorkspace()
}
