import { convexQuery } from '@convex-dev/react-query'
import { useSuspenseQuery } from '@tanstack/react-query'
import { useMutation } from 'convex/react'
import { ListMusicIcon, PlusIcon } from 'lucide-react'
import { Suspense, useState } from 'react'
import { toast } from 'sonner'
import { api } from '../../convex/_generated/api'
import type { Id } from '../../convex/_generated/dataModel'
import { CollectionCard } from '@/components/app/collection-card'
import { HomeCaption } from '@/components/app/context-mark'
import { EmptyState } from '@/components/app/empty-state'
import { Field } from '@/components/app/field'
import { HeaderButton, PageHeader } from '@/components/app/page-header'
import { ListSkeleton } from '@/components/app/route-states'
import { NoMatches, SearchField } from '@/components/app/search-field'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { messageFor } from '@/lib/errors'
import { matchesSearch } from '@/lib/search'
import { path } from '@/lib/space'
import type { Dest, Trail } from '@/lib/space'
import type { Home } from '@/lib/workspace'
import { useNavigate } from '@tanstack/react-router'
import { m } from '@/paraglide/messages'

export function SetlistsPage({ home, trail }: { home: Home; trail: Trail }) {
  const [open, setOpen] = useState(false)
  const canCreate = home.role === 'owner' || home.role === 'editor'

  return (
    <div>
      <PageHeader
        title={m.setlists()}
        subtitle={<HomeCaption home={home} />}
        actions={
          canCreate ? (
            <HeaderButton onPress={() => setOpen(true)}>
              <PlusIcon />
              {m.setlist()}
            </HeaderButton>
          ) : null
        }
      />
      <NewSetlistDialog
        isOpen={open}
        onOpenChange={setOpen}
        bandId={home.bandId}
        trail={trail}
      />
      <Suspense fallback={<ListSkeleton />}>
        <SetlistList home={home} trail={trail} />
      </Suspense>
    </div>
  )
}

function SetlistList({ home, trail }: { home: Home; trail: Trail }) {
  const href = (dest: Dest) => path(trail, dest)
  const { data: rows } = useSuspenseQuery(
    convexQuery(api.setlists.list, { bandId: home.bandId }),
  )
  const [query, setQuery] = useState('')
  const visible = rows.filter((setlist) =>
    matchesSearch(query, [setlist.name, ...setlist.titles]),
  )

  if (rows.length === 0)
    return (
      <EmptyState
        icon={ListMusicIcon}
        title={m.noSetlists()}
        description={m.noSetlistsHint()}
      />
    )
  return (
    <div className="space-y-4">
      <SearchField
        label={m.searchSetlists()}
        value={query}
        onChange={setQuery}
      />
      {visible.length === 0 ? (
        <NoMatches query={query} onClear={() => setQuery('')} />
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {visible.map((setlist) => (
            <CollectionCard
              key={setlist._id}
              href={href({ page: 'setlist', setlistId: setlist._id })}
              title={setlist.name}
              leading={
                <div className="grid size-11 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary ring-1 ring-primary/20">
                  <ListMusicIcon className="size-5" />
                </div>
              }
              footer={
                setlist.preview.length > 0 ? (
                  <p className="truncate text-sm text-foreground/70">
                    {setlist.preview.join(' · ')}
                    {setlist.count > setlist.preview.length ? ' …' : ''}
                  </p>
                ) : null
              }
            >
              {m.songCount({ count: String(setlist.count) })}
            </CollectionCard>
          ))}
        </ul>
      )}
    </div>
  )
}

function NewSetlistDialog({
  isOpen,
  onOpenChange,
  bandId,
  trail,
}: {
  isOpen: boolean
  onOpenChange: (open: boolean) => void
  bandId: Id<'bands'> | null
  trail: Trail
}) {
  const create = useMutation(api.setlists.create)
  const navigate = useNavigate()
  const [name, setName] = useState('')
  const [busy, setBusy] = useState(false)

  return (
    <Dialog isOpen={isOpen} onOpenChange={onOpenChange} className="sm:max-w-md">
      <DialogHeader>
        <DialogTitle>{m.createSetlist()}</DialogTitle>
        <DialogDescription>{m.newSetlistHint()}</DialogDescription>
      </DialogHeader>
      <form
        className="grid gap-4"
        onSubmit={(event) => {
          event.preventDefault()
          if (!name.trim()) return
          setBusy(true)
          create({ name, bandId: bandId ?? undefined })
            .then((setlistId) => {
              onOpenChange(false)
              setName('')
              return navigate({
                href: path(trail, { page: 'setlist', setlistId }),
              })
            })
            .catch((error: unknown) => toast.error(messageFor(error)))
            .finally(() => setBusy(false))
        }}
      >
        <Field label={m.setlistName()}>
          <Input
            autoFocus
            required
            value={name}
            placeholder={m.setlistNamePlaceholder()}
            onChange={(event) => setName(event.target.value)}
          />
        </Field>
        <DialogFooter>
          <Button variant="outline" onPress={() => onOpenChange(false)}>
            {m.cancel()}
          </Button>
          <Button type="submit" isDisabled={busy || !name.trim()}>
            {m.create()}
          </Button>
        </DialogFooter>
      </form>
    </Dialog>
  )
}
