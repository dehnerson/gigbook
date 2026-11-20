import { createFileRoute } from '@tanstack/react-router'
import { SetlistsPage } from '@/screens/setlists'
import { workspaceTrail } from '@/lib/space'
import { useRouteHome } from '@/lib/workspace'

export const Route = createFileRoute('/_authed/$workspace/setlists/')({
  component: WorkspaceSetlistsRoute,
})

function WorkspaceSetlistsRoute() {
  const { workspace } = Route.useParams()
  return (
    <SetlistsPage home={useRouteHome()} trail={workspaceTrail(workspace)} />
  )
}
