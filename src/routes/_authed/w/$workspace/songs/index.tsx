import { convexQuery } from '@convex-dev/react-query'
import { createFileRoute } from '@tanstack/react-router'
import { api } from '../../../../../../convex/_generated/api'
import { ContextMark } from '@/components/app/context-mark'
import { SongCatalog } from '@/components/app/song-catalog'
import { useHome } from '@/lib/home'
import { bandIdFromPath } from '@/lib/space'
import { useLiveQuery } from '@/lib/live'
import { m } from '@/paraglide/messages'

export const Route = createFileRoute('/_authed/w/$workspace/songs/')({
  loader: ({ context, params }) =>
    context.load(
      convexQuery(api.songs.catalog, {
        bandId: bandIdFromPath(params.workspace),
      }),
    ),
  component: WorkspaceSongsPage,
})

function WorkspaceSongsPage() {
  const { workspace } = Route.useParams()
  const home = useHome()
  const catalog = useLiveQuery(
    convexQuery(api.songs.catalog, { bandId: bandIdFromPath(workspace) }),
  )
  return (
    <SongCatalog
      title={m.songs()}
      subtitle={
        <span className="inline-flex items-center gap-2">
          <ContextMark bandId={home?.bandId} name={home?.label} />
          {home?.label}
        </span>
      }
      rows={catalog.data}
      emptyTitle={m.noSongsHere({ name: home?.label ?? '' })}
      emptyDescription={m.noSongsHereHint({ name: home?.label ?? '' })}
    />
  )
}
