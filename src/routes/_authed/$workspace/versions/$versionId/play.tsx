import { createFileRoute } from '@tanstack/react-router'
import type { Id } from '../../../../../../convex/_generated/dataModel'
import { PlayPage } from '@/screens/version-play'
import { workspaceTrail } from '@/lib/space'
import { playSearch } from '@/lib/play-search'

export const Route = createFileRoute(
  '/_authed/$workspace/versions/$versionId/play',
)({
  validateSearch: playSearch,
  component: WorkspacePlayRoute,
})

function WorkspacePlayRoute() {
  const { versionId, workspace } = Route.useParams()
  return (
    <PlayPage
      versionId={versionId as Id<'versions'>}
      search={Route.useSearch()}
      trail={workspaceTrail(workspace)}
    />
  )
}
