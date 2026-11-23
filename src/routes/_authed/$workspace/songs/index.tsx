import { convexQuery } from '@convex-dev/react-query'
import { createFileRoute, linkOptions } from '@tanstack/react-router'
import { api } from '../../../../../convex/_generated/api'
import { HomeCaption } from '@/components/app/context-mark'
import { SongCatalog } from '@/components/app/song-catalog'
import { useWorkspace } from '@/lib/workspace'
import { m } from '@/paraglide/messages'

export const Route = createFileRoute('/_authed/$workspace/songs/')({
  component: WorkspaceSongsPage,
})

function WorkspaceSongsPage() {
  const { current } = useWorkspace()

  const songQuery = convexQuery(api.songs.catalog, {
    bandId: current.bandId,
  })

  return (
    <SongCatalog
      title={m.songs()}
      subtitle={<HomeCaption />}
      emptyTitle={m.noSongsHere({ name: current.label ?? '' })}
      emptyDescription={m.noSongsHint()}
      songQuery={songQuery}
      songLink={(songId) =>
        linkOptions({
          from: Route.fullPath,
          to: './$songId',
          params: { songId },
        })
      }
    />
  )
}
