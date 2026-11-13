import { convexQuery } from '@convex-dev/react-query'
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useMutation } from 'convex/react'
import { EllipsisIcon, FileMusicIcon, PlayIcon, PlusIcon } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'
import { api } from '../../../../convex/_generated/api'
import type { Doc, Id } from '../../../../convex/_generated/dataModel'
import { Chip } from '@/components/app/chip'
import { CollectionCard } from '@/components/app/collection-card'
import { ContextMark } from '@/components/app/context-mark'
import { EmptyState } from '@/components/app/empty-state'
import { InlineEdit } from '@/components/app/inline-edit'
import { PerformerLine } from '@/components/app/performer-line'
import { PageHeader, SectionTitle } from '@/components/app/page-header'
import { songCrumbs } from '@/components/app/song-crumbs'
import { Button, ButtonLink } from '@/components/ui/button'
import { useNotation } from '@/components/use-notation'
import { VersionMenu } from '@/components/version-menu'
import { songSearch } from '@/lib/song-context'
import { messageFor } from '@/lib/errors'
import { useLiveQuery } from '@/lib/live'
import { displayChord } from '@/lib/music/chords'
import { TUNING_PRESETS } from '@/lib/music/diagrams'
import type { Notation } from '@/lib/music/pitch'
import { m } from '@/paraglide/messages'

export const Route = createFileRoute('/_authed/songs/$songId')({
  validateSearch: (search: Record<string, unknown>) =>
    songSearch(typeof search.band === 'string' ? search.band : undefined),
  loaderDeps: ({ search }) => ({ band: search.band }),
  loader: ({ context, params, deps }) =>
    context.load(
      convexQuery(api.songs.get, {
        songId: params.songId as Id<'songs'>,
        ...(deps.band ? { bandId: deps.band as Id<'bands'> } : {}),
      }),
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
  const { band: bandParam } = Route.useSearch()
  const bandId = bandParam as Id<'bands'> | undefined
  const query = useLiveQuery(
    convexQuery(api.songs.get, {
      songId,
      ...(bandId ? { bandId } : {}),
    }),
  )
  const { song, versions, versionCount, canRename, canAdd, band } = query.data
  const update = useMutation(api.songs.update)
  const addVersion = useMutation(api.songs.addVersion)
  const navigate = useNavigate()
  const notation = useNotation()
  const [addingVersion, setAddingVersion] = useState(false)

  const save = (values: { title?: string; subTitle?: string }) =>
    update({ songId, ...values }).catch((error: unknown) =>
      toast.error(messageFor(error)),
    )

  return (
    <div>
      <PageHeader
        breadcrumbs={songCrumbs({
          songId,
          title: song.title,
          band: band ? { id: band._id, name: band.name } : null,
          linked: false,
        })}
        title={
          <InlineEdit
            label={m.renameSong()}
            value={song.title}
            isDisabled={!canRename}
            onSave={(title) => save({ title })}
          />
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
                setAddingVersion(true)
                addVersion({
                  songId,
                  versionName: m.newVersionName(),
                  bandId,
                })
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
              isOnlyVersion={versionCount === 1}
              notation={notation}
            />
          ))}
        </ul>
      )}
    </div>
  )
}

function VersionCard({
  version,
  songTitle,
  isOnlyVersion,
  notation,
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
}) {
  const tuning = tuningLabel(version.tuning)
  const sections = version.timeline.length

  return (
    <CollectionCard
      to="/versions/$versionId"
      params={{ versionId: version._id }}
      title={version.name}
      trailing={<ContextMark {...version} />}
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
            to="/versions/$versionId/play"
            params={{ versionId: version._id }}
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
