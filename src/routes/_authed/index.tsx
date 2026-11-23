import { createFileRoute, linkOptions } from '@tanstack/react-router'
import { SongCatalog } from '@/components/app/song-catalog'
import { m } from '@/paraglide/messages'
import { convexQuery } from '@convex-dev/react-query'
import { api } from '../../../convex/_generated/api'

export const Route = createFileRoute('/_authed/')({
  component: LibraryPage,
})

function LibraryPage() {
  const songQuery = convexQuery(api.songs.catalog, {})

  return (
    <SongCatalog
      title={m.library()}
      subtitle={m.allSongsHint()}
      marks
      emptyTitle={m.noSongs()}
      emptyDescription={m.noSongsHint()}
      songQuery={songQuery}
      songLink={(songId) =>
        linkOptions({
          from: Route.fullPath,
          to: './songs/$songId',
          params: { songId },
        })
      }
    />
  )
}
