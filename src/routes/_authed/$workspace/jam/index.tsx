import { createFileRoute } from '@tanstack/react-router'
import { JamLobby } from '@/screens/jam-lobby'

export const Route = createFileRoute('/_authed/$workspace/jam/')({
  component: JamLobby,
})
