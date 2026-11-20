import { createFileRoute } from '@tanstack/react-router'
import { JamLobby } from '@/screens/jam-lobby'
import { useRouteWorkspace } from '@/lib/workspace'

export const Route = createFileRoute('/_authed/$workspace/jam/')({
  component: WorkspaceJamRoute,
})

function WorkspaceJamRoute() {
  return <JamLobby workspace={useRouteWorkspace()} />
}
