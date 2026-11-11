import { convexQuery } from '@convex-dev/react-query'
import { createFileRoute } from '@tanstack/react-router'
import {
  FileInputIcon,
  LibraryIcon,
  PlusIcon,
  SearchIcon,
  SearchXIcon,
  XIcon,
} from 'lucide-react'
import { useState } from 'react'
import { api } from '../../../convex/_generated/api'
import { EmptyState } from '@/components/app/empty-state'
import { NewSongDialog } from '@/components/app/new-song-dialog'
import { PageHeader } from '@/components/app/page-header'
import { Segmented } from '@/components/app/segmented'
import { SongRow } from '@/components/app/song-row'
import { Button, ButtonLink } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useLiveQuery } from '@/lib/live'
import { m } from '@/paraglide/messages'

export const Route = createFileRoute('/_authed/')({
  loader: ({ context }) => context.load(convexQuery(api.songs.catalog, {})),
  component: LibraryPage,
})

type Scope = 'all' | 'personal' | 'band'

function normalize(text: string) {
  return text
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
}

function performersOf(versions: Array<{ artist?: string }>) {
  return versions.flatMap((version) => (version.artist ? [version.artist] : []))
}

function LibraryPage() {
  const catalog = useLiveQuery(convexQuery(api.songs.catalog, {}))
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [scope, setScope] = useState<Scope>('all')

  const rows = catalog.data
  const hasBandSongs = rows.some((row) => row.song.bandId)
  const needle = normalize(query.trim())
  const visible = rows.filter((row) => {
    if (scope === 'personal' && row.song.bandId) return false
    if (scope === 'band' && !row.song.bandId) return false
    if (!needle) return true
    return normalize(
      [row.song.title, ...performersOf(row.versions)].join(' '),
    ).includes(needle)
  })

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
            <ButtonLink variant="outline" to="/import">
              <FileInputIcon />
              {m.importLabel()}
            </ButtonLink>
            <Button onPress={() => setOpen(true)}>
              <PlusIcon />
              {m.newSong()}
            </Button>
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
              <Button onPress={() => setOpen(true)}>
                <PlusIcon />
                {m.newSong()}
              </Button>
              <ButtonLink variant="outline" to="/import">
                <FileInputIcon />
                {m.importLabel()}
              </ButtonLink>
            </>
          }
        />
      ) : (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative min-w-0 flex-1 basis-64">
              <SearchIcon className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                type="search"
                aria-label={m.searchSongs()}
                placeholder={m.searchSongs()}
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Escape') setQuery('')
                }}
                className="h-10 pr-9 pl-9 [&::-webkit-search-cancel-button]:hidden"
              />
              {query ? (
                <button
                  type="button"
                  aria-label={m.clearSearch()}
                  onClick={() => setQuery('')}
                  className="absolute top-1/2 right-2 grid size-6 -translate-y-1/2 place-items-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
                >
                  <XIcon className="size-3.5" />
                </button>
              ) : null}
            </div>
            {hasBandSongs ? (
              <Segmented
                aria-label={m.filterSongs()}
                value={scope}
                onChange={setScope}
                options={[
                  { id: 'all', label: m.all() },
                  { id: 'personal', label: m.personal() },
                  { id: 'band', label: m.bands() },
                ]}
              />
            ) : null}
          </div>

          {visible.length === 0 ? (
            <EmptyState
              icon={SearchXIcon}
              title={m.noMatches()}
              description={query ? m.noMatchesHint({ query }) : undefined}
              action={
                <Button
                  variant="outline"
                  onPress={() => {
                    setQuery('')
                    setScope('all')
                  }}
                >
                  {m.clearFilters()}
                </Button>
              }
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
