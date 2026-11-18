import { createFileRoute } from '@tanstack/react-router'
import { SetlistsPage } from '@/screens/setlists'

export const Route = createFileRoute('/_authed/w/$workspace/setlists/')({
  component: SetlistsPage,
})
