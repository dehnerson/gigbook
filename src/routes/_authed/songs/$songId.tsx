import { createFileRoute } from '@tanstack/react-router'
import type { Id } from '../../../../convex/_generated/dataModel'
import { SongPage } from '@/screens/song'

export const Route = createFileRoute('/_authed/songs/$songId')({
  component: LibrarySongRoute,
})

function LibrarySongRoute() {
  const { songId } = Route.useParams()
  return <SongPage songId={songId as Id<'songs'>} workspace={null} />
}
