import { createFileRoute } from '@tanstack/react-router'
import { JamRoomPage } from '@/screens/jam'

export const Route = createFileRoute('/_authed/jam/$code')({
  component: JamRoute,
})

function JamRoute() {
  const { code } = Route.useParams()
  return <JamRoomPage code={code} />
}
