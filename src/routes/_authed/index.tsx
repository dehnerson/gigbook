import { convexQuery } from '@convex-dev/react-query'
import { createFileRoute } from '@tanstack/react-router'
import { FileInputIcon, LibraryIcon, PlusIcon } from 'lucide-react'
import { useState } from 'react'
import { api } from '../../../convex/_generated/api'
import { EmptyState } from '@/components/app/empty-state'
import { NewSongDialog } from '@/components/app/new-song-dialog'
import {
  HeaderButton,
  HeaderButtonLink,
  PageHeader,
} from '@/components/app/page-header'
import {
  NoMatches,
  ownershipSegments,
  SearchField,
} from '@/components/app/search-field'
import { SongRow } from '@/components/app/song-row'
import { useLiveQuery } from '@/lib/live'
import { matchesScope, matchesSearch } from '@/lib/search'
import type { Scope } from '@/lib/search'
import { m } from '@/paraglide/messages'

export const Route = createFileRoute('/_authed/')({
  loader: ({ context }) => context.load(convexQuery(api.songs.catalog, {})),
  component: LibraryPage,
})

function performersOf(versions: Array<{ artist?: string }>) {
  return versions.flatMap((version) => (version.artist ? [version.artist] : []))
}

function LibraryPage() {
  const catalog = useLiveQuery(convexQuery(api.songs.catalog, {}))
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [scope, setScope] = useState<Scope>('all')

  const rows = catalog.data
  const hasBandSongs = rows.some((row) =>
    row.versions.some((version) => version.bandId),
  )
  const visible = rows.filter(
    (row) =>
      matchesScope(scope, {
        personal: row.versions.some((version) => !version.bandId),
        band: row.versions.some((version) => version.bandId),
      }) &&
      matchesSearch(query, [
        row.song.title,
        row.song.subTitle,
        ...row.versions.flatMap((version) => [version.name, version.artist]),
      ]),
  )

  return (
    <div>
      <PageHeader
        title={m.library()}
        subtitle={
          rows.length > 0
            ? m.songCount({ count: String(rows.length) })
            : undefined
        }
        actions={
          <>
            <HeaderButtonLink variant="outline" to="/import">
              <FileInputIcon />
              {m.importLabel()}
            </HeaderButtonLink>
            <HeaderButton onPress={() => setOpen(true)}>
              <PlusIcon />
              {m.newSong()}
            </HeaderButton>
          </>
        }
      />
      <NewSongDialog isOpen={open} onOpenChange={setOpen} />

      {rows.length === 0 ? (
        <EmptyState
          icon={LibraryIcon}
          title={m.noSongs()}
          description={m.noSongsHint()}
          action={
            <>
              <HeaderButton onPress={() => setOpen(true)}>
                <PlusIcon />
                {m.newSong()}
              </HeaderButton>
              <HeaderButtonLink variant="outline" to="/import">
                <FileInputIcon />
                {m.importLabel()}
              </HeaderButtonLink>
            </>
          }
        />
      ) : (
        <div className="space-y-4">
          <SearchField
            label={m.searchSongs()}
            value={query}
            onChange={setQuery}
            segments={
              hasBandSongs
                ? {
                    label: m.filterSongs(),
                    value: scope,
                    onChange: setScope,
                    options: ownershipSegments(),
                  }
                : undefined
            }
          />

          {visible.length === 0 ? (
            <NoMatches
              query={query}
              onClear={() => {
                setQuery('')
                setScope('all')
              }}
            />
          ) : (
            <ul className="-mx-3 divide-y divide-border/50">
              {visible.map((row) => (
                <SongRow
                  key={row.song._id}
                  song={row.song}
                  performers={performersOf(row.versions)}
                  versionCount={row.versions.length}
                />
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  )
}
