import { createFileRoute } from '@tanstack/react-router'
import type { Id } from '../../../../../../convex/_generated/dataModel'
import { PlayPage } from '@/components/version/play-page'
import { playSearch } from '@/lib/play-search'

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
    />
  )
}
