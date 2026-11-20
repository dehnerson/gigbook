import { createFileRoute } from '@tanstack/react-router'
import type { Id } from '../../../../../../convex/_generated/dataModel'
import { PlayPage } from '@/screens/version-play'
import { playSearch } from '@/lib/play-search'
import { useRouteWorkspace } from '@/lib/workspace'

export const Route = createFileRoute(
  '/_authed/$workspace/versions/$versionId/play',
)({
  validateSearch: playSearch,
  component: WorkspacePlayRoute,
})

function WorkspacePlayRoute() {
  const { versionId } = Route.useParams()
  return (
    <PlayPage
      versionId={versionId as Id<'versions'>}
      search={Route.useSearch()}
      workspace={useRouteWorkspace()}
    />
  )
}
