import { createFileRoute } from '@tanstack/react-router'
import { HomeCaption } from '@/components/app/context-mark'
import { SongCatalog } from '@/components/app/song-catalog'
import { useRouteWorkspace } from '@/lib/workspace'
import { m } from '@/paraglide/messages'

export const Route = createFileRoute('/_authed/$workspace/songs/')({
  component: WorkspaceSongsPage,
})

function WorkspaceSongsPage() {
  const workspace = useRouteWorkspace()
  return (
    <SongCatalog
      title={m.songs()}
      subtitle={<HomeCaption workspace={workspace} />}
      workspace={workspace}
      emptyTitle={m.noSongsHere({ name: workspace.label ?? '' })}
      emptyDescription={m.noSongsHint()}
    />
  )
}
