import { createFileRoute } from '@tanstack/react-router'
import { ImportPage } from '@/screens/import'
import { workspaceTrail } from '@/lib/space'
import { useRouteHome } from '@/lib/workspace'

export const Route = createFileRoute('/_authed/$workspace/import/')({
  component: WorkspaceImportRoute,
})

function WorkspaceImportRoute() {
  const { workspace } = Route.useParams()
  return <ImportPage home={useRouteHome()} trail={workspaceTrail(workspace)} />
}
