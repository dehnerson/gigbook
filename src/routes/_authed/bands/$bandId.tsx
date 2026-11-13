import { convexQuery } from '@convex-dev/react-query'
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useMutation } from 'convex/react'
import type { FunctionReturnType } from 'convex/server'
import {
  EllipsisIcon,
  FileInputIcon,
  LogOutIcon,
  MusicIcon,
  PlusIcon,
  Trash2Icon,
  UserPlusIcon,
  XIcon,
} from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'
import { api } from '../../../../convex/_generated/api'
import type { Id } from '../../../../convex/_generated/dataModel'
import { Chip, initials } from '@/components/app/chip'
import { ContextMark } from '@/components/app/context-mark'
import { ConfirmDialog } from '@/components/app/confirm-dialog'
import { EmptyState } from '@/components/app/empty-state'
import { NewSongDialog } from '@/components/app/new-song-dialog'
import {
  Crumb,
  HeaderButton,
  HeaderButtonLink,
  PageHeader,
  SectionTitle,
} from '@/components/app/page-header'
import { NoMatches, SearchField } from '@/components/app/search-field'
import { SongRow } from '@/components/app/song-row'
import { songSearch } from '@/lib/song-context'
import {
  Avatar,
  AvatarFallback,
  AvatarGroup,
  AvatarGroupCount,
} from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
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
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { messageFor } from '@/lib/errors'
import { useLiveQuery } from '@/lib/live'
import { matchesSearch } from '@/lib/search'
import { m } from '@/paraglide/messages'
import { useVersionActions } from '@/components/version-actions'
import { roleName } from './-roles'

const facePileLimit = 3

type BandMember = FunctionReturnType<typeof api.bands.get>['members'][number]

export const Route = createFileRoute('/_authed/bands/$bandId')({
  loader: ({ context, params }) =>
    context.load(
      convexQuery(api.bands.get, { bandId: params.bandId as Id<'bands'> }),
    ),
  component: BandPage,
})

function BandPage() {
  const bandId = Route.useParams().bandId as Id<'bands'>
  const query = useLiveQuery(convexQuery(api.bands.get, { bandId }))
  const { band, members, songs, role, me } = query.data
  const navigate = useNavigate()
  const leave = useMutation(api.bands.leave)
  const removeBand = useMutation(api.bands.remove)
  const [newSong, setNewSong] = useState(false)
  const [songQuery, setSongQuery] = useState('')
  const [bringOpen, setBringOpen] = useState(false)
  const [membersOpen, setMembersOpen] = useState(false)
  const catalog = useLiveQuery(convexQuery(api.songs.catalog, {}))
  const actions = useVersionActions()
  const [confirmLeave, setConfirmLeave] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const canLeave = members.length > 1
  const canDelete = role === 'owner'
  const canWrite = role !== 'viewer'
  const shownMembers = members.slice(0, facePileLimit)
  const extraMembers = members.length - shownMembers.length
  const visibleSongs = songs.filter((row) =>
    matchesSearch(songQuery, [
      row.song.title,
      row.song.subTitle,
      ...row.versions.flatMap((version) => [version.name, version.artist]),
    ]),
  )

  return (
    <div>
      <PageHeader
        breadcrumbs={[
          <Crumb key="bands" to="/bands">
            {m.bands()}
          </Crumb>,
          <span key="band" className="min-w-0 truncate text-foreground">
            {band.name}
          </span>,
        ]}
        title={
          <span className="inline-flex max-w-full min-w-0 items-center gap-3">
            <ContextMark bandId={band._id} name={band.name} />
            <span className="truncate">{band.name}</span>
          </span>
        }
        subtitle={
          <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
            <span>{m.yourRole()}</span>
            <Chip tone={role === 'owner' ? 'primary' : 'default'}>
              {roleName(role)}
            </Chip>
            <button
              type="button"
              aria-label={m.memberCount({ count: String(members.length) })}
              onClick={() => setMembersOpen(true)}
              className="rounded-full outline-none transition-opacity hover:opacity-80 focus-visible:ring-2 focus-visible:ring-ring"
            >
              <AvatarGroup>
                {shownMembers.map((member) => (
                  <Avatar key={member._id} size="sm">
                    <AvatarFallback className="bg-primary/15 text-[0.6rem] font-semibold text-primary">
                      {initials(member.name)}
                    </AvatarFallback>
                  </Avatar>
                ))}
                {extraMembers > 0 ? (
                  <AvatarGroupCount className="text-[0.6rem]">
                    +{extraMembers}
                  </AvatarGroupCount>
                ) : null}
              </AvatarGroup>
            </button>
          </div>
        }
        actions={
          <>
            {canWrite ? (
              <>
                <HeaderButtonLink variant="outline" to="/import">
                  <FileInputIcon />
                  {m.importLabel()}
                </HeaderButtonLink>
                <HeaderButton
                  variant="outline"
                  onPress={() => setBringOpen(true)}
                >
                  <PlusIcon />
                  {m.bringChart()}
                </HeaderButton>
                <HeaderButton onPress={() => setNewSong(true)}>
                  <PlusIcon />
                  {m.newSong()}
                </HeaderButton>
              </>
            ) : null}
            {canLeave || canDelete ? (
              <DropdownMenuTrigger>
                <HeaderButton
                  size="icon-lg"
                  variant="outline"
                  aria-label={m.more()}
                >
                  <EllipsisIcon />
                </HeaderButton>
                <DropdownMenu placement="bottom end" className="w-56">
                  {canLeave ? (
                    <DropdownMenuItem
                      textValue={m.leaveBand()}
                      onAction={() => setConfirmLeave(true)}
                    >
                      <LogOutIcon />
                      {m.leaveBand()}
                    </DropdownMenuItem>
                  ) : null}
                  {canLeave && canDelete ? <DropdownMenuSeparator /> : null}
                  {canDelete ? (
                    <DropdownMenuItem
                      variant="destructive"
                      textValue={m.deleteBand()}
                      onAction={() => setConfirmDelete(true)}
                    >
                      <Trash2Icon />
                      {m.deleteBand()}
                    </DropdownMenuItem>
                  ) : null}
                </DropdownMenu>
              </DropdownMenuTrigger>
            ) : null}
          </>
        }
      />
      <NewSongDialog
        isOpen={newSong}
        onOpenChange={setNewSong}
        bandId={bandId}
      />
      <MembersDialog
        isOpen={membersOpen}
        onOpenChange={setMembersOpen}
        bandId={bandId}
        members={members}
        role={role}
        me={me}
      />

      <section className="min-w-0">
        <SectionTitle>{m.bandSongs()}</SectionTitle>
        {songs.length === 0 ? (
          <EmptyState
            icon={MusicIcon}
            title={m.noBandSongs()}
            description={m.noBandSongsHint()}
            action={
              canWrite ? (
                <Button onPress={() => setNewSong(true)}>
                  <PlusIcon />
                  {m.newSong()}
                </Button>
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
            {visibleSongs.length === 0 ? (
              <NoMatches query={songQuery} onClear={() => setSongQuery('')} />
            ) : (
              <ul className="-mx-3 divide-y divide-border/50">
                {visibleSongs.map((row) => (
                  <SongRow
                    key={row.song._id}
                    song={row.song}
                    versionCount={row.versions.length}
                    search={songSearch(bandId)}
                  />
                ))}
              </ul>
            )}
          </div>
        )}
      </section>
      <ConfirmDialog
        isOpen={confirmLeave}
        onOpenChange={setConfirmLeave}
        title={m.leaveBandConfirm({ name: band.name })}
        description={m.leaveBandHint()}
        confirmLabel={m.leaveBand()}
        onConfirm={async () => {
          await leave({ bandId })
          await navigate({ to: '/bands' })
        }}
      />
      <Dialog isOpen={bringOpen} onOpenChange={setBringOpen}>
        <DialogHeader>
          <DialogTitle>{m.bringChart()}</DialogTitle>
          <DialogDescription>
            {m.copyToBand({ band: band.name })}
          </DialogDescription>
        </DialogHeader>
        <ul className="max-h-80 space-y-1 overflow-y-auto">
          {catalog.data
            .flatMap((row) =>
              row.versions
                .filter((version) => version.canEdit && !version.bandId)
                .map((version) => ({ version, title: row.song.title })),
            )
            .map(({ version, title }) => (
              <li
                key={version._id}
                className="flex min-w-0 flex-wrap items-center gap-2 rounded-xl px-3 py-2"
              >
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-medium">{title}</span>
                  <span className="block truncate text-sm text-muted-foreground">
                    {version.name}
                  </span>
                </span>
                <Button
                  size="sm"
                  variant="outline"
                  onPress={() => {
                    setBringOpen(false)
                    void actions.copyToBand(version._id, bandId)
                  }}
                >
                  {m.copyVerb()}
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onPress={() => {
                    setBringOpen(false)
                    void actions.moveToBand(version._id, bandId)
                  }}
                >
                  {m.moveVerb()}
                </Button>
              </li>
            ))}
        </ul>
      </Dialog>
      <ConfirmDialog
        isOpen={confirmDelete}
        onOpenChange={setConfirmDelete}
        title={m.deleteBandConfirm({ name: band.name })}
        description={m.deleteBandHint()}
        confirmLabel={m.deleteBand()}
        onConfirm={async () => {
          await removeBand({ bandId })
          await navigate({ to: '/bands' })
        }}
      />
    </div>
  )
}

function MembersDialog({
  isOpen,
  onOpenChange,
  bandId,
  members,
  role,
  me,
}: {
  isOpen: boolean
  onOpenChange: (open: boolean) => void
  bandId: Id<'bands'>
  members: Array<BandMember>
  role: BandMember['role']
  me: string
}) {
  const addMember = useMutation(api.bands.addMember)
  const removeMember = useMutation(api.bands.removeMember)
  const [email, setEmail] = useState('')
  const [inviteRole, setInviteRole] = useState<'editor' | 'viewer'>('editor')
  const [busy, setBusy] = useState(false)

  return (
    <Dialog isOpen={isOpen} onOpenChange={onOpenChange} className="sm:max-w-md">
      <DialogHeader>
        <DialogTitle>
          {m.members()} · {members.length}
        </DialogTitle>
      </DialogHeader>
      <ul className="max-h-80 space-y-1 overflow-y-auto">
        {members.map((member) => (
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
              {member.userId === me ? (
                <span className="text-muted-foreground"> · {m.you()}</span>
              ) : null}
            </span>
            <Chip tone={member.role === 'owner' ? 'primary' : 'default'}>
              {roleName(member.role)}
            </Chip>
            {role === 'owner' && member.role !== 'owner' ? (
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
      </ul>
      {members.length <= 1 ? (
        <p className="text-sm text-muted-foreground">{m.membersEmpty()}</p>
      ) : null}
      {role === 'owner' ? (
        <form
          className="grid gap-3 border-t pt-4"
          onSubmit={(event) => {
            event.preventDefault()
            if (!email.trim()) return
            setBusy(true)
            addMember({ bandId, email, role: inviteRole })
              .then(() => {
                setEmail('')
                toast.success(m.memberAdded())
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
    </Dialog>
  )
}
