import { createFileRoute } from '@tanstack/react-router'
import { SharePage } from '@/screens/share'

export const Route = createFileRoute('/_authed/share/$token')({
  head: () => ({
    meta: [{ name: 'referrer', content: 'no-referrer' }],
  }),
  component: ShareRoute,
})

function ShareRoute() {
  const { token } = Route.useParams()
  return <SharePage token={token} />
}
