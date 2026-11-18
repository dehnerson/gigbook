import { useOrganization } from '@clerk/tanstack-react-start'
import { useNavigate } from '@tanstack/react-router'
import { useAction, useQuery } from 'convex/react'
import { EllipsisIcon, UserPlusIcon, UsersIcon, XIcon } from 'lucide-react'
import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { api } from '../../convex/_generated/api'
import { Chip, initials } from '@/components/app/chip'
import { ConfirmDialog } from '@/components/app/confirm-dialog'
import { EmptyState } from '@/components/app/empty-state'
import { PageHeader } from '@/components/app/page-header'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { messageFor } from '@/lib/errors'
import { roleFromClerk, roleName } from '@/lib/roles'
import { useHome } from '@/lib/home'
import { PERSONAL, path, workspaceTrail } from '@/lib/space'
import { m } from '@/paraglide/messages'

type PendingInvite = {
  id: string
  emailAddress: string
  role: string
  revoke: () => Promise<unknown>
}

export function MembersPage() {
  const home = useHome()
  const navigate = useNavigate()
  const band = useQuery(
    api.bands.get,
    home?.bandId ? { bandId: home.bandId } : 'skip',
  )
  const { organization } = useOrganization()
  const invite = useAction(api.bands.invite)
  const removeMember = useAction(api.bands.removeMember)
  const leave = useAction(api.bands.leave)
  const removeBand = useAction(api.bands.remove)
  const [pending, setPending] = useState<Array<PendingInvite>>([])
  const [email, setEmail] = useState('')
  const [inviteRole, setInviteRole] = useState<'editor' | 'viewer'>('viewer')
  const [busy, setBusy] = useState(false)
  const [confirmLeave, setConfirmLeave] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)

  useEffect(() => {
    if (!organization) return
    let current = true
    void organization
      .getInvitations({ status: ['pending'] })
      .then((result) => {
        if (!current) return
        setPending(
          result.data.map((item) => ({
            id: item.id,
            emailAddress: item.emailAddress,
            role: item.role,
            revoke: () => item.revoke(),
          })),
        )
      })
      .catch(() => {
        if (current) setPending([])
      })
    return () => {
      current = false
    }
  }, [organization, band?.members.length])

  if (!home?.organizationId) {
    return (
      <EmptyState
        icon={UsersIcon}
        title={m.members()}
        description={m.membersPersonal()}
      />
    )
  }
  if (!band) return null

  const refreshInvites = () => {
    if (!organization) return
    void organization.getInvitations({ status: ['pending'] }).then((result) => {
      setPending(
        result.data.map((item) => ({
          id: item.id,
          emailAddress: item.emailAddress,
          role: item.role,
          revoke: () => item.revoke(),
        })),
      )
    })
  }

  return (
    <div>
      <PageHeader
        title={m.members()}
        subtitle={band.band.name}
        actions={
          <>
            <Button variant="outline" onPress={() => setConfirmLeave(true)}>
              {m.leaveBand()}
            </Button>
            {band.role === 'owner' ? (
              <Button
                variant="destructive"
                onPress={() => setConfirmDelete(true)}
              >
                {m.deleteBand()}
              </Button>
            ) : null}
          </>
        }
      />
      <ul className="max-w-xl space-y-1">
        {band.members.map((member) => (
          <li
            key={member._id}
            className="flex items-center gap-3 rounded-xl py-1.5"
          >
            <Avatar>
              <AvatarFallback className="bg-primary/15 text-xs font-semibold text-primary">
                {initials(member.name)}
              </AvatarFallback>
            </Avatar>
            <span className="min-w-0 flex-1 truncate text-sm font-medium">
              {member.name}
              {member.userId === band.me ? (
                <span className="text-muted-foreground"> · {m.you()}</span>
              ) : null}
            </span>
            <Chip tone={member.role === 'owner' ? 'primary' : 'default'}>
              {roleName(member.role)}
            </Chip>
            {band.role === 'owner' && member.role !== 'owner' ? (
              <DropdownMenuTrigger>
                <Button variant="ghost" size="icon-sm" aria-label={m.more()}>
                  <EllipsisIcon />
                </Button>
                <DropdownMenu placement="bottom end" className="w-56">
                  <DropdownMenuItem
                    variant="destructive"
                    textValue={m.removeMember({ name: member.name })}
                    onAction={() =>
                      void removeMember({ membershipId: member._id }).catch(
                        (error: unknown) => toast.error(messageFor(error)),
                      )
                    }
                  >
                    <XIcon />
                    {m.removeMember({ name: member.name })}
                  </DropdownMenuItem>
                </DropdownMenu>
              </DropdownMenuTrigger>
            ) : null}
          </li>
        ))}
        {pending.map((item) => (
          <li
            key={item.id}
            className="flex items-center gap-3 rounded-xl py-1.5"
          >
            <Avatar>
              <AvatarFallback className="text-xs font-semibold">
                {initials(item.emailAddress)}
              </AvatarFallback>
            </Avatar>
            <span className="min-w-0 flex-1 truncate text-sm font-medium">
              {item.emailAddress}
            </span>
            <Chip>{m.pendingInvite()}</Chip>
            <Chip>{roleName(roleFromClerk(item.role))}</Chip>
            {band.role === 'owner' ? (
              <Button
                variant="ghost"
                size="icon-sm"
                aria-label={m.revokeInvite()}
                onPress={() =>
                  void item
                    .revoke()
                    .then(refreshInvites)
                    .catch((error: unknown) => toast.error(messageFor(error)))
                }
              >
                <XIcon />
              </Button>
            ) : null}
          </li>
        ))}
      </ul>
      {band.members.length <= 1 && pending.length === 0 ? (
        <p className="mt-3 text-sm text-muted-foreground">{m.membersEmpty()}</p>
      ) : null}
      {band.role === 'owner' ? (
        <form
          className="mt-6 grid max-w-xl gap-3 border-t pt-4"
          onSubmit={(event) => {
            event.preventDefault()
            if (!email.trim() || !home.bandId) return
            setBusy(true)
            invite({
              bandId: home.bandId,
              email,
              role: inviteRole,
              redirectUrl: `${window.location.origin}/`,
            })
              .then(() => {
                setEmail('')
                toast.success(m.memberInvited())
                refreshInvites()
              })
              .catch((error: unknown) => toast.error(messageFor(error)))
              .finally(() => setBusy(false))
          }}
        >
          <div className="text-sm font-medium">{m.addMember()}</div>
          <Input
            type="email"
            required
            aria-label={m.email()}
            value={email}
            placeholder={m.emailPlaceholder()}
            onChange={(event) => setEmail(event.target.value)}
          />
          <div className="flex min-w-0 flex-wrap gap-2">
            <Select
              aria-label={m.role()}
              value={inviteRole}
              onChange={(value) => setInviteRole(value as 'editor' | 'viewer')}
              className="min-w-0 flex-1 basis-36"
              options={[
                {
                  id: 'editor',
                  label: m.editorRole(),
                  description: m.editorRoleHint(),
                },
                {
                  id: 'viewer',
                  label: m.viewer(),
                  description: m.viewerRoleHint(),
                },
              ]}
            />
            <Button
              type="submit"
              isDisabled={busy || !email.trim()}
              className="shrink-0"
            >
              <UserPlusIcon />
              {m.invite()}
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">{m.inviteHint()}</p>
        </form>
      ) : null}
      <ConfirmDialog
        isOpen={confirmLeave}
        onOpenChange={setConfirmLeave}
        title={m.leaveBandConfirm({ name: band.band.name })}
        description={m.leaveBandHint()}
        confirmLabel={m.leaveBand()}
        onConfirm={async () => {
          if (!home.bandId) return
          await leave({ bandId: home.bandId })
          await navigate({
            href: path(workspaceTrail(PERSONAL), { page: 'songs' }),
          })
        }}
      />
      <ConfirmDialog
        isOpen={confirmDelete}
        onOpenChange={setConfirmDelete}
        title={m.deleteBandConfirm({ name: band.band.name })}
        description={m.deleteBandHint()}
        confirmLabel={m.deleteBand()}
        onConfirm={async () => {
          if (!home.bandId) return
          await removeBand({ bandId: home.bandId })
          await navigate({
            href: path(workspaceTrail(PERSONAL), { page: 'songs' }),
          })
        }}
      />
    </div>
  )
}
