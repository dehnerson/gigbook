import { createFileRoute } from '@tanstack/react-router'
import { JamLobby } from '@/screens/jam-lobby'
import { useRouteHome } from '@/lib/workspace'

export const Route = createFileRoute('/_authed/$workspace/jam/')({
  component: WorkspaceJamRoute,
})

function WorkspaceJamRoute() {
  return <JamLobby home={useRouteHome()} />
}
