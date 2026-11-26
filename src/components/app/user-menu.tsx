import { useAuthActions } from '@convex-dev/auth/react'
import { convexQuery } from '@convex-dev/react-query'
import { useQuery } from '@tanstack/react-query'
import { Link, useNavigate } from '@tanstack/react-router'
import { LogOutIcon, SettingsIcon, UserRoundIcon } from 'lucide-react'
import { useState } from 'react'
import { api } from '../../../convex/_generated/api'
import { UserAvatar } from '@/components/app/user-avatar'
import { Button } from '@/components/ui/button'
import { Popover, PopoverTrigger } from '@/components/ui/popover'
import { Separator } from '@/components/ui/separator'
import { Skeleton } from '@/components/ui/skeleton'
import { m } from '@/paraglide/messages'

const item =
  'flex w-full items-center gap-2 rounded-lg px-2 py-2 text-left text-sm font-medium text-foreground outline-none hover:bg-muted'

export function UserMenu({
  compact = false,
  placement = 'top start',
}: {
  compact?: boolean
  placement?: 'top start' | 'bottom end'
}) {
  const { data: me } = useQuery(convexQuery(api.users.me, {}))
  const { signOut } = useAuthActions()
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)

  if (!me)
    return (
      <Skeleton
        className={compact ? 'size-9 rounded-full' : 'h-12 w-full rounded-lg'}
      />
    )
  const name = me.name.trim() || me.email || m.manageAccount()
  return (
    <PopoverTrigger isOpen={open} onOpenChange={setOpen}>
      <Button
        variant="ghost"
        size={compact ? 'icon' : 'default'}
        aria-label={m.manageAccount()}
        className={
          compact ? undefined : 'h-auto w-full justify-start gap-3 px-2 py-2'
        }
      >
        <UserAvatar name={me.name} email={me.email} imageUrl={me.imageUrl} />
        {compact ? null : (
          <span className="min-w-0 text-left">
            <span className="block truncate text-sm font-medium">{name}</span>
            {me.email ? (
              <span className="block truncate text-xs font-normal text-muted-foreground">
                {me.email}
              </span>
            ) : null}
          </span>
        )}
      </Button>
      <Popover placement={placement} className="w-64 p-1.5">
        <div className="flex items-center gap-3 px-2 py-2">
          <UserAvatar
            name={me.name}
            email={me.email}
            imageUrl={me.imageUrl}
            size="lg"
          />
          <div className="min-w-0">
            <div className="truncate font-medium">{name}</div>
            {me.email ? (
              <div className="truncate text-xs text-muted-foreground">
                {me.email}
              </div>
            ) : null}
          </div>
        </div>
        <Separator />
        <Link to="/account" className={item} onClick={() => setOpen(false)}>
          <UserRoundIcon className="size-4 text-muted-foreground" />
          {m.manageAccount()}
        </Link>
        <Link to="/settings" className={item} onClick={() => setOpen(false)}>
          <SettingsIcon className="size-4 text-muted-foreground" />
          {m.settings()}
        </Link>
        <button
          type="button"
          className={item}
          onClick={() => {
            setOpen(false)
            void signOut().then(() => navigate({ href: '/sign-in' }))
          }}
        >
          <LogOutIcon className="size-4 text-muted-foreground" />
          {m.signOut()}
        </button>
      </Popover>
    </PopoverTrigger>
  )
}
