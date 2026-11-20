import { createFileRoute, Outlet } from '@tanstack/react-router'
import { useQuery } from 'convex/react'
import { useEffect } from 'react'
import { api } from '../../../../convex/_generated/api'
import { RouteNotFound, RoutePending } from '@/components/app/route-states'
import { HomeProvider } from '@/lib/home'
import { rememberHome } from '@/lib/workspace'
import { PERSONAL } from '@/lib/space'
import { m } from '@/paraglide/messages'

export const Route = createFileRoute('/_authed/$workspace')({
  component: WorkspaceFrame,
})

function WorkspaceFrame() {
  const { workspace } = Route.useParams()
  const personal = workspace === PERSONAL
  const live = useQuery(api.bands.resolve, personal ? 'skip' : { workspace })
  useEffect(() => {
    if (personal || live) rememberHome(workspace)
  }, [live, personal, workspace])

  if (personal) {
    return (
      <HomeProvider home={{ bandId: null, label: m.personal(), role: 'owner' }}>
        <Outlet />
      </HomeProvider>
    )
  }
  if (live === undefined) return <RoutePending />
  if (!live) return <RouteNotFound />
  return (
    <HomeProvider
      home={{
        bandId: live.bandId,
        label: live.name || m.personal(),
        role: live.role,
      }}
    >
      <Outlet />
    </HomeProvider>
  )
}
