import { createFileRoute } from '@tanstack/react-router'
import { SetlistsPage } from '@/screens/setlists'
import { useRouteWorkspace } from '@/lib/workspace'

export const Route = createFileRoute('/_authed/$workspace/setlists/')({
  component: WorkspaceSetlistsRoute,
})

function WorkspaceSetlistsRoute() {
  return <SetlistsPage workspace={useRouteWorkspace()} />
}
