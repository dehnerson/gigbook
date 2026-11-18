import { createFileRoute } from '@tanstack/react-router'
import { JamLobby } from '@/screens/jam-lobby'

export const Route = createFileRoute('/_authed/w/$workspace/jam/')({
  component: JamLobby,
})
