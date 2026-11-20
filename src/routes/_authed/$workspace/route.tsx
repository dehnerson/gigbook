import { createFileRoute, Outlet } from '@tanstack/react-router'
import { useQuery } from 'convex/react'
import { useEffect } from 'react'
import { api } from '../../../../convex/_generated/api'
import { RouteNotFound } from '@/components/app/route-states'
import { HomeProvider, rememberHome } from '@/lib/workspace'
import type { Home } from '@/lib/workspace'
import { PERSONAL, bandIdFromPath } from '@/lib/space'
import { m } from '@/paraglide/messages'

export const Route = createFileRoute('/_authed/$workspace')({
  component: WorkspaceFrame,
})

function WorkspaceFrame() {
  const { workspace } = Route.useParams()
  const personal = workspace === PERSONAL
  const bands = useQuery(api.bands.list)
  const bandId = bandIdFromPath(workspace)
  const row = personal
    ? undefined
    : bands?.find((item) => item.band._id === bandId)
  useEffect(() => {
    if (personal || row) rememberHome(workspace)
  }, [personal, row, workspace])

  if (!personal && bands && !row) return <RouteNotFound />

  const home: Home = personal
    ? { bandId: null, label: m.personal(), role: 'owner' }
    : row
      ? {
          bandId: row.band._id,
          label: row.band.name,
          role: row.membership.role,
        }
      : { bandId, label: null, role: null }

  return (
    <HomeProvider home={home}>
      <Outlet />
    </HomeProvider>
  )
}
