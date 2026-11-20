import { createFileRoute } from '@tanstack/react-router'
import type { Id } from '../../../../../convex/_generated/dataModel'
import { SetlistPage } from '@/screens/setlist'
import { useRouteWorkspace } from '@/lib/workspace'

export const Route = createFileRoute('/_authed/$workspace/setlists/$setlistId')(
  {
    component: WorkspaceSetlistRoute,
  },
)

function WorkspaceSetlistRoute() {
  const { setlistId } = Route.useParams()
  return (
    <SetlistPage
      setlistId={setlistId as Id<'setlists'>}
      workspace={useRouteWorkspace()}
    />
  )
}
