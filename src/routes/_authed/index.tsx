import { createFileRoute } from '@tanstack/react-router'
import { SongCatalog } from '@/components/app/song-catalog'
import { libraryTrail, path, workspaceTrail } from '@/lib/space'
import { useWorkspace } from '@/lib/workspace'
import { m } from '@/paraglide/messages'

export const Route = createFileRoute('/_authed/')({
  component: LibraryPage,
})

function LibraryPage() {
  const { sessionWorkspace } = useWorkspace()
  const trail = libraryTrail()
  return (
    <SongCatalog
      title={m.library()}
      subtitle={m.allSongsHint()}
      marks
      songHref={(songId) => path(trail, { page: 'song', songId })}
      importHref={path(workspaceTrail(sessionWorkspace), { page: 'import' })}
      trail={trail}
      chooseHome
      emptyTitle={m.noSongs()}
      emptyDescription={m.noSongsHint()}
    />
  )
}
