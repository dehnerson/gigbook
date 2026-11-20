import { createFileRoute } from '@tanstack/react-router'
import type { Id } from '../../../../../convex/_generated/dataModel'
import { SetlistPage } from '@/screens/setlist'
import { workspaceTrail } from '@/lib/space'
import { useRouteHome } from '@/lib/workspace'

export const Route = createFileRoute('/_authed/$workspace/setlists/$setlistId')(
  {
    component: WorkspaceSetlistRoute,
  },
)

function WorkspaceSetlistRoute() {
  const { setlistId, workspace } = Route.useParams()
  return (
    <SetlistPage
      setlistId={setlistId as Id<'setlists'>}
      home={useRouteHome()}
      trail={workspaceTrail(workspace)}
    />
  )
}
