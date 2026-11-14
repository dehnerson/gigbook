import { convexQuery } from '@convex-dev/react-query'
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useMutation } from 'convex/react'
import { MusicIcon, PlusIcon, UsersIcon } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'
import { api } from '../../../../convex/_generated/api'
import { Chip, Monogram } from '@/components/app/chip'
import { CollectionCard } from '@/components/app/collection-card'
import { EmptyState } from '@/components/app/empty-state'
import { Field } from '@/components/app/field'
import { HeaderButton, PageHeader } from '@/components/app/page-header'
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
import { useLiveQuery } from '@/lib/live'
import { m } from '@/paraglide/messages'
import { roleName } from './-roles'

export const Route = createFileRoute('/_authed/bands/')({
  loader: ({ context }) => context.load(convexQuery(api.bands.list, {})),
  component: BandsPage,
})

function BandsPage() {
  const bands = useLiveQuery(convexQuery(api.bands.list, {}))
  const [open, setOpen] = useState(false)

  return (
    <div>
      <PageHeader
        title={m.bands()}
        subtitle={m.bandsHint()}
        actions={
          bands.data.length > 0 ? (
            <HeaderButton onPress={() => setOpen(true)}>
              <PlusIcon />
              {m.band()}
            </HeaderButton>
          ) : null
        }
      />
      <NewBandDialog isOpen={open} onOpenChange={setOpen} />
      {bands.data.length === 0 ? (
        <EmptyState
          icon={UsersIcon}
          title={m.noBands()}
          description={m.noBandsHint()}
          action={
            <HeaderButton onPress={() => setOpen(true)}>
              <PlusIcon />
              {m.band()}
            </HeaderButton>
          }
        />
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {bands.data.map((row) => (
            <CollectionCard
              key={row.band._id}
              to="/bands/$bandId"
              params={{ bandId: row.band._id }}
              title={row.band.name}
              leading={
                <Monogram text={row.band.name} className="size-12 text-base" />
              }
              trailing={
                <Chip
                  tone={row.membership.role === 'owner' ? 'primary' : 'default'}
                >
                  {roleName(row.membership.role)}
                </Chip>
              }
            >
              <div className="flex gap-4">
                <span className="inline-flex items-center gap-1.5">
                  <UsersIcon className="size-4" />
                  {m.memberCount({ count: String(row.memberCount) })}
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <MusicIcon className="size-4" />
                  {m.songCount({ count: String(row.songCount) })}
                </span>
              </div>
            </CollectionCard>
          ))}
        </ul>
      )}
    </div>
  )
}

function NewBandDialog({
  isOpen,
  onOpenChange,
}: {
  isOpen: boolean
  onOpenChange: (open: boolean) => void
}) {
  const create = useMutation(api.bands.create)
  const navigate = useNavigate()
  const [name, setName] = useState('')
  const [busy, setBusy] = useState(false)

  return (
    <Dialog isOpen={isOpen} onOpenChange={onOpenChange} className="sm:max-w-md">
      <DialogHeader>
        <DialogTitle>{m.createBand()}</DialogTitle>
        <DialogDescription>{m.newBandHint()}</DialogDescription>
      </DialogHeader>
      <form
        className="grid gap-4"
        onSubmit={(event) => {
          event.preventDefault()
          if (!name.trim()) return
          setBusy(true)
          create({ name })
            .then((bandId) => {
              onOpenChange(false)
              setName('')
              return navigate({ to: '/bands/$bandId', params: { bandId } })
            })
            .catch((error: unknown) => toast.error(messageFor(error)))
            .finally(() => setBusy(false))
        }}
      >
        <Field label={m.bandName()}>
          <Input
            autoFocus
            required
            value={name}
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
