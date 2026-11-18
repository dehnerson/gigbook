import { FileInputIcon, LibraryIcon, PlusIcon } from 'lucide-react'
import { useState } from 'react'
import type { ReactNode } from 'react'
import { ContextMark } from '@/components/app/context-mark'
import { EmptyState } from '@/components/app/empty-state'
import { NewSongDialog } from '@/components/app/new-song-dialog'
import {
  HeaderButton,
  HeaderButtonLink,
  PageHeader,
} from '@/components/app/page-header'
import { NoMatches, SearchField } from '@/components/app/search-field'
import { SongRow } from '@/components/app/song-row'
import type { SongSummary } from '@/components/app/song-row'
import { matchesSearch } from '@/lib/search'
import { useHome } from '@/lib/home'
import { built } from '@/lib/built'
import { path, workspaceTrail } from '@/lib/space'
import { useTrail } from '@/lib/use-trail'
import { useWorkspace } from '@/lib/workspace'
import { m } from '@/paraglide/messages'
import { ButtonGroup } from '@/components/ui/button-group'

export type CatalogVersion = {
  name: string
  artist?: string
  ownerBandId: string | null
  ownerName: string | null
}

export type CatalogRow = {
  song: SongSummary
  versions: Array<CatalogVersion>
}

export function performersOf(versions: Array<{ artist?: string }>) {
  return versions.flatMap((version) => (version.artist ? [version.artist] : []))
}

export function homesOf(versions: Array<CatalogVersion>) {
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
  rows,
  marks = false,
  emptyTitle,
  emptyDescription,
}: {
  title: string
  subtitle?: ReactNode
  rows: Array<CatalogRow> | undefined
  marks?: boolean
  emptyTitle: string
  emptyDescription: string
}) {
  const trail = useTrail()
  const session = useWorkspace()
  const home = useHome()
  const filing =
    trail.kind === 'workspace'
      ? trail
      : workspaceTrail(session.sessionWorkspace)
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const visible = (rows ?? []).filter((row) =>
    matchesSearch(query, [
      row.song.title,
      row.song.subTitle,
      ...row.versions.flatMap((version) => [version.name, version.artist]),
    ]),
  )
  const songButton = (
    <HeaderButton
      isDisabled={trail.kind === 'workspace' && !home}
      onPress={() => setOpen(true)}
    >
      <PlusIcon />
      {trail.kind === 'library'
        ? m.newSong()
        : m.songIn({ name: home?.label ?? '' })}
    </HeaderButton>
  )

  return (
    <div>
      <PageHeader
        title={title}
        subtitle={rows && rows.length > 0 ? subtitle : undefined}
        actions={
          rows && rows.length > 0 ? (
            <ButtonGroup>
              {songButton}
              <HeaderButtonLink {...built(path(filing, { page: 'import' }))}>
                <FileInputIcon />
              </HeaderButtonLink>
            </ButtonGroup>
          ) : null
        }
      />
      <NewSongDialog
        isOpen={open}
        onOpenChange={setOpen}
        bandId={trail.kind === 'workspace' ? (home?.bandId ?? undefined) : undefined}
        chooseHome={trail.kind === 'library'}
      />

      {rows === undefined ? null : rows.length === 0 ? (
        <EmptyState
          icon={LibraryIcon}
          title={emptyTitle}
          description={emptyDescription}
          action={
            <ButtonGroup>
              {songButton}
              <HeaderButtonLink {...built(path(filing, { page: 'import' }))}>
                <FileInputIcon />
              </HeaderButtonLink>
            </ButtonGroup>
          }
        />
      ) : (
        <div className="space-y-4">
          <SearchField
            label={m.searchSongs()}
            value={query}
            onChange={setQuery}
          />

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
                  href={path(trail, { page: 'song', songId: row.song._id })}
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
      )}
    </div>
  )
}
