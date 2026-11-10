import { convexQuery } from '@convex-dev/react-query'
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useMutation } from 'convex/react'
import {
  BookOpenIcon,
  CopyIcon,
  EllipsisIcon,
  FileMusicIcon,
  PencilIcon,
  PlayIcon,
  PlusIcon,
  Share2Icon,
  Trash2Icon,
  UsersIcon,
} from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'
import { api } from '../../../../convex/_generated/api'
import type { Doc, Id } from '../../../../convex/_generated/dataModel'
import { Chip } from '@/components/app/chip'
import { ConfirmDialog } from '@/components/app/confirm-dialog'
import { DeleteVersionDialog } from '@/components/app/delete-version-dialog'
import { EmptyState } from '@/components/app/empty-state'
import { InlineEdit } from '@/components/app/inline-edit'
import { Crumb, PageHeader, SectionTitle } from '@/components/app/page-header'
import { Button, ButtonLink } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { useNotation } from '@/components/use-notation'
import { useVersionActions } from '@/components/version-actions'
import { messageFor } from '@/lib/errors'
import { useLiveQuery } from '@/lib/live'
import { displayChord } from '@/lib/music/chords'
import { TUNING_PRESETS } from '@/lib/music/diagrams'
import type { Notation } from '@/lib/music/pitch'
import { m } from '@/paraglide/messages'

export const Route = createFileRoute('/_authed/songs/$songId')({
  loader: ({ context, params }) =>
    context.load(
      convexQuery(api.songs.get, { songId: params.songId as Id<'songs'> }),
    ),
  component: SongPage,
})

function tuningLabel(tuning: Array<string>) {
  const preset = TUNING_PRESETS.find(
    (item) => item.tuning.join(' ') === tuning.join(' '),
  )
  if (preset?.id === 'standard') return null
  return tuning.map((note) => note.replace(/\d+$/, '')).join(' ')
}

function SongPage() {
  const songId = Route.useParams().songId as Id<'songs'>
  const query = useLiveQuery(convexQuery(api.songs.get, { songId }))
  const { song, versions, canEdit, bandName } = query.data
  const update = useMutation(api.songs.update)
  const remove = useMutation(api.songs.remove)
  const addVersion = useMutation(api.songs.addVersion)
  const navigate = useNavigate()
  const notation = useNotation()
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [addingVersion, setAddingVersion] = useState(false)

  const save = (values: { title?: string; artist?: string }) =>
    update({ songId, ...values }).catch((error: unknown) =>
      toast.error(messageFor(error)),
    )
  const first = versions.at(0)

  return (
    <div>
      <PageHeader
        breadcrumbs={[
          <Crumb key="library" to="/">
            {m.library()}
          </Crumb>,
          <span key="song" className="truncate text-foreground">
            {song.title}
          </span>,
        ]}
        title={
          <InlineEdit
            label={m.renameSong()}
            value={song.title}
            isDisabled={!canEdit}
            onSave={(title) => save({ title })}
          />
        }
        subtitle={
          <div className="flex flex-wrap items-center gap-2">
            <InlineEdit
              label={m.editSubTitle()}
              value={song.subTitle}
              isDisabled={!canEdit}
              onSave={(artist) => save({ artist })}
            />
            {song.bandId ? (
              <Chip tone="primary">
                <UsersIcon className="size-3" />
                {bandName ?? m.band()}
              </Chip>
            ) : null}
          </div>
        }
        actions={
          <>
            {first ? (
              <ButtonLink
                size="lg"
                to="/versions/$versionId/play"
                params={{ versionId: first._id }}
              >
                <PlayIcon className="fill-current" />
                {m.play()}
              </ButtonLink>
            ) : null}
            {canEdit ? (
              <DropdownMenuTrigger>
                <Button size="icon-lg" variant="outline" aria-label={m.more()}>
                  <EllipsisIcon />
                </Button>
                <DropdownMenu placement="bottom end" className="w-52">
                  <DropdownMenuItem
                    variant="destructive"
                    textValue={m.deleteSong()}
                    onAction={() => setConfirmDelete(true)}
                  >
                    <Trash2Icon />
                    {m.deleteSong()}
                  </DropdownMenuItem>
                </DropdownMenu>
              </DropdownMenuTrigger>
            ) : null}
          </>
        }
      />

      <SectionTitle
        action={
          canEdit ? (
            <Button
              size="sm"
              variant="outline"
              isDisabled={addingVersion}
              onPress={() => {
                setAddingVersion(true)
                addVersion({ songId, versionName: m.newVersionName() })
                  .then((added) =>
                    navigate({
                      to: '/versions/$versionId/edit',
                      params: { versionId: added.versionId },
                    }),
                  )
                  .catch((error: unknown) => toast.error(messageFor(error)))
                  .finally(() => setAddingVersion(false))
              }}
            >
              <PlusIcon />
              {m.addVersion()}
            </Button>
          ) : null
        }
      >
        {m.versions()}
      </SectionTitle>
      {versions.length === 0 ? (
        <EmptyState icon={FileMusicIcon} title={m.noVersions()} />
      ) : (
        <ul className="grid gap-4 md:grid-cols-2">
          {versions.map((version) => (
            <VersionCard
              key={version._id}
              version={version}
              songTitle={song.title}
              canEdit={canEdit}
              isOnlyVersion={versions.length === 1}
              notation={notation}
            />
          ))}
        </ul>
      )}

      <ConfirmDialog
        isOpen={confirmDelete}
        onOpenChange={setConfirmDelete}
        title={m.deleteSongConfirm({ title: song.title })}
        description={m.deleteSongHint()}
        onConfirm={async () => {
          await remove({ songId })
          await navigate({ to: '/' })
        }}
      />
    </div>
  )
}

function VersionCard({
  version,
  songTitle,
  canEdit,
  isOnlyVersion,
  notation,
}: {
  version: Doc<'versions'>
  songTitle: string
  canEdit: boolean
  isOnlyVersion: boolean
  notation: Notation
}) {
  const actions = useVersionActions()
  const navigate = useNavigate()
  const [confirmDelete, setConfirmDelete] = useState(false)
  const tuning = tuningLabel(version.tuning)
  const sections = version.timeline.length

  return (
    <li className="group flex flex-col gap-4 rounded-2xl border bg-card p-5 transition-colors hover:border-foreground/15">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="truncate text-lg font-semibold">{version.name}</h3>
          {version.artist ? (
            <p className="truncate text-sm">
              {m.performedByArtist({ artist: version.artist })}
            </p>
          ) : null}
          <p className="text-sm text-muted-foreground">
            {sections === 0
              ? m.noSectionsYet()
              : m.sectionCount({ count: String(sections) })}
          </p>
        </div>
        <span className="font-mono text-2xl font-semibold text-chord">
          {displayChord(version.concertKey, 0, 0, notation)}
        </span>
      </div>
      <div className="flex flex-wrap gap-1.5">
        <Chip label={m.timeSignature()}>{version.timeSignature}</Chip>
        {version.bpm ? <Chip label={m.bpm()}>{version.bpm}</Chip> : null}
        {version.suggestedCapo > 0 ? (
          <Chip label={m.capo()}>{version.suggestedCapo}</Chip>
        ) : null}
        {tuning ? (
          <Chip label={m.tuning()}>
            <span className="font-mono">{tuning}</span>
          </Chip>
        ) : null}
      </div>
      <div className="mt-auto flex items-center gap-2">
        <ButtonLink
          to="/versions/$versionId/play"
          params={{ versionId: version._id }}
        >
          <PlayIcon className="fill-current" />
          {m.play()}
        </ButtonLink>
        <ButtonLink
          variant="outline"
          to="/versions/$versionId"
          params={{ versionId: version._id }}
        >
          <BookOpenIcon />
          {m.open()}
        </ButtonLink>
        {canEdit ? (
          <DropdownMenuTrigger>
            <Button
              variant="ghost"
              size="icon"
              aria-label={m.more()}
              className="ml-auto"
            >
              <EllipsisIcon />
            </Button>
            <DropdownMenu placement="bottom end" className="w-56">
              <DropdownMenuItem
                textValue={m.edit()}
                onAction={() =>
                  void navigate({
                    to: '/versions/$versionId/edit',
                    params: { versionId: version._id },
                  })
                }
              >
                <PencilIcon />
                {m.edit()}
              </DropdownMenuItem>
              <DropdownMenuItem
                textValue={m.duplicate()}
                onAction={() => void actions.copy(version)}
              >
                <CopyIcon />
                {m.duplicate()}
              </DropdownMenuItem>
              <DropdownMenuItem
                textValue={m.share()}
                onAction={() => void actions.share(version._id)}
              >
                <Share2Icon />
                {m.share()}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                variant="destructive"
                textValue={m.deleteVersion()}
                onAction={() => setConfirmDelete(true)}
              >
                <Trash2Icon />
                {m.deleteVersion()}
              </DropdownMenuItem>
            </DropdownMenu>
          </DropdownMenuTrigger>
        ) : null}
      </div>
      <DeleteVersionDialog
        isOpen={confirmDelete}
        onOpenChange={setConfirmDelete}
        versionId={version._id}
        versionName={version.name}
        songTitle={songTitle}
        isOnlyVersion={isOnlyVersion}
      />
    </li>
  )
}
