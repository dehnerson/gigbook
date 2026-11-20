import { createFileRoute } from '@tanstack/react-router'
import type { Id } from '../../../../../convex/_generated/dataModel'
import { SongPage } from '@/screens/song'
import { useRouteWorkspace } from '@/lib/workspace'

export const Route = createFileRoute('/_authed/$workspace/songs/$songId')({
  component: WorkspaceSongRoute,
})

function WorkspaceSongRoute() {
  const { songId } = Route.useParams()
  return (
    <SongPage songId={songId as Id<'songs'>} workspace={useRouteWorkspace()} />
  )
}
