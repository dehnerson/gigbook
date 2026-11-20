import { convexQuery } from '@convex-dev/react-query'
import { useSuspenseQuery } from '@tanstack/react-query'
import { FileInputIcon, LibraryIcon, PlusIcon } from 'lucide-react'
import { Suspense, useState } from 'react'
import type { ReactNode } from 'react'
import { api } from '../../../convex/_generated/api'
import { ContextMark } from '@/components/app/context-mark'
import { EmptyState } from '@/components/app/empty-state'
import { NewSongDialog } from '@/components/app/new-song-dialog'
import {
  HeaderButton,
  HeaderButtonLink,
  PageHeader,
} from '@/components/app/page-header'
import { NoMatches, SearchField } from '@/components/app/search-field'
import { ListSkeleton } from '@/components/app/route-states'
import { SongRow } from '@/components/app/song-row'
import { matchesSearch } from '@/lib/search'
import { built } from '@/lib/built'
import { path, workspaceOf } from '@/lib/space'
import type { Workspace } from '@/lib/space'
import { m } from '@/paraglide/messages'
import { ButtonGroup } from '@/components/ui/button-group'

type CatalogVersion = {
  name: string
  artist?: string
  ownerBandId: string | null
  ownerName: string | null
}

function performersOf(versions: Array<{ artist?: string }>) {
  return versions.flatMap((version) => (version.artist ? [version.artist] : []))
}

function homesOf(versions: Array<CatalogVersion>) {
  const seen = new Set<string>()
  return versions.filter((version) => {
    const key = version.ownerBandId ?? 'personal'
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
}

export function SongCatalog({
  title,
  subtitle,
  marks = false,
  emptyTitle,
  emptyDescription,
  workspace,
  fileIn,
}: {
  title: string
  subtitle?: ReactNode
  marks?: boolean
  emptyTitle: string
  emptyDescription: string
  /** Null lists every song. */
  workspace: Workspace | null
  /** Where a library import is filed. */
  fileIn?: Workspace
}) {
  const filing = workspace ?? fileIn ?? workspaceOf(null)
  const canCreate = workspace === null || workspace.role !== null
  const [open, setOpen] = useState(false)
  const actions = (
    <ButtonGroup>
      <HeaderButton isDisabled={!canCreate} onPress={() => setOpen(true)}>
        <PlusIcon />
        {m.song()}
      </HeaderButton>
      <HeaderButtonLink {...built(path(filing, { page: 'import' }))}>
        <FileInputIcon />
      </HeaderButtonLink>
    </ButtonGroup>
  )

  return (
    <div>
      <PageHeader title={title} subtitle={subtitle} actions={actions} />
      <NewSongDialog
        isOpen={open}
        onOpenChange={setOpen}
        fileIn={filing}
        choose={workspace === null}
      />
      <Suspense fallback={<ListSkeleton />}>
        <CatalogRows
          workspace={workspace}
          marks={marks}
          songHref={(songId) => path(workspace, { page: 'song', songId })}
          emptyTitle={emptyTitle}
          emptyDescription={emptyDescription}
          actions={actions}
        />
      </Suspense>
    </div>
  )
}

function CatalogRows({
  workspace,
  marks,
  songHref,
  emptyTitle,
  emptyDescription,
  actions,
}: {
  workspace: Workspace | null
  marks: boolean
  songHref: (songId: string) => string
  emptyTitle: string
  emptyDescription: string
  actions: ReactNode
}) {
  const { data: rows } = useSuspenseQuery(
    convexQuery(
      api.songs.catalog,
      workspace ? { bandId: workspace.bandId } : {},
    ),
  )
  const [query, setQuery] = useState('')
  const visible = rows.filter((row) =>
    matchesSearch(query, [
      row.song.title,
      row.song.subTitle,
      ...row.versions.flatMap((version) => [version.name, version.artist]),
    ]),
  )
  if (rows.length === 0)
    return (
      <EmptyState
        icon={LibraryIcon}
        title={emptyTitle}
        description={emptyDescription}
        action={actions}
      />
    )
  return (
    <div className="space-y-4">
      <SearchField label={m.searchSongs()} value={query} onChange={setQuery} />
      {visible.length === 0 ? (
        <NoMatches query={query} onClear={() => setQuery('')} />
      ) : (
        <ul className="-mx-3 divide-y divide-border/50">
          {visible.map((row) => (
            <SongRow
              key={row.song._id}
              song={row.song}
              performers={performersOf(row.versions)}
              versionCount={row.versions.length}
              href={songHref(row.song._id)}
              trailing={
                marks ? (
                  <span className="flex items-center gap-1">
                    {homesOf(row.versions).map((version) => (
                      <ContextMark
                        key={version.ownerBandId ?? 'personal'}
                        {...version}
                      />
                    ))}
                  </span>
                ) : null
              }
            />
          ))}
        </ul>
      )}
    </div>
  )
}
