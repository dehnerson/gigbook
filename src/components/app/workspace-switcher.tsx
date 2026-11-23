import { useMutation } from 'convex/react'
import { useNavigate, useRouterState } from '@tanstack/react-router'
import { ChevronsUpDownIcon, PlusIcon, UsersIcon } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'
import { api } from '../../../convex/_generated/api'
import { ContextMark } from '@/components/app/context-mark'
import { Field } from '@/components/app/field'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Popover, PopoverTrigger } from '@/components/ui/popover'
import { messageFor } from '@/lib/errors'
import { href, PERSONAL, switchHref } from '@/lib/space'
import { useWorkspace } from '@/lib/workspace'
import { cn } from 'cn'
import { m } from '@/paraglide/messages'
import { Separator } from '../ui/separator'

const item =
  'flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-sm font-medium text-muted-foreground outline-none hover:bg-sidebar-accent hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring data-[active=true]:bg-sidebar-accent data-[active=true]:text-foreground'

export function WorkspaceSwitcher({ compact = false }: { compact?: boolean }) {
  const { current, all } = useWorkspace()
  const [open, setOpen] = useState(false)
  const [creating, setCreating] = useState(false)
  const navigate = useNavigate()
  const leaf = useRouterState({
    select: (state) => state.matches[state.matches.length - 1],
  })
  const shown = current.key
  const label = current.label ?? (current.bandId ? '' : m.personal())
  const openWorkspace = (next: string) => {
    setOpen(false)
    const params = leaf.params as { songId?: string }
    void navigate(switchHref(leaf.routeId, { songId: params.songId }, next))
  }

  return (
    <>
      <PopoverTrigger isOpen={open} onOpenChange={setOpen}>
        <Button
          variant="ghost"
          size={compact ? 'icon' : 'default'}
          aria-label={label || m.personal()}
          className={cn(!compact && 'h-auto w-full justify-start px-3 py-2')}
        >
          <ContextMark
            bandId={current.bandId}
            name={current.bandId ? current.label : null}
          />
          {compact ? null : (
            <>
              <span className="min-w-0 flex-1 truncate text-left">{label}</span>
              <ChevronsUpDownIcon className="size-4 text-muted-foreground" />
            </>
          )}
        </Button>
        <Popover placement="bottom start" className="w-64">
          <div className="px-2 py-1 text-xs font-medium text-muted-foreground">
            {m.workspace()}
          </div>
          <ul className="max-h-64 space-y-0.5 overflow-y-auto">
            {all.map((itemWorkspace) => (
              <li key={itemWorkspace.key}>
                <button
                  type="button"
                  data-active={shown === itemWorkspace.key}
                  className={item}
                  onClick={() => openWorkspace(itemWorkspace.key)}
                >
                  <ContextMark
                    bandId={itemWorkspace.bandId}
                    name={itemWorkspace.bandId ? itemWorkspace.label : null}
                  />
                  <span className="truncate">
                    {itemWorkspace.label ?? m.personal()}
                  </span>
                </button>
              </li>
            ))}
          </ul>
          <div className="space-y-1">
            <Separator />
            {shown !== PERSONAL ? (
              <>
                <button
                  type="button"
                  className={item}
                  onClick={() => {
                    setOpen(false)
                    void navigate(href(shown, { page: 'members' }))
                  }}
                >
                  <UsersIcon className="size-4" />
                  {m.members()}
                </button>
                <Separator />
              </>
            ) : null}
            <button
              type="button"
              className={item}
              onClick={() => {
                setOpen(false)
                setCreating(true)
              }}
            >
              <PlusIcon className="size-4" />
              {m.createBand()}
            </button>
          </div>
        </Popover>
      </PopoverTrigger>
      <NewBandDialog
        isOpen={creating}
        onOpenChange={setCreating}
        onCreated={(bandId) => navigate(href(bandId, { page: 'songs' }))}
      />
    </>
  )
}

function NewBandDialog({
  isOpen,
  onOpenChange,
  onCreated,
}: {
  isOpen: boolean
  onOpenChange: (open: boolean) => void
  onCreated: (bandId: string) => Promise<void>
}) {
  const create = useMutation(api.bands.create)
  const [name, setName] = useState('')
  const [busy, setBusy] = useState(false)
  return (
    <Dialog isOpen={isOpen} onOpenChange={onOpenChange}>
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
            .then((band) => onCreated(band.bandId))
            .then(() => {
              setName('')
              onOpenChange(false)
            })
            .catch((error: unknown) => toast.error(messageFor(error)))
            .finally(() => setBusy(false))
        }}
      >
        <Field label={m.bandName()}>
          <Input
            required
            value={name}
            placeholder={m.bandName()}
            onChange={(event) => setName(event.target.value)}
          />
        </Field>
        <DialogFooter>
          <Button type="submit" isDisabled={busy || !name.trim()}>
            {m.create()}
          </Button>
        </DialogFooter>
      </form>
    </Dialog>
  )
}
