import { convexQuery } from '@convex-dev/react-query'
import { useNavigate } from '@tanstack/react-router'
import { useMutation } from 'convex/react'
import { EllipsisIcon, FileMusicIcon, PlayIcon, PlusIcon } from 'lucide-react'
import { Suspense, useState } from 'react'
import { toast } from 'sonner'
import { api } from '../../../convex/_generated/api'
import type { Doc, Id } from '../../../convex/_generated/dataModel'
import { Chip } from '@/components/app/chip'
import { CollectionCard } from '@/components/app/collection-card'
import { ContextMark } from '@/components/app/context-mark'
import { EmptyState } from '@/components/app/empty-state'
import { useWorkspaceSelectDialog } from '@/components/app/workspace-select'
import { InlineEdit } from '@/components/app/inline-edit'
import { PerformerLine } from '@/components/app/performer-line'
import { Crumb, PageHeader, SectionTitle } from '@/components/app/page-header'
import { DetailSkeleton } from '@/components/app/route-states'
import { Skeleton } from '@/components/ui/skeleton'
import { songCrumbs } from '@/components/app/song-crumbs'
import { Button, ButtonLink } from '@/components/ui/button'
import { useNotation } from '@/lib/use-notation'
import { VersionMenu } from '@/components/version/version-menu'
import { messageFor } from '@/lib/errors'
import { useSuspenseQuery } from '@tanstack/react-query'
import { useWorkspace } from '@/lib/workspace'
import type { Workspace } from '@/lib/workspace'
import { displayChord } from '@/lib/music/chords'
import { TUNING_PRESETS } from '@/lib/music/diagrams'
import type { Notation } from '@/lib/music/pitch'
import { m } from '@/paraglide/messages'

function tuningLabel(tuning: Array<string>) {
  const preset = TUNING_PRESETS.find(
    (item) => item.tuning.join(' ') === tuning.join(' '),
  )
  if (preset?.id === 'standard') return null
  return tuning.map((note) => note.replace(/\d+$/, '')).join(' ')
}

export function SongPage({
  songId,
  workspace,
}: {
  songId: Id<'songs'>
  workspace?: Workspace
}) {
  const songLinkOptions = {
    to: workspace ? '/$workspace/songs' : '/songs',
    params: workspace ? { workspace: workspace.key } : {},
  }

  return (
    <Suspense
      fallback={
        <div>
          <PageHeader
            breadcrumbs={[
              <Crumb key="back" {...songLinkOptions}>
                {workspace ? m.songs() : m.allSongs()}
              </Crumb>,
            ]}
            title={<Skeleton className="h-9 w-64" />}
          />
          <DetailSkeleton />
        </div>
      }
    >
      <SongView songId={songId} workspace={workspace} />
    </Suspense>
  )
}

function SongView({
  songId,
  workspace,
}: {
  songId: Id<'songs'>
  workspace?: Workspace
}) {
  const { all } = useWorkspace()

  const { data } = useSuspenseQuery(
    convexQuery(api.songs.get, {
      songId,
      ...(workspace ? { bandId: workspace.bandId } : {}),
    }),
  )
  const { song, versions, versionCount, canRename, canAdd } = data
  const update = useMutation(api.songs.update)
  const addVersion = useMutation(api.songs.addVersion)
  const notation = useNotation()
  const [addingVersion, setAddingVersion] = useState(false)

  const navigate = useNavigate()
  const fileVersion = (into: string) => {
    const intoWorkspace = all.find((item) => item.key === into)
    if (!intoWorkspace) return
    setAddingVersion(true)
    addVersion({
      songId,
      versionName: m.newVersionName(),
      ...(intoWorkspace.bandId ? { bandId: intoWorkspace.bandId } : {}),
    })
      .then((added) =>
        navigate({
          to: workspace
            ? '/$workspace/versions/$versionId/edit'
            : '/versions/$versionId/edit',
          params: workspace
            ? { workspace: workspace.key, versionId: added.versionId }
            : { versionId: added.versionId },
        }),
      )
      .catch((error: unknown) => toast.error(messageFor(error)))
      .finally(() => setAddingVersion(false))
  }
  const save = (values: { title?: string; subTitle?: string }) =>
    update({ songId, ...values }).catch((error: unknown) =>
      toast.error(messageFor(error)),
    )

  const { selectWorkspace, workspaceDialog } = useWorkspaceSelectDialog({
    chooseText: m.addVersion(),
    hint: m.chooseWorkspaceForVersionHint(),
    onWorkspaceSelected: (selectedWorkspace) =>
      fileVersion(selectedWorkspace.key),
  })

  return (
    <div>
      <PageHeader
        breadcrumbs={songCrumbs({
          workspace,
          songId,
          title: song.title,
          linked: false,
        })}
        title={
          <span className="inline-flex min-w-0 items-center gap-3">
            {workspace ? (
              <ContextMark bandId={workspace.bandId} name={workspace.label} />
            ) : null}
            <InlineEdit
              label={m.renameSong()}
              value={song.title}
              isDisabled={!canRename}
              onSave={(title) => save({ title })}
            />
          </span>
        }
        subtitle={
          <InlineEdit
            label={m.editSubTitle()}
            value={song.subTitle}
            isDisabled={!canRename}
            onSave={(subTitle) => save({ subTitle })}
          />
        }
      />
      <SectionTitle
        action={
          canAdd ? (
            <Button
              size="sm"
              variant="outline"
              isDisabled={addingVersion}
              onPress={() => {
                if (workspace) fileVersion(workspace.key)
                else selectWorkspace()
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
              isOnlyVersion={versionCount === 1}
              notation={notation}
              showHome={!workspace}
              workspace={workspace}
            />
          ))}
        </ul>
      )}
      {workspaceDialog}
    </div>
  )
}

function VersionCard({
  version,
  songTitle,
  isOnlyVersion,
  notation,
  showHome,
  workspace,
}: {
  version: Omit<
    Doc<'versions'>,
    'createdBy' | 'shareToken' | 'parentVersionId'
  > & {
    ownerBandId: string | null
    ownerName: string | null
    canEdit: boolean
    shared: boolean
  }
  songTitle: string
  isOnlyVersion: boolean
  notation: Notation
  showHome: boolean
  workspace?: Workspace
}) {
  const tuning = tuningLabel(version.tuning)
  const sections = version.timeline.length

  return (
    <CollectionCard
      linkOptions={{
        to: workspace
          ? '/$workspace/versions/$versionId'
          : '/versions/$versionId',
        params: workspace
          ? { workspace: workspace.key, versionId: version._id }
          : { versionId: version._id },
      }}
      title={version.name}
      trailing={showHome ? <ContextMark {...version} /> : null}
      footer={
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
          <Chip label={m.keyShort()}>
            <span className="font-mono text-chord">
              {displayChord(version.concertKey, 0, 0, notation)}
            </span>
          </Chip>
        </div>
      }
      actions={
        <>
          <ButtonLink
            {...{
              to: workspace
                ? '/$workspace/versions/$versionId/play'
                : '/versions/$versionId/play',
              params: workspace
                ? { workspace: workspace.key, versionId: version._id }
                : { versionId: version._id },
            }}
          >
            <PlayIcon className="fill-current" />
            {m.play()}
          </ButtonLink>
          <VersionMenu
            version={version}
            songTitle={songTitle}
            isOnlyVersion={isOnlyVersion}
            includeEdit
            trigger={
              <Button
                variant="ghost"
                size="icon"
                aria-label={m.more()}
                className="ml-auto"
              >
                <EllipsisIcon />
              </Button>
            }
          />
        </>
      }
    >
      <PerformerLine artists={[version.artist]} className="block truncate" />
      <p>
        {sections === 0
          ? m.noSectionsYet()
          : m.sectionCount({ count: String(sections) })}
      </p>
    </CollectionCard>
  )
}
