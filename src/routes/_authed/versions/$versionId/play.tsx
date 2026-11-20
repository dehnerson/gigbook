import { createFileRoute } from '@tanstack/react-router'
import type { Id } from '../../../../../convex/_generated/dataModel'
import { PlayPage } from '@/screens/version-play'
import { libraryTrail } from '@/lib/space'
import { playSearch } from '@/lib/play-search'

export const Route = createFileRoute('/_authed/versions/$versionId/play')({
  validateSearch: playSearch,
  component: LibraryPlayRoute,
})

function LibraryPlayRoute() {
  const { versionId } = Route.useParams()
  return (
    <PlayPage
      versionId={versionId as Id<'versions'>}
      search={Route.useSearch()}
      trail={libraryTrail()}
    />
  )
}
