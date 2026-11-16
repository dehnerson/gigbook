import { convexQuery } from '@convex-dev/react-query'
import { createFileRoute } from '@tanstack/react-router'
import { api } from '../../../../convex/_generated/api'
import { ContextMark } from '@/components/app/context-mark'
import { SongCatalog } from '@/components/app/song-catalog'
import type { CatalogRow } from '@/components/app/song-catalog'
import { useLiveQuery } from '@/lib/live'
import { useWorkspace } from '@/lib/workspace'
import { m } from '@/paraglide/messages'

export const Route = createFileRoute('/_authed/songs/')({
  loader: ({ context }) => context.load(convexQuery(api.songs.catalog, {})),
  component: WorkspaceSongsPage,
})

function inWorkspace(ownerBandId: string | null, bandId: string | null) {
  return ownerBandId === bandId
}

function WorkspaceSongsPage() {
  const catalog = useLiveQuery(convexQuery(api.songs.catalog, {}))
  const workspace = useWorkspace()
  const home = workspace.bandId ?? null
  const rows: Array<CatalogRow> | undefined = workspace.ready
    ? catalog.data.flatMap((row) => {
        const versions = row.versions.filter((version) =>
          inWorkspace(version.ownerBandId, home),
        )
        return versions.length > 0 ? [{ song: row.song, versions }] : []
      })
    : undefined

  return (
    <SongCatalog
      title={m.songs()}
      subtitle={
        <span className="inline-flex items-center gap-2">
          <ContextMark
            bandId={workspace.organizationId ? workspace.bandId : null}
            name={workspace.organizationId ? workspace.label : null}
          />
          {workspace.label}
        </span>
      }
      rows={rows}
      scoped
      emptyTitle={m.noSongsHere({ name: workspace.label })}
      emptyDescription={m.noSongsHereHint({ name: workspace.label })}
    />
  )
}
