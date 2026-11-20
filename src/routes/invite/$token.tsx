import { createFileRoute } from '@tanstack/react-router'
import { InviteScreen } from '@/screens/auth/invite'

export const Route = createFileRoute('/invite/$token')({
  component: InvitePage,
})

function InvitePage() {
  const { token } = Route.useParams()
  return <InviteScreen token={token} />
}
