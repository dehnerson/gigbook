import { convexQuery } from '@convex-dev/react-query'
import { createFileRoute } from '@tanstack/react-router'
import { useMutation } from 'convex/react'
import { MusicIcon, PlusIcon, UserPlusIcon, XIcon } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'
import { api } from '../../../../convex/_generated/api'
import type { Id } from '../../../../convex/_generated/dataModel'
import { Chip, initials } from '@/components/app/chip'
import { EmptyState } from '@/components/app/empty-state'
import { NewSongDialog } from '@/components/app/new-song-dialog'
import { Crumb, PageHeader, SectionTitle } from '@/components/app/page-header'
import { SongRow } from '@/components/app/song-row'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { useNotation } from '@/components/use-notation'
import { messageFor } from '@/lib/errors'
import { useLiveQuery } from '@/lib/live'
import { loadQuery } from '@/lib/load'
import { displayChord } from '@/lib/music/chords'
import { m } from '@/paraglide/messages'
import { roleName } from './-roles'

export const Route = createFileRoute('/_authed/bands/$bandId')({
  loader: async ({ context, params }) => {
    await loadQuery(
      context.queryClient,
      convexQuery(api.bands.get, { bandId: params.bandId as Id<'bands'> }),
    )
  },
  component: BandPage,
})

function BandPage() {
  const bandId = Route.useParams().bandId as Id<'bands'>
  const query = useLiveQuery(convexQuery(api.bands.get, { bandId }))
  const { band, members, songs, role, me } = query.data
  const addMember = useMutation(api.bands.addMember)
  const removeMember = useMutation(api.bands.removeMember)
  const notation = useNotation()
  const [newSong, setNewSong] = useState(false)
  const [email, setEmail] = useState('')
  const [inviteRole, setInviteRole] = useState<'editor' | 'viewer'>('editor')
  const [busy, setBusy] = useState(false)
  const canWrite = role !== 'viewer'

  return (
    <div>
      <PageHeader
        breadcrumbs={[
          <Crumb key="bands" to="/bands">
            {m.bands()}
          </Crumb>,
          <span key="band" className="truncate text-foreground">
            {band.name}
          </span>,
        ]}
        title={band.name}
        subtitle={
          <div className="flex items-center gap-2">
            <span>{m.yourRole()}</span>
            <Chip tone={role === 'owner' ? 'primary' : 'default'}>
              {roleName(role)}
            </Chip>
          </div>
        }
        actions={
          canWrite ? (
            <Button onPress={() => setNewSong(true)}>
              <PlusIcon />
              {m.newSong()}
            </Button>
          ) : null
        }
      />
      <NewSongDialog
        isOpen={newSong}
        onOpenChange={setNewSong}
        bandId={bandId}
      />

      <div className="grid items-start gap-8 lg:grid-cols-[minmax(0,1fr)_22rem]">
        <section>
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
            <ul className="-mx-3 divide-y divide-border/50">
              {songs.map((row) => (
                <SongRow
                  key={row.song._id}
                  song={{ ...row.song, bandId: undefined }}
                  versionCount={row.versions.length}
                  keys={row.versions.map((version) =>
                    displayChord(version.concertKey, 0, 0, notation),
                  )}
                />
              ))}
            </ul>
          )}
        </section>

        <section className="rounded-2xl border bg-card p-5">
          <SectionTitle>
            {m.members()} · {members.length}
          </SectionTitle>
          <ul className="space-y-1">
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
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    aria-label={m.removeMember({ name: member.name })}
                    onPress={() =>
                      void removeMember({ membershipId: member._id }).catch(
                        (error: unknown) => toast.error(messageFor(error)),
                      )
                    }
                    className="text-muted-foreground hover:text-destructive"
                  >
                    <XIcon />
                  </Button>
                ) : null}
              </li>
            ))}
          </ul>
          {members.length <= 1 ? (
            <p className="mt-2 text-sm text-muted-foreground">
              {m.membersEmpty()}
            </p>
          ) : null}

          {role === 'owner' ? (
            <form
              className="mt-5 grid gap-3 border-t pt-5"
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
              <div className="flex gap-2">
                <Select
                  aria-label={m.role()}
                  value={inviteRole}
                  onChange={(value) =>
                    setInviteRole(value as 'editor' | 'viewer')
                  }
                  className="flex-1"
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
                <Button type="submit" isDisabled={busy || !email.trim()}>
                  <UserPlusIcon />
                  {m.invite()}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">{m.inviteHint()}</p>
            </form>
          ) : null}
        </section>
      </div>
    </div>
  )
}
