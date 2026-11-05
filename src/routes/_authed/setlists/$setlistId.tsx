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
  SearchIcon,
  Trash2Icon,
  UsersIcon,
  XIcon,
} from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'
import { api } from '../../../../convex/_generated/api'
import type { Id } from '../../../../convex/_generated/dataModel'
import { Chip, Monogram } from '@/components/app/chip'
import { ConfirmDialog } from '@/components/app/confirm-dialog'
import { EmptyState } from '@/components/app/empty-state'
import { InlineEdit } from '@/components/app/inline-edit'
import { Crumb, PageHeader } from '@/components/app/page-header'
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
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Input } from '@/components/ui/input'
import { useNotation } from '@/components/use-notation'
import { messageFor } from '@/lib/errors'
import { useLiveQuery } from '@/lib/live'
import { loadQuery } from '@/lib/load'
import { displayChord } from '@/lib/music/chords'
import { m } from '@/paraglide/messages'

export const Route = createFileRoute('/_authed/setlists/$setlistId')({
  loader: async ({ context, params }) => {
    await Promise.all([
      loadQuery(
        context.queryClient,
        convexQuery(api.setlists.get, {
          setlistId: params.setlistId as Id<'setlists'>,
        }),
      ),
      loadQuery(context.queryClient, convexQuery(api.songs.catalog, {})),
    ])
  },
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
          <InlineEdit
            label={m.renameSetlist()}
            value={setlist.name}
            isDisabled={!canEdit}
            onSave={(name) => rename({ setlistId, name }).catch(fail)}
          />
        }
        subtitle={
          <div className="flex flex-wrap items-center gap-2">
            <span>{m.songCount({ count: String(entries.length) })}</span>
            {bandName ? (
              <Chip tone="primary">
                <UsersIcon className="size-3" />
                {bandName}
              </Chip>
            ) : null}
          </div>
        }
        actions={
          <>
            {first ? (
              <ButtonLink
                size="lg"
                to="/versions/$versionId/play"
                params={{ versionId: first.version._id }}
                search={{ setlist: setlistId, index: 0 }}
              >
                <PlayIcon className="fill-current" />
                {m.playSetlist()}
              </ButtonLink>
            ) : null}
            {canEdit ? (
              <>
                <Button
                  size="lg"
                  variant="outline"
                  onPress={() => setPicker(true)}
                >
                  <PlusIcon />
                  {m.addSong()}
                </Button>
                <DropdownMenuTrigger>
                  <Button
                    size="icon-lg"
                    variant="outline"
                    aria-label={m.more()}
                  >
                    <EllipsisIcon />
                  </Button>
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
              <Button onPress={() => setPicker(true)}>
                <PlusIcon />
                {m.addSong()}
              </Button>
            ) : undefined
          }
        />
      ) : (
        <ol className="space-y-2">
          {sortable.order.map((itemId, index) => {
            const entry = byId.get(itemId as Id<'setlistItems'>)
            if (!entry) return null
            return (
              <li
                key={itemId}
                {...(canEdit ? sortable.itemProps(itemId) : {})}
                className={cn(
                  'group flex items-center gap-3 rounded-2xl border bg-card px-3 py-3 transition-colors hover:border-foreground/15 sm:px-4',
                  sortable.dragging === itemId && 'opacity-50',
                )}
              >
                {canEdit ? (
                  <GripVerticalIcon className="hidden size-4 shrink-0 cursor-grab text-muted-foreground/50 group-hover:text-muted-foreground sm:block" />
                ) : null}
                <span className="w-7 shrink-0 text-right font-mono text-lg font-semibold text-muted-foreground tabular-nums">
                  {index + 1}
                </span>
                <Monogram text={entry.song.title} className="hidden sm:grid" />
                <div className="min-w-0 flex-1">
                  <Link
                    to="/versions/$versionId"
                    params={{ versionId: entry.version._id }}
                    className="block truncate font-medium hover:underline"
                  >
                    {entry.song.title}
                  </Link>
                  <p className="truncate text-sm text-muted-foreground">
                    {entry.song.artist} · {entry.version.name}
                  </p>
                </div>
                <span className="hidden font-mono text-base font-semibold text-chord sm:inline">
                  {displayChord(entry.version.concertKey, 0, 0, notation)}
                </span>
                <div className="flex shrink-0 items-center gap-0.5">
                  {canEdit ? (
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
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label={m.remove()}
                      onPress={() =>
                        void removeItem({ itemId: entry.item._id }).catch(fail)
                      }
                      className="text-muted-foreground hover:text-destructive"
                    >
                      <XIcon />
                    </Button>
                  ) : null}
                </div>
              </li>
            )
          })}
        </ol>
      )}

      {canEdit ? (
        <SongPicker
          isOpen={picker}
          onOpenChange={setPicker}
          setlistId={setlistId}
          included={new Set(entries.map((entry) => entry.version._id))}
        />
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
  const needle = query.trim().toLowerCase()
  const rows = catalog.data.filter(
    (row) =>
      !needle ||
      `${row.song.title} ${row.song.artist}`.toLowerCase().includes(needle),
  )

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
      <div className="relative">
        <SearchIcon className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          autoFocus
          type="search"
          aria-label={m.searchSongs()}
          placeholder={m.searchSongs()}
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          className="h-10 pl-9"
        />
      </div>
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
                    <span className="block truncate font-medium">
                      {row.song.title}
                    </span>
                    <span className="block truncate text-xs text-muted-foreground">
                      {row.song.artist}
                      {row.versions.length > 1 ? ` · ${version.name}` : ''}
                    </span>
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
