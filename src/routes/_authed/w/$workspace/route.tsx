import { useOrganization, useOrganizationList } from '@clerk/tanstack-react-start'
import { convexQuery } from '@convex-dev/react-query'
import { createFileRoute, notFound, Outlet } from '@tanstack/react-router'
import { useQuery } from 'convex/react'
import { useEffect } from 'react'
import type { FunctionReturnType } from 'convex/server'
import { api } from '../../../../../convex/_generated/api'
import { RouteNotFound } from '@/components/app/route-states'
import { HomeProvider } from '@/lib/home'
import type { Home } from '@/lib/home'
import { m } from '@/paraglide/messages'

export const Route = createFileRoute('/_authed/w/$workspace')({
  beforeLoad: async ({ context, params }) => {
    const resolved = (await context.load(
      convexQuery(api.bands.resolve, { workspace: params.workspace }),
    )) as FunctionReturnType<typeof api.bands.resolve>
    if (!resolved) throw notFound()
    return { home: homeFrom(resolved) }
  },
  component: WorkspaceFrame,
})

function homeFrom(
  resolved: NonNullable<FunctionReturnType<typeof api.bands.resolve>>,
): Home {
  return {
    bandId: resolved.bandId,
    label: resolved.name || m.personal(),
    role: resolved.role,
    organizationId: resolved.organizationId,
  }
}

function WorkspaceFrame() {
  const { workspace } = Route.useParams()
  const initial = Route.useRouteContext().home
  const live = useQuery(api.bands.resolve, { workspace })
  const home = live === undefined ? initial : live ? homeFrom(live) : null

  if (!home) return <RouteNotFound />
  return (
    <HomeProvider home={home}>
      <SyncClerk organizationId={home.organizationId} />
      <Outlet />
    </HomeProvider>
  )
}

function SyncClerk({ organizationId }: { organizationId: string | null }) {
  const { setActive, isLoaded } = useOrganizationList()
  const { organization } = useOrganization()
  useEffect(() => {
    if (!isLoaded) return
    const current = organization?.id ?? null
    if (current === organizationId) return
    void setActive({ organization: organizationId })
  }, [isLoaded, organization?.id, organizationId, setActive])
  return null
}
