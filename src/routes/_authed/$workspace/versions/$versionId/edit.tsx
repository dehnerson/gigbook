import { createFileRoute } from '@tanstack/react-router'
import type { Id } from '../../../../../../convex/_generated/dataModel'
import { EditPage } from '@/components/version/edit-page'
import { useWorkspace } from '@/lib/workspace'

export const Route = createFileRoute(
  '/_authed/$workspace/versions/$versionId/edit',
)({
  component: WorkspaceEditRoute,
})

function WorkspaceEditRoute() {
  const { versionId } = Route.useParams()
  const { current } = useWorkspace()

  return (
    <EditPage versionId={versionId as Id<'versions'>} workspace={current} />
  )
}
