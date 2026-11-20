import { createFileRoute, Outlet } from '@tanstack/react-router'
import { useQuery } from 'convex/react'
import { useEffect } from 'react'
import { api } from '../../../../convex/_generated/api'
import { RouteNotFound } from '@/components/app/route-states'
import { rememberHome, RouteWorkspace } from '@/lib/workspace'
import { PERSONAL, workspace } from '@/lib/space'
import { m } from '@/paraglide/messages'

export const Route = createFileRoute('/_authed/$workspace')({
  component: WorkspaceFrame,
})

function WorkspaceFrame() {
  const { workspace: key } = Route.useParams()
  const personal = key === PERSONAL
  const bands = useQuery(api.bands.list)
  const row = personal
    ? undefined
    : bands?.find((item) => item.band._id === key)

  useEffect(() => {
    if (personal || row) rememberHome(key)
  }, [personal, row, key])

  if (!personal && bands && !row) return <RouteNotFound />

  const value = personal
    ? workspace(PERSONAL, { label: m.personal(), role: 'owner' })
    : row
      ? workspace(key, { label: row.band.name, role: row.membership.role })
      : workspace(key)

  return (
    <RouteWorkspace workspace={value}>
      <Outlet />
    </RouteWorkspace>
  )
}
