import { createFileRoute } from '@tanstack/react-router'
import { SetlistPage } from '@/screens/setlist'

export const Route = createFileRoute('/_authed/$workspace/setlists/$setlistId')({
  component: SetlistPage,
})
