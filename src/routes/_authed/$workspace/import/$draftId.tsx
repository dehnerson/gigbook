import { createFileRoute } from '@tanstack/react-router'
import type { Id } from '../../../../../convex/_generated/dataModel'
import { ReviewPage } from '@/screens/import-review'
import { useRouteWorkspace } from '@/lib/workspace'

export const Route = createFileRoute('/_authed/$workspace/import/$draftId')({
  component: WorkspaceReviewRoute,
})

function WorkspaceReviewRoute() {
  const { draftId } = Route.useParams()
  return (
    <ReviewPage
      draftId={draftId as Id<'importDrafts'>}
      workspace={useRouteWorkspace()}
    />
  )
}
