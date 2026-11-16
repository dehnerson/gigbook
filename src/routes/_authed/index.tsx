import { convexQuery } from '@convex-dev/react-query'
import { createFileRoute } from '@tanstack/react-router'
import { api } from '../../../convex/_generated/api'
import { SongCatalog } from '@/components/app/song-catalog'
import { useLiveQuery } from '@/lib/live'
import { m } from '@/paraglide/messages'

export const Route = createFileRoute('/_authed/')({
  loader: ({ context }) => context.load(convexQuery(api.songs.catalog, {})),
  component: LibraryPage,
})

function LibraryPage() {
  const catalog = useLiveQuery(convexQuery(api.songs.catalog, {}))
  return (
    <SongCatalog
      title={m.allSongs()}
      subtitle={m.allSongsHint()}
      rows={catalog.data}
      marks
      emptyTitle={m.noSongs()}
      emptyDescription={m.noSongsHint()}
    />
  )
}
