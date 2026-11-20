import { createFileRoute } from '@tanstack/react-router'
import type { Id } from '../../../../../convex/_generated/dataModel'
import { EditPage } from '@/screens/version-edit'

export const Route = createFileRoute('/_authed/versions/$versionId/edit')({
  component: LibraryEditRoute,
})

function LibraryEditRoute() {
  const { versionId } = Route.useParams()
  return <EditPage versionId={versionId as Id<'versions'>} workspace={null} />
}
