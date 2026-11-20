import { createFileRoute } from '@tanstack/react-router'
import { SongCatalog } from '@/components/app/song-catalog'
import { useWorkspace } from '@/lib/workspace'
import { m } from '@/paraglide/messages'

export const Route = createFileRoute('/_authed/')({
  component: LibraryPage,
})

function LibraryPage() {
  return (
    <SongCatalog
      title={m.library()}
      subtitle={m.allSongsHint()}
      marks
      workspace={null}
      fileIn={useWorkspace()}
      emptyTitle={m.noSongs()}
      emptyDescription={m.noSongsHint()}
    />
  )
}
