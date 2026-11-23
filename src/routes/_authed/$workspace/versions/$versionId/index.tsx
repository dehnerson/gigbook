import { createFileRoute } from '@tanstack/react-router'
import type { Id } from '../../../../../../convex/_generated/dataModel'
import { ReadPage } from '@/components/version/read-page'

export const Route = createFileRoute(
  '/_authed/$workspace/versions/$versionId/',
)({
  component: WorkspaceReadRoute,
})

function WorkspaceReadRoute() {
  const { versionId } = Route.useParams()
  return <ReadPage versionId={versionId as Id<'versions'>} />
}
