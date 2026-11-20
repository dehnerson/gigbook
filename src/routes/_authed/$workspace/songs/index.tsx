import { createFileRoute } from '@tanstack/react-router'
import { HomeCaption } from '@/components/app/context-mark'
import { SongCatalog } from '@/components/app/song-catalog'
import { path, workspaceTrail } from '@/lib/space'
import { useRouteHome } from '@/lib/workspace'
import { m } from '@/paraglide/messages'

export const Route = createFileRoute('/_authed/$workspace/songs/')({
  component: WorkspaceSongsPage,
})

function WorkspaceSongsPage() {
  const { workspace } = Route.useParams()
  const home = useRouteHome()
  const trail = workspaceTrail(workspace)
  return (
    <SongCatalog
      title={m.songs()}
      subtitle={<HomeCaption home={home} />}
      scope={{ bandId: home.bandId }}
      songHref={(songId) => path(trail, { page: 'song', songId })}
      importHref={path(trail, { page: 'import' })}
      trail={trail}
      canCreate={home.role !== null}
      emptyTitle={m.noSongsHere({ name: home.label ?? '' })}
      emptyDescription={m.noSongsHint()}
    />
  )
}
