import { createFileRoute } from '@tanstack/react-router'
import type { Id } from '../../../../../../convex/_generated/dataModel'
import { ReadPage } from '@/screens/version'
import { workspaceTrail } from '@/lib/space'
import { useRouteHome } from '@/lib/workspace'

export const Route = createFileRoute(
  '/_authed/$workspace/versions/$versionId/',
)({
  component: WorkspaceReadRoute,
})

function WorkspaceReadRoute() {
  const { versionId, workspace } = Route.useParams()
  return (
    <ReadPage
      versionId={versionId as Id<'versions'>}
      home={useRouteHome()}
      trail={workspaceTrail(workspace)}
    />
  )
}
