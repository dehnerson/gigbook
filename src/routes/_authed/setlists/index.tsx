import { convexQuery } from '@convex-dev/react-query'
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useMutation } from 'convex/react'
import { ListMusicIcon, PlusIcon } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'
import { api } from '../../../../convex/_generated/api'
import type { Id } from '../../../../convex/_generated/dataModel'
import { CollectionCard } from '@/components/app/collection-card'
import { ContextMark } from '@/components/app/context-mark'
import { EmptyState } from '@/components/app/empty-state'
import { Field } from '@/components/app/field'
import { HeaderButton, PageHeader } from '@/components/app/page-header'
import {
  NoMatches,
  ownershipSegments,
  SearchField,
} from '@/components/app/search-field'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { messageFor } from '@/lib/errors'
import { useLiveQuery } from '@/lib/live'
import { matchesScope, matchesSearch } from '@/lib/search'
import type { Scope } from '@/lib/search'
import { m } from '@/paraglide/messages'

export const Route = createFileRoute('/_authed/setlists/')({
  loader: ({ context }) =>
    Promise.all([
      context.load(convexQuery(api.setlists.list, {})),
      context.load(convexQuery(api.bands.list, {})),
    ]),
  component: SetlistsPage,
})

function SetlistsPage() {
  const setlists = useLiveQuery(convexQuery(api.setlists.list, {}))
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [scope, setScope] = useState<Scope>('all')
  const rows = setlists.data
  const hasBandSetlists = rows.some((setlist) => setlist.bandId)
  const visible = rows.filter(
    (setlist) =>
      matchesScope(scope, {
        personal: !setlist.bandId,
        band: Boolean(setlist.bandId),
      }) &&
      matchesSearch(query, [setlist.name, setlist.bandName, ...setlist.titles]),
  )

  return (
    <div>
      <PageHeader
        title={m.setlists()}
        subtitle={m.setlistsHint()}
        actions={
          <HeaderButton onPress={() => setOpen(true)}>
            <PlusIcon />
            {m.createSetlist()}
          </HeaderButton>
        }
      />
      <NewSetlistDialog isOpen={open} onOpenChange={setOpen} />
      {rows.length === 0 ? (
        <EmptyState
          icon={ListMusicIcon}
          title={m.noSetlists()}
          description={m.noSetlistsHint()}
          action={
            <HeaderButton onPress={() => setOpen(true)}>
              <PlusIcon />
              {m.createSetlist()}
            </HeaderButton>
          }
        />
      ) : (
        <div className="space-y-4">
          <SearchField
            label={m.searchSetlists()}
            value={query}
            onChange={setQuery}
            segments={
              hasBandSetlists
                ? {
                    label: m.filterSetlists(),
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
            <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {visible.map((setlist) => (
                <CollectionCard
                  key={setlist._id}
                  to="/setlists/$setlistId"
                  params={{ setlistId: setlist._id }}
                  title={setlist.name}
                  leading={
                    <div className="grid size-11 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary ring-1 ring-primary/20">
                      <ListMusicIcon className="size-5" />
                    </div>
                  }
                  trailing={
                    <ContextMark
                      bandId={setlist.bandId}
                      name={setlist.bandName}
                    />
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
      )}
    </div>
  )
}

function NewSetlistDialog({
  isOpen,
  onOpenChange,
}: {
  isOpen: boolean
  onOpenChange: (open: boolean) => void
}) {
  const bands = useLiveQuery(convexQuery(api.bands.list, {}))
  const create = useMutation(api.setlists.create)
  const navigate = useNavigate()
  const [name, setName] = useState('')
  const [owner, setOwner] = useState('personal')
  const [busy, setBusy] = useState(false)
  const editable = bands.data.filter((row) => row.membership.role !== 'viewer')

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
          create({
            name,
            bandId: owner === 'personal' ? undefined : (owner as Id<'bands'>),
          })
            .then((setlistId) => {
              onOpenChange(false)
              setName('')
              return navigate({
                to: '/setlists/$setlistId',
                params: { setlistId },
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
        {editable.length > 0 ? (
          <Select
            label={m.belongsTo()}
            value={owner}
            onChange={setOwner}
            options={[
              { id: 'personal', label: m.personal() },
              ...editable.map((row) => ({
                id: row.band._id,
                label: row.band.name,
              })),
            ]}
          />
        ) : null}
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
