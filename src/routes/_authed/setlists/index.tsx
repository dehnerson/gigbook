import { useQuery, useMutation } from 'convex/react'
import { createFileRoute, useNavigate } from '@tanstack/react-router'
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
import { useWorkspace } from '@/lib/workspace'
import { m } from '@/paraglide/messages'

export const Route = createFileRoute('/_authed/setlists/')({
  component: SetlistsPage,
})

function SetlistsPage() {
  const workspace = useWorkspace()
  const setlists = useQuery(
    api.setlists.list,
    workspace.ready ? { bandId: workspace.bandId } : 'skip',
  )
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const rows = setlists ?? []
  const visible = rows.filter((setlist) =>
    matchesSearch(query, [setlist.name, ...setlist.titles]),
  )

  return (
    <div>
      <PageHeader
        title={m.setlists()}
        subtitle={
          <span className="inline-flex items-center gap-2">
            <ContextMark
              bandId={workspace.organizationId ? workspace.bandId : null}
              name={workspace.organizationId ? workspace.label : null}
            />
            {workspace.label}
          </span>
        }
        actions={
          rows.length > 0 ? (
            <HeaderButton
              isDisabled={!workspace.ready || workspace.role === 'viewer'}
              onPress={() => setOpen(true)}
            >
              <PlusIcon />
              {m.setlist()}
            </HeaderButton>
          ) : null
        }
      />
      <NewSetlistDialog
        isOpen={open}
        onOpenChange={setOpen}
        bandId={workspace.bandId}
      />
      {setlists === undefined ? null : rows.length === 0 ? (
        <EmptyState
          icon={ListMusicIcon}
          title={m.noSetlists()}
          description={m.noSetlistsHint()}
          action={
            workspace.role === 'viewer' ? undefined : (
              <HeaderButton onPress={() => setOpen(true)}>
                <PlusIcon />
                {m.setlist()}
              </HeaderButton>
            )
          }
        />
      ) : (
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
                  to="/setlists/$setlistId"
                  params={{ setlistId: setlist._id }}
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
      )}
    </div>
  )
}

function NewSetlistDialog({
  isOpen,
  onOpenChange,
  bandId,
}: {
  isOpen: boolean
  onOpenChange: (open: boolean) => void
  bandId: Id<'bands'> | null
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
