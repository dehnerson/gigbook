import { convexQuery } from '@convex-dev/react-query'
import { createFileRoute, useParams } from '@tanstack/react-router'
import { LockIcon } from 'lucide-react'
import { api } from '../../../../../convex/_generated/api'
import type { Id } from '../../../../../convex/_generated/dataModel'
import { ContextMark } from '@/components/app/context-mark'
import { EmptyState } from '@/components/app/empty-state'
import type { EditorEntry } from '@/components/editor/types'
import { ButtonLink } from '@/components/ui/button'
import { VersionEditor } from '@/components/version-editor'
import { useLiveQuery } from '@/lib/live'
import { built } from '@/lib/built'
import { useGo } from '@/lib/use-trail'
import { m } from '@/paraglide/messages'

export const Route = createFileRoute('/_authed/versions/$versionId/edit')({
  component: EditPage,
})

export function EditPage() {
  const versionId = useParams({ strict: false }).versionId as Id<'versions'>
  const { href } = useGo()
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
          <ButtonLink {...built(href({ page: 'version', versionId }))}>
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
      versionCount={bundle.data.versionCount}
      mark={
        <ContextMark
          bandId={bundle.data.ownerBandId}
          name={bundle.data.ownerName}
        />
      }
    />
  )
}
