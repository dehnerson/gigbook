import { convexQuery } from '@convex-dev/react-query'
import { useSuspenseQuery } from '@tanstack/react-query'
import { Suspense } from 'react'
import { LockIcon } from 'lucide-react'
import { api } from '../../../convex/_generated/api'
import type { Id } from '../../../convex/_generated/dataModel'
import { ContextMark } from '@/components/app/context-mark'
import { EmptyState } from '@/components/app/empty-state'
import { SheetSkeleton } from '@/components/app/route-states'
import type { EditorEntry } from '@/components/editor/types'
import { ButtonLink } from '@/components/ui/button'
import { VersionEditor } from '@/components/version/version-editor'
import type { Workspace } from '@/lib/workspace'
import { m } from '@/paraglide/messages'

export function EditPage({
  versionId,
  workspace,
}: {
  versionId: Id<'versions'>
  workspace?: Workspace
}) {
  return (
    <Suspense fallback={<SheetSkeleton />}>
      <EditView versionId={versionId} workspace={workspace} />
    </Suspense>
  )
}

function EditView({
  versionId,
  workspace,
}: {
  versionId: Id<'versions'>
  workspace?: Workspace
}) {
  const versionLinkOptions = {
    to: workspace ? '/$workspace/versions/$versionId' : '/versions/$versionId',
    params: workspace
      ? { workspace: workspace.key, versionId: versionId }
      : { versionId },
  }

  const bundle = useSuspenseQuery(
    convexQuery(api.versions.getBundle, { versionId }),
  )

  if (!bundle.data.canEdit) {
    return (
      <EmptyState
        icon={LockIcon}
        title={m.errorForbidden()}
        description={m.readOnlyHint()}
        action={<ButtonLink {...versionLinkOptions}>{m.read()}</ButtonLink>}
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
