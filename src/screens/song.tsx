import { convexQuery } from '@convex-dev/react-query'
import { useNavigate } from '@tanstack/react-router'
import { useMutation } from 'convex/react'
import { EllipsisIcon, FileMusicIcon, PlayIcon, PlusIcon } from 'lucide-react'
import { Suspense, useState } from 'react'
import { toast } from 'sonner'
import { api } from '../../convex/_generated/api'
import type { Doc, Id } from '../../convex/_generated/dataModel'
import { Chip } from '@/components/app/chip'
import { CollectionCard } from '@/components/app/collection-card'
import { ContextMark } from '@/components/app/context-mark'
import { EmptyState } from '@/components/app/empty-state'
import { HomeSelect } from '@/components/app/home-select'
import { InlineEdit } from '@/components/app/inline-edit'
import { PerformerLine } from '@/components/app/performer-line'
import { Crumb, PageHeader, SectionTitle } from '@/components/app/page-header'
import { DetailSkeleton } from '@/components/app/route-states'
import { Skeleton } from '@/components/ui/skeleton'
import { songCrumbs } from '@/components/app/song-crumbs'
import { Button, ButtonLink } from '@/components/ui/button'
import {
  Dialog,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { useNotation } from '@/lib/use-notation'
import { VersionMenu } from '@/components/version/version-menu'
import { messageFor } from '@/lib/errors'
import { useSuspenseQuery } from '@tanstack/react-query'
import type { Home } from '@/lib/workspace'
import { built } from '@/lib/built'
import { PERSONAL, bandIdFromPath, path, workspaceTrail } from '@/lib/space'
import type { Dest, Trail } from '@/lib/space'
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
  home,
  trail,
}: {
  songId: Id<'songs'>
  home: Home | null
  trail: Trail
}) {
  const href = (dest: Dest) => path(trail, dest)
  return (
    <Suspense
      fallback={
        <div>
          <PageHeader
            breadcrumbs={[
              <Crumb
                key="back"
                {...built(
                  href(
                    trail.kind === 'workspace'
                      ? { page: 'songs' }
                      : { page: 'library' },
                  ),
                )}
              >
                {trail.kind === 'workspace' ? m.songs() : m.allSongs()}
              </Crumb>,
            ]}
            title={<Skeleton className="h-9 w-64" />}
          />
          <DetailSkeleton />
        </div>
      }
    >
      <SongView songId={songId} home={home} trail={trail} />
    </Suspense>
  )
}

function SongView({
  songId,
  home,
  trail,
}: {
  songId: Id<'songs'>
  home: Home | null
  trail: Trail
}) {
  const href = (dest: Dest) => path(trail, dest)
  const scoped = home !== null
  const { data } = useSuspenseQuery(
    convexQuery(api.songs.get, {
      songId,
      ...(home ? { bandId: home.bandId } : {}),
    }),
  )
  const { song, versions, versionCount, canRename, canAdd, band } = data
  const update = useMutation(api.songs.update)
  const addVersion = useMutation(api.songs.addVersion)
  const notation = useNotation()
  const [addingVersion, setAddingVersion] = useState(false)
  const [pickingHome, setPickingHome] = useState(false)
  const [choice, setChoice] = useState(PERSONAL)
  const fileBandId = scoped ? (home.bandId ?? undefined) : undefined
  const allowAdd = scoped ? canAdd : true
  const homeName = scoped
    ? (home.label ?? band?.name ?? m.personal())
    : undefined

  const navigate = useNavigate()
  const fileVersion = (bandId: Id<'bands'> | undefined, next: typeof trail) => {
    setAddingVersion(true)
    addVersion({
      songId,
      versionName: m.newVersionName(),
      ...(bandId ? { bandId } : {}),
    })
      .then((added) =>
        navigate({
          href: path(next, {
            page: 'version',
            versionId: added.versionId,
            leaf: 'edit',
          }),
        }),
      )
      .catch((error: unknown) => toast.error(messageFor(error)))
      .finally(() => setAddingVersion(false))
  }
  const save = (values: { title?: string; subTitle?: string }) =>
    update({ songId, ...values }).catch((error: unknown) =>
      toast.error(messageFor(error)),
    )

  return (
    <div>
      <PageHeader
        breadcrumbs={songCrumbs({
          trail,
          songId,
          title: song.title,
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
          allowAdd ? (
            <Button
              size="sm"
              variant="outline"
              isDisabled={addingVersion}
              onPress={() => {
                if (scoped) fileVersion(fileBandId, trail)
                else setPickingHome(true)
              }}
            >
              <PlusIcon />
              {m.addVersion()}
            </Button>
          ) : null
        }
      >
        <span className="inline-flex items-center gap-2">
          {m.versions()}
          {scoped ? (
            <span className="inline-flex items-center gap-1.5 font-medium tracking-normal text-foreground normal-case">
              <ContextMark bandId={home.bandId} name={homeName} />
              {homeName}
            </span>
          ) : null}
        </span>
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
              trail={trail}
              notation={notation}
              showHome={!scoped}
              href={href({ page: 'version', versionId: version._id })}
              playHref={href({
                page: 'version',
                versionId: version._id,
                leaf: 'play',
              })}
            />
          ))}
        </ul>
      )}
      <Dialog isOpen={pickingHome} onOpenChange={setPickingHome}>
        <DialogHeader>
          <DialogTitle>{m.chooseHome()}</DialogTitle>
          <DialogDescription>{m.chooseHomeHint()}</DialogDescription>
        </DialogHeader>
        <HomeSelect value={choice} onChange={setChoice} writable />
        <DialogFooter>
          <Button variant="outline" onPress={() => setPickingHome(false)}>
            {m.cancel()}
          </Button>
          <Button
            isDisabled={addingVersion}
            onPress={() => {
              setPickingHome(false)
              fileVersion(
                bandIdFromPath(choice) ?? undefined,
                workspaceTrail(choice),
              )
            }}
          >
            {m.addVersion()}
          </Button>
        </DialogFooter>
      </Dialog>
    </div>
  )
}

function VersionCard({
  version,
  songTitle,
  isOnlyVersion,
  trail,
  notation,
  showHome,
  href,
  playHref,
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
  trail: Trail
  notation: Notation
  showHome: boolean
  href: string
  playHref: string
}) {
  const tuning = tuningLabel(version.tuning)
  const sections = version.timeline.length

  return (
    <CollectionCard
      href={href}
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
          <ButtonLink {...built(playHref)}>
            <PlayIcon className="fill-current" />
            {m.play()}
          </ButtonLink>
          <VersionMenu
            version={version}
            songTitle={songTitle}
            isOnlyVersion={isOnlyVersion}
            trail={trail}
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
