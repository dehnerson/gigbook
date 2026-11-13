import { convexQuery } from '@convex-dev/react-query'
import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import { useMutation } from 'convex/react'
import { cn } from 'cn'
import {
  ArrowDownIcon,
  ArrowUpIcon,
  CheckIcon,
  EllipsisIcon,
  GripVerticalIcon,
  ListMusicIcon,
  PlayIcon,
  PlusIcon,
  Trash2Icon,
  XIcon,
} from 'lucide-react'
import { Suspense, useEffect, useState } from 'react'
import { toast } from 'sonner'
import { api } from '../../../../convex/_generated/api'
import type { Id } from '../../../../convex/_generated/dataModel'
import { Monogram } from '@/components/app/chip'
import { ContextMark } from '@/components/app/context-mark'
import { ConfirmDialog } from '@/components/app/confirm-dialog'
import { EmptyState } from '@/components/app/empty-state'
import { InlineEdit } from '@/components/app/inline-edit'
import {
  Crumb,
  HeaderButton,
  HeaderButtonLink,
  PageHeader,
} from '@/components/app/page-header'
import { NoMatches, SearchField } from '@/components/app/search-field'
import { useSortable } from '@/components/app/sortable'
import { Button, ButtonLink } from '@/components/ui/button'
import {
  Dialog,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  DropdownMenu,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Skeleton } from '@/components/ui/skeleton'
import { VersionCaption } from '@/components/sheet/song-sheet'
import { useNotation } from '@/components/use-notation'
import { messageFor } from '@/lib/errors'
import { matchesSearch } from '@/lib/search'
import { useLiveQuery } from '@/lib/live'
import { displayChord } from '@/lib/music/chords'
import { m } from '@/paraglide/messages'

export const Route = createFileRoute('/_authed/setlists/$setlistId')({
  loader: ({ context, params }) =>
    context.load(
      convexQuery(api.setlists.get, {
        setlistId: params.setlistId as Id<'setlists'>,
      }),
    ),
  component: SetlistPage,
})

function SetlistPage() {
  const setlistId = Route.useParams().setlistId as Id<'setlists'>
  const query = useLiveQuery(convexQuery(api.setlists.get, { setlistId }))
  const { setlist, entries, canEdit, bandName } = query.data
  const rename = useMutation(api.setlists.rename)
  const remove = useMutation(api.setlists.remove)
  const reorder = useMutation(api.setlists.reorder)
  const removeItem = useMutation(api.setlists.removeItem)
  const navigate = useNavigate()
  const notation = useNotation()
  const [picker, setPicker] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [songQuery, setSongQuery] = useState('')
  const compact = useMediaQuery('(max-width: 639px)')

  const fail = (error: unknown) => toast.error(messageFor(error))
  const sortable = useSortable(
    entries.map((entry) => entry.item._id),
    (ids) =>
      void reorder({
        setlistId,
        itemIds: ids as Array<Id<'setlistItems'>>,
      }).catch(fail),
  )
  const byId = new Map(entries.map((entry) => [entry.item._id, entry]))
  const searching = songQuery.trim().length > 0
  const visible = sortable.order.flatMap((itemId, index) => {
    const entry = byId.get(itemId as Id<'setlistItems'>)
    if (!entry) return []
    if (
      !matchesSearch(songQuery, [
        entry.song.title,
        entry.song.subTitle,
        entry.version.name,
        entry.version.artist,
      ])
    )
      return []
    return [{ itemId, index, entry }]
  })
  const first = entries.at(0)

  return (
    <div>
      <PageHeader
        breadcrumbs={[
          <Crumb key="setlists" to="/setlists">
            {m.setlists()}
          </Crumb>,
          <span key="name" className="truncate text-foreground">
            {setlist.name}
          </span>,
        ]}
        title={
          <span className="inline-flex min-w-0 items-center gap-3">
            <ContextMark bandId={setlist.bandId} name={bandName} />
            <InlineEdit
              label={m.renameSetlist()}
              value={setlist.name}
              isDisabled={!canEdit}
              onSave={(name) => rename({ setlistId, name }).catch(fail)}
            />
          </span>
        }
        subtitle={m.songCount({ count: String(entries.length) })}
        actions={
          <>
            {first ? (
              <HeaderButtonLink
                to="/versions/$versionId/play"
                params={{ versionId: first.version._id }}
                search={{ setlist: setlistId, index: 0 }}
              >
                <PlayIcon className="fill-current" />
                {m.playSetlist()}
              </HeaderButtonLink>
            ) : null}
            {canEdit ? (
              <>
                <HeaderButton variant="outline" onPress={() => setPicker(true)}>
                  <PlusIcon />
                  {m.addSong()}
                </HeaderButton>
                <DropdownMenuTrigger>
                  <HeaderButton
                    size="icon-lg"
                    variant="outline"
                    aria-label={m.more()}
                  >
                    <EllipsisIcon />
                  </HeaderButton>
                  <DropdownMenu placement="bottom end" className="w-52">
                    <DropdownMenuItem
                      variant="destructive"
                      textValue={m.deleteSetlist()}
                      onAction={() => setConfirmDelete(true)}
                    >
                      <Trash2Icon />
                      {m.deleteSetlist()}
                    </DropdownMenuItem>
                  </DropdownMenu>
                </DropdownMenuTrigger>
              </>
            ) : null}
          </>
        }
      />

      {entries.length === 0 ? (
        <EmptyState
          icon={ListMusicIcon}
          title={m.emptySetlist()}
          description={canEdit ? m.emptySetlistHint() : undefined}
          action={
            canEdit ? (
              <HeaderButton onPress={() => setPicker(true)}>
                <PlusIcon />
                {m.addSong()}
              </HeaderButton>
            ) : undefined
          }
        />
      ) : (
        <div className="space-y-4">
          <SearchField
            label={m.searchSongs()}
            value={songQuery}
            onChange={setSongQuery}
          />
          {visible.length === 0 ? (
            <NoMatches query={songQuery} onClear={() => setSongQuery('')} />
          ) : (
            <ol className="space-y-2">
              {visible.map(({ itemId, index, entry }) => (
                <li
                  key={itemId}
                  {...(canEdit && !searching ? sortable.itemProps(itemId) : {})}
                  className={cn(
                    'group relative flex items-center gap-3 rounded-2xl border bg-card px-3 py-3 transition-colors hover:border-foreground/15 sm:px-4',
                    sortable.dragging === itemId && 'opacity-50',
                  )}
                >
                  {canEdit && !searching ? (
                    <GripVerticalIcon className="relative z-10 hidden size-4 shrink-0 cursor-grab text-muted-foreground/50 group-hover:text-muted-foreground sm:block" />
                  ) : null}
                  <span className="w-7 shrink-0 text-right font-mono text-lg font-semibold text-muted-foreground tabular-nums">
                    {index + 1}
                  </span>
                  <Monogram
                    text={entry.song.title}
                    className="hidden sm:grid"
                  />
                  <div className="min-w-0 flex-1">
                    <span className="flex min-w-0 items-center gap-2">
                      <Link
                        to="/versions/$versionId"
                        params={{ versionId: entry.version._id }}
                        draggable={false}
                        className="truncate font-medium outline-none after:absolute after:inset-0 after:rounded-2xl focus-visible:after:ring-2 focus-visible:after:ring-ring"
                      >
                        {entry.song.title}
                      </Link>
                      <ContextMark {...entry} />
                    </span>
                    <VersionCaption
                      name={entry.version.name}
                      artist={entry.version.artist}
                      className="truncate"
                    />
                  </div>
                  <span className="hidden font-mono text-base font-semibold text-chord sm:inline">
                    {displayChord(entry.version.concertKey, 0, 0, notation)}
                  </span>
                  <div className="relative z-10 flex shrink-0 items-center gap-0.5">
                    {canEdit && !searching ? (
                      <>
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          aria-label={m.moveUp()}
                          isDisabled={index === 0}
                          onPress={() => sortable.move(itemId, -1)}
                          className="hidden sm:inline-flex"
                        >
                          <ArrowUpIcon />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          aria-label={m.moveDown()}
                          isDisabled={index === entries.length - 1}
                          onPress={() => sortable.move(itemId, 1)}
                          className="hidden sm:inline-flex"
                        >
                          <ArrowDownIcon />
                        </Button>
                      </>
                    ) : null}
                    <ButtonLink
                      variant="ghost"
                      size="icon"
                      aria-label={m.play()}
                      to="/versions/$versionId/play"
                      params={{ versionId: entry.version._id }}
                      search={{ setlist: setlistId, index }}
                    >
                      <PlayIcon className="fill-current" />
                    </ButtonLink>
                    {canEdit ? (
                      <DropdownMenuTrigger>
                        <Button
                          variant="ghost"
                          size="icon"
                          aria-label={m.more()}
                        >
                          <EllipsisIcon />
                        </Button>
                        <DropdownMenu placement="bottom end" className="w-44">
                          {compact && !searching ? (
                            <>
                              <DropdownMenuItem
                                textValue={m.moveUp()}
                                isDisabled={index === 0}
                                onAction={() => sortable.move(itemId, -1)}
                              >
                                <ArrowUpIcon />
                                {m.moveUp()}
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                textValue={m.moveDown()}
                                isDisabled={index === entries.length - 1}
                                onAction={() => sortable.move(itemId, 1)}
                              >
                                <ArrowDownIcon />
                                {m.moveDown()}
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                            </>
                          ) : null}
                          <DropdownMenuItem
                            variant="destructive"
                            textValue={m.remove()}
                            onAction={() =>
                              void removeItem({ itemId: entry.item._id }).catch(
                                fail,
                              )
                            }
                          >
                            <XIcon />
                            {m.remove()}
                          </DropdownMenuItem>
                        </DropdownMenu>
                      </DropdownMenuTrigger>
                    ) : null}
                  </div>
                </li>
              ))}
            </ol>
          )}
        </div>
      )}

      {canEdit ? (
        <Suspense
          fallback={
            picker ? (
              <Dialog isOpen onOpenChange={setPicker} className="sm:max-w-lg">
                <DialogHeader>
                  <DialogTitle>{m.addSong()}</DialogTitle>
                  <DialogDescription>{m.songPickerHint()}</DialogDescription>
                </DialogHeader>
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-48 w-full" />
              </Dialog>
            ) : null
          }
        >
          <SongPicker
            isOpen={picker}
            onOpenChange={setPicker}
            setlistId={setlistId}
            included={new Set(entries.map((entry) => entry.version._id))}
          />
        </Suspense>
      ) : null}
      <ConfirmDialog
        isOpen={confirmDelete}
        onOpenChange={setConfirmDelete}
        title={m.deleteSetlistConfirm({ name: setlist.name })}
        description={m.deleteSetlistHint()}
        onConfirm={async () => {
          await remove({ setlistId })
          await navigate({ to: '/setlists' })
        }}
      />
    </div>
  )
}

function useMediaQuery(query: string) {
  const [matches, setMatches] = useState(false)
  useEffect(() => {
    const media = window.matchMedia(query)
    const onChange = () => setMatches(media.matches)
    onChange()
    media.addEventListener('change', onChange)
    return () => media.removeEventListener('change', onChange)
  }, [query])
  return matches
}

function SongPicker({
  isOpen,
  onOpenChange,
  setlistId,
  included,
}: {
  isOpen: boolean
  onOpenChange: (open: boolean) => void
  setlistId: Id<'setlists'>
  included: Set<string>
}) {
  const catalog = useLiveQuery(convexQuery(api.songs.catalog, {}))
  const addVersion = useMutation(api.setlists.addVersion)
  const notation = useNotation()
  const [query, setQuery] = useState('')
  const rows = catalog.data.flatMap((row) => {
    const versions = row.versions.filter((version) =>
      matchesSearch(query, [
        row.song.title,
        row.song.subTitle,
        version.name,
        version.artist,
      ]),
    )
    return versions.length === 0 ? [] : [{ ...row, versions }]
  })

  return (
    <Dialog
      isOpen={isOpen}
      onOpenChange={(open) => {
        onOpenChange(open)
        if (!open) setQuery('')
      }}
      className="sm:max-w-lg"
    >
      <DialogHeader>
        <DialogTitle>{m.addSong()}</DialogTitle>
        <DialogDescription>{m.songPickerHint()}</DialogDescription>
      </DialogHeader>
      <SearchField
        autoFocus
        label={m.searchSongs()}
        value={query}
        onChange={setQuery}
      />
      <ul className="-mx-2 max-h-[55vh] space-y-1 overflow-y-auto px-2">
        {rows.length === 0 ? (
          <li className="py-8 text-center text-sm text-muted-foreground">
            {m.noMatches()}
          </li>
        ) : null}
        {rows.map((row) =>
          row.versions.map((version) => {
            const added = included.has(version._id)
            return (
              <li key={version._id}>
                <button
                  type="button"
                  onClick={() =>
                    void addVersion({ setlistId, versionId: version._id })
                      .then(() =>
                        toast.success(
                          m.addedToSetlist({ title: row.song.title }),
                        ),
                      )
                      .catch((error: unknown) => toast.error(messageFor(error)))
                  }
                  className="flex w-full items-center gap-3 rounded-xl px-2 py-2 text-left transition-colors outline-none hover:bg-muted/60 focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <Monogram text={row.song.title} className="size-9 text-xs" />
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center gap-2 font-medium">
                      <span className="truncate">{row.song.title}</span>
                      <ContextMark {...version} />
                    </span>
                    <VersionCaption
                      name={version.name}
                      artist={version.artist}
                      className="truncate text-xs font-normal"
                    />
                  </span>
                  <span className="font-mono text-sm font-semibold text-chord">
                    {displayChord(version.concertKey, 0, 0, notation)}
                  </span>
                  {added ? (
                    <CheckIcon
                      className="size-4 text-success"
                      aria-label={m.inSetlist()}
                    />
                  ) : (
                    <PlusIcon className="size-4 text-muted-foreground" />
                  )}
                </button>
              </li>
            )
          }),
        )}
      </ul>
    </Dialog>
  )
}
