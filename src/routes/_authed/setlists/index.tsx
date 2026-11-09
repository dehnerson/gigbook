import { convexQuery } from '@convex-dev/react-query'
import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import { useMutation } from 'convex/react'
import { ListMusicIcon, PlusIcon, UsersIcon } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'
import { api } from '../../../../convex/_generated/api'
import type { Id } from '../../../../convex/_generated/dataModel'
import { Chip } from '@/components/app/chip'
import { EmptyState } from '@/components/app/empty-state'
import { Field } from '@/components/app/field'
import { PageHeader } from '@/components/app/page-header'
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

  return (
    <div>
      <PageHeader
        title={m.setlists()}
        subtitle={m.setlistsHint()}
        actions={
          <Button onPress={() => setOpen(true)}>
            <PlusIcon />
            {m.createSetlist()}
          </Button>
        }
      />
      <NewSetlistDialog isOpen={open} onOpenChange={setOpen} />
      {setlists.data.length === 0 ? (
        <EmptyState
          icon={ListMusicIcon}
          title={m.noSetlists()}
          description={m.noSetlistsHint()}
          action={
            <Button onPress={() => setOpen(true)}>
              <PlusIcon />
              {m.createSetlist()}
            </Button>
          }
        />
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {setlists.data.map((setlist) => (
            <li
              key={setlist._id}
              className="group relative flex flex-col gap-3 rounded-2xl border bg-card p-5 transition-colors hover:border-foreground/15"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="grid size-11 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary ring-1 ring-primary/20">
                  <ListMusicIcon className="size-5" />
                </div>
                {setlist.bandName ? (
                  <Chip tone="primary" className="max-w-40">
                    <UsersIcon className="size-3 shrink-0" />
                    <span className="truncate">{setlist.bandName}</span>
                  </Chip>
                ) : null}
              </div>
              <div className="min-w-0">
                <Link
                  to="/setlists/$setlistId"
                  params={{ setlistId: setlist._id }}
                  className="block truncate text-lg font-semibold outline-none after:absolute after:inset-0 after:rounded-2xl focus-visible:after:ring-2 focus-visible:after:ring-ring"
                >
                  {setlist.name}
                </Link>
                <p className="text-sm text-muted-foreground">
                  {m.songCount({ count: String(setlist.count) })}
                </p>
              </div>
              {setlist.preview.length > 0 ? (
                <p className="mt-auto truncate text-sm text-foreground/70">
                  {setlist.preview.join(' · ')}
                  {setlist.count > setlist.preview.length ? ' …' : ''}
                </p>
              ) : null}
            </li>
          ))}
        </ul>
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
