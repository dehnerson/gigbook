import type { convexQuery } from '@convex-dev/react-query'
import { useSuspenseQuery } from '@tanstack/react-query'
import { FileInputIcon, LibraryIcon, PlusIcon } from 'lucide-react'
import { Suspense, useState } from 'react'
import type { ReactNode } from 'react'
import type { api } from '../../../convex/_generated/api'
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
import { useWorkspace } from '@/lib/workspace'
import { m } from '@/paraglide/messages'
import { ButtonGroup } from '@/components/ui/button-group'
import { href } from '@/lib/space'
import type { PlaceHref } from '@/lib/space'

type CatalogQuery = ReturnType<typeof convexQuery<typeof api.songs.catalog>>
type SongLink = (songId: string) => PlaceHref

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
  songQuery,
  songLink,
}: {
  title: string
  subtitle?: ReactNode
  marks?: boolean
  emptyTitle: string
  emptyDescription: string
  songQuery: CatalogQuery
  songLink: SongLink
}) {
  const { current, inWorkspace } = useWorkspace()
  const canCreate = !inWorkspace || current.role !== null
  const [open, setOpen] = useState(false)
  const actions = (
    <ButtonGroup>
      <HeaderButton isDisabled={!canCreate} onPress={() => setOpen(true)}>
        <PlusIcon />
        {m.song()}
      </HeaderButton>
      <HeaderButtonLink {...href(current.key, { page: 'import' })}>
        <FileInputIcon />
      </HeaderButtonLink>
    </ButtonGroup>
  )

  return (
    <div>
      <PageHeader title={title} subtitle={subtitle} actions={actions} />
      <NewSongDialog isOpen={open} onOpenChange={setOpen} />
      <Suspense fallback={<ListSkeleton />}>
        <CatalogRows
          marks={marks}
          emptyTitle={emptyTitle}
          emptyDescription={emptyDescription}
          actions={actions}
          songQuery={songQuery}
          songLink={songLink}
        />
      </Suspense>
    </div>
  )
}

function CatalogRows({
  marks,
  emptyTitle,
  emptyDescription,
  actions,
  songQuery,
  songLink,
}: {
  marks: boolean
  emptyTitle: string
  emptyDescription: string
  actions: ReactNode
  songQuery: CatalogQuery
  songLink: SongLink
}) {
  const { data: rows } = useSuspenseQuery(songQuery)

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
              songLink={songLink(row.song._id)}
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
