import { createFileRoute } from '@tanstack/react-router'
import type { Id } from '../../../../../convex/_generated/dataModel'
import { ReadPage } from '@/screens/version'
import { libraryTrail } from '@/lib/space'

export const Route = createFileRoute('/_authed/versions/$versionId/')({
  component: LibraryReadRoute,
})

function LibraryReadRoute() {
  const { versionId } = Route.useParams()
  return (
    <ReadPage
      versionId={versionId as Id<'versions'>}
      home={null}
      trail={libraryTrail()}
    />
  )
}
