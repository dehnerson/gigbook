import { createFileRoute } from '@tanstack/react-router'
import type { Id } from '../../../../../../convex/_generated/dataModel'
import { ReadPage } from '@/components/version/read-page'
import { useWorkspace } from '@/lib/workspace'

export const Route = createFileRoute(
  '/_authed/$workspace/versions/$versionId/',
)({
  component: WorkspaceReadRoute,
})

function WorkspaceReadRoute() {
  const { versionId } = Route.useParams()

  const { current } = useWorkspace()

  return (
    <ReadPage versionId={versionId as Id<'versions'>} workspace={current} />
  )
}
