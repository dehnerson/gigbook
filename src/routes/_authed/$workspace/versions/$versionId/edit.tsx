import { createFileRoute } from '@tanstack/react-router'
import type { Id } from '../../../../../../convex/_generated/dataModel'
import { EditPage } from '@/screens/version-edit'
import { workspaceTrail } from '@/lib/space'

export const Route = createFileRoute(
  '/_authed/$workspace/versions/$versionId/edit',
)({
  component: WorkspaceEditRoute,
})

function WorkspaceEditRoute() {
  const { versionId, workspace } = Route.useParams()
  return (
    <EditPage
      versionId={versionId as Id<'versions'>}
      trail={workspaceTrail(workspace)}
    />
  )
}
