import { createFileRoute } from '@tanstack/react-router'
import type { Id } from '../../../../../convex/_generated/dataModel'
import { ReviewPage } from '@/screens/import-review'
import { workspaceTrail } from '@/lib/space'

export const Route = createFileRoute('/_authed/$workspace/import/$draftId')({
  component: WorkspaceReviewRoute,
})

function WorkspaceReviewRoute() {
  const { draftId, workspace } = Route.useParams()
  return (
    <ReviewPage
      draftId={draftId as Id<'importDrafts'>}
      trail={workspaceTrail(workspace)}
    />
  )
}
