import { createFileRoute } from '@tanstack/react-router'
import { HomeCaption } from '@/components/app/context-mark'
import { SongCatalog } from '@/components/app/song-catalog'
import { useWorkspace } from '@/lib/workspace'
import { m } from '@/paraglide/messages'

export const Route = createFileRoute('/_authed/$workspace/songs/')({
  component: WorkspaceSongsPage,
})

function WorkspaceSongsPage() {
  const { current } = useWorkspace()

  return (
    <SongCatalog
      title={m.songs()}
      subtitle={<HomeCaption />}
      emptyTitle={m.noSongsHere({ name: current.label })}
      emptyDescription={m.noSongsHint()}
      workspace={current}
    />
  )
}
