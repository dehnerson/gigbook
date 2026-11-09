import { convexQuery } from '@convex-dev/react-query'
import { createFileRoute } from '@tanstack/react-router'
import { LockIcon } from 'lucide-react'
import { api } from '../../../../../convex/_generated/api'
import type { Id } from '../../../../../convex/_generated/dataModel'
import { EmptyState } from '@/components/app/empty-state'
import type { EditorEntry } from '@/components/editor/types'
import { ButtonLink } from '@/components/ui/button'
import { VersionEditor } from '@/components/version-editor'
import { useLiveQuery } from '@/lib/live'
import { m } from '@/paraglide/messages'

export const Route = createFileRoute('/_authed/versions/$versionId/edit')({
  loader: ({ context, params }) =>
    context.load(
      convexQuery(api.versions.getBundle, {
        versionId: params.versionId as Id<'versions'>,
      }),
    ),
  component: EditPage,
})

function EditPage() {
  const versionId = Route.useParams().versionId as Id<'versions'>
  const bundle = useLiveQuery(
    convexQuery(api.versions.getBundle, { versionId }),
  )
  if (!bundle.data.canEdit) {
    return (
      <EmptyState
        icon={LockIcon}
        title={m.errorForbidden()}
        description={m.readOnlyHint()}
        action={
          <ButtonLink to="/versions/$versionId" params={{ versionId }}>
            {m.read()}
          </ButtonLink>
        }
      />
    )
  }
  return (
    <VersionEditor
      version={bundle.data.version}
      song={bundle.data.song}
      timeline={bundle.data.timeline as Array<EditorEntry>}
      shapes={bundle.data.shapes}
    />
  )
}
