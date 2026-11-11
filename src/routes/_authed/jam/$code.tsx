import { convexQuery } from '@convex-dev/react-query'
import { useQuery } from '@tanstack/react-query'
import { createFileRoute } from '@tanstack/react-router'
import { useMutation } from 'convex/react'
import {
  ArrowLeftIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  CopyIcon,
  CrownIcon,
  InfoIcon,
  LockIcon,
  MusicIcon,
  SkipForwardIcon,
} from 'lucide-react'
import { Suspense, useEffect, useRef, useState } from 'react'
import { toast } from 'sonner'
import { api } from '../../../../convex/_generated/api'
import type { Id } from '../../../../convex/_generated/dataModel'
import { Chip, initials } from '@/components/app/chip'
import { EmptyState } from '@/components/app/empty-state'
import {
  DockDivider,
  StageDock,
  useForceDark,
  useSectionKeys,
} from '@/components/play-view'
import {
  KeyControls,
  LayerToggles,
  LayoutToggle,
  TextSizeControl,
  TracksFilter,
} from '@/components/sheet/sheet-controls'
import { sheetPasses } from '@/components/sheet/passes'
import {
  SectionNav,
  SongSheet,
  useSectionCursor,
} from '@/components/sheet/song-sheet'
import type { SheetEntry } from '@/components/sheet/types'
import {
  useSheetLayers,
  useSheetPrefs,
} from '@/components/sheet/use-sheet-prefs'
import {
  Avatar,
  AvatarFallback,
  AvatarGroup,
  AvatarGroupCount,
} from '@/components/ui/avatar'
import { Button, ButtonLink } from '@/components/ui/button'
import { ComboBox } from '@/components/ui/combobox'
import { Select } from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { Switch } from '@/components/ui/switch'
import { useNotation } from '@/components/use-notation'
import { useWakeLock } from '@/components/use-wake-lock'
import { messageFor } from '@/lib/errors'
import { useLiveQuery } from '@/lib/live'
import { displayChord } from '@/lib/music/chords'
import type { Notation } from '@/lib/music/pitch'
import { m } from '@/paraglide/messages'

export const Route = createFileRoute('/_authed/jam/$code')({
  loader: ({ context, params }) =>
    context.load(convexQuery(api.jam.get, { code: params.code })),
  component: JamRoomPage,
})

type MemberView = {
  capo: number
  following: boolean
  visibleTrackIds: Array<string>
  personalVersionId?: Id<'versions'>
}

function fail(error: unknown) {
  toast.error(messageFor(error))
}

function JamRoomPage() {
  const { code } = Route.useParams()
  const { room, members, me } = useLiveQuery(
    convexQuery(api.jam.get, { code }),
  ).data
  const setTransport = useMutation(api.jam.setTransport)
  const advance = useMutation(api.jam.advanceSetlist)
  const setMemberView = useMutation(api.jam.setMemberView)
  const [personalId, setPersonalId] = useState<Id<'versions'> | undefined>()
  const notation = useNotation()
  const prefs = useSheetPrefs('jam', 1.15)
  useForceDark()
  useWakeLock(true)

  const isHost = me?.userId === room.hostUserId
  const [capo, setCapo] = useState(me?.capo ?? 0)
  const [visible, setVisible] = useState<Array<string>>(
    me?.visibleTrackIds ?? [],
  )
  const following = !isHost && (me?.following ?? true)

  const updateMe = (patch: Partial<MemberView>) =>
    void setMemberView({
      code,
      capo,
      following: me?.following ?? true,
      visibleTrackIds: visible,
      personalVersionId: me?.personalVersionId,
      ...patch,
    }).catch(fail)

  const versionId = personalId ?? room.versionId

  const bundle = useQuery({
    ...convexQuery(api.versions.getBundle, versionId ? { versionId } : 'skip'),
    enabled: Boolean(versionId),
    retry: false,
  })
  const setlist = useQuery({
    ...convexQuery(
      api.setlists.get,
      room.setlistId ? { setlistId: room.setlistId } : 'skip',
    ),
    enabled: Boolean(room.setlistId),
  })

  const timeline = (bundle.data?.timeline ?? []) as Array<SheetEntry>
  const tracks = bundle.data?.version.tracks
  const { layers, available } = useSheetLayers(
    prefs.layers,
    timeline,
    tracks,
    visible,
  )
  const passes = sheetPasses(timeline)
  const entryIds = passes.map((item) => item.id)
  const entryKey = entryIds.join(',')
  const { active, move } = useSectionCursor(entryIds, prefs.layout)
  const hostEntryId = entryIds.at(
    Math.min(room.timelineIndex, entryIds.length - 1),
  )
  useSectionKeys(entryIds, active, move)

  const moveRef = useRef(move)
  moveRef.current = move
  useEffect(() => {
    if (following && hostEntryId) moveRef.current(hostEntryId)
  }, [following, hostEntryId])

  useEffect(() => {
    if (!isHost || !active) return
    const index = entryKey.split(',').indexOf(active)
    if (index < 0 || index === room.timelineIndex) return
    const timer = window.setTimeout(
      () => void setTransport({ code, timelineIndex: index }).catch(fail),
      350,
    )
    return () => window.clearTimeout(timer)
  }, [isHost, active, entryKey, room.timelineIndex, code, setTransport])

  const setlistEntries = setlist.data?.entries ?? []
  const upNext = room.setlistId
    ? setlistEntries.at(room.setlistIndex + 1)
    : undefined
  const activeIndex = active ? entryIds.indexOf(active) : -1
  const step = (direction: -1 | 1) => {
    const target = entryIds.at(
      Math.min(entryIds.length - 1, Math.max(0, activeIndex + direction)),
    )
    if (target) move(target)
  }

  const sheet = bundle.data ? (
    <SongSheet
      version={bundle.data.version}
      song={bundle.data.song}
      timeline={timeline}
      shapes={bundle.data.shapes}
      settings={{
        capo,
        transpose: room.concertTranspose,
        notation,
        layers,
        scale: prefs.scale,
      }}
      visibleTrackIds={visible}
      highlightEntryId={following ? hostEntryId : active}
      layout={prefs.layout}
      versionId={bundle.data.version._id}
      canEdit={bundle.data.canEdit}
    />
  ) : null

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Suspense fallback={null}>
        <JamPersonalSync
          roomVersionId={room.versionId}
          personalVersionId={me?.personalVersionId}
          onPersonal={setPersonalId}
        />
      </Suspense>
      <header className="sticky top-0 z-30 border-b bg-background/85 backdrop-blur-xl">
        <div className="mx-auto flex max-w-5xl items-center gap-2 px-3 py-2 sm:gap-3">
          <ButtonLink
            variant="ghost"
            size="icon"
            aria-label={m.back()}
            to="/jam"
          >
            <ArrowLeftIcon />
          </ButtonLink>
          <div className="min-w-0 flex-1">
            <div className="truncate font-semibold">
              {bundle.data?.song.title ?? m.jam()}
            </div>
            <div className="flex items-center gap-1.5 truncate text-xs text-muted-foreground">
              {bundle.data ? (
                <>
                  <span className="truncate">
                    {bundle.data.version.artist} · {bundle.data.version.name}
                  </span>
                  <Suspense fallback={null}>
                    <JamYourVersion
                      roomVersionId={room.versionId}
                      personalVersionId={me?.personalVersionId}
                    />
                  </Suspense>
                </>
              ) : isHost ? (
                m.jamPickSong()
              ) : (
                m.jamWaiting()
              )}
            </div>
          </div>
          <button
            type="button"
            aria-label={m.copyCode()}
            onClick={() =>
              void navigator.clipboard
                .writeText(room.code)
                .then(() => toast.success(m.codeCopied()))
            }
            className="hidden items-center gap-2 rounded-xl border bg-card px-3 py-1.5 transition-colors outline-none hover:border-primary/40 focus-visible:ring-2 focus-visible:ring-ring sm:flex"
          >
            <span className="text-[0.65rem] font-semibold tracking-widest text-muted-foreground uppercase">
              {m.code()}
            </span>
            <span className="font-mono text-base font-semibold tracking-[0.2em] text-primary">
              {room.code}
            </span>
            <CopyIcon className="size-3.5 text-muted-foreground" />
          </button>
          <AvatarGroup className="hidden md:flex">
            {members.slice(0, 4).map((member) => (
              <Avatar key={member._id} size="sm" title={member.name}>
                <AvatarFallback
                  className={
                    member.userId === room.hostUserId
                      ? 'bg-primary text-[0.6rem] font-semibold text-primary-foreground'
                      : 'bg-muted text-[0.6rem] font-semibold'
                  }
                >
                  {initials(member.name)}
                </AvatarFallback>
              </Avatar>
            ))}
            {members.length > 4 ? (
              <AvatarGroupCount className="size-6 text-[0.6rem]">
                +{members.length - 4}
              </AvatarGroupCount>
            ) : null}
          </AvatarGroup>
          {isHost ? (
            <Chip tone="primary">
              <CrownIcon className="size-3" />
              {m.host()}
            </Chip>
          ) : (
            <Switch
              isSelected={following}
              onChange={(next) => updateMe({ following: next })}
              className="gap-2 text-sm"
            >
              <span className="hidden sm:inline">{m.followHost()}</span>
            </Switch>
          )}
        </div>
        {timeline.length > 0 ? (
          <div className="mx-auto max-w-5xl px-3 pb-2">
            <SectionNav
              passes={passes}
              activeEntryId={(following ? hostEntryId : active) ?? null}
              onJump={move}
            />
          </div>
        ) : null}
      </header>

      <Suspense fallback={null}>
        <JamOthersNotice
          versionId={room.versionId}
          meId={me?.userId}
          members={members}
        />
      </Suspense>

      <main className="mx-auto max-w-5xl px-5 pt-6 pb-[70vh] sm:px-8">
        {!room.versionId ? (
          <EmptyState
            icon={MusicIcon}
            title={isHost ? m.jamPickSong() : m.jamWaiting()}
            description={isHost ? m.jamPickSongHint() : m.jamWaitingHint()}
            action={
              isHost ? (
                <Suspense fallback={<Skeleton className="h-9 w-72" />}>
                  <JamSongCombo
                    code={code}
                    value={null}
                    notation={notation}
                    placeholder={m.searchSongs()}
                    className="w-72"
                  />
                </Suspense>
              ) : undefined
            }
          />
        ) : bundle.isError ? (
          <EmptyState
            icon={LockIcon}
            title={m.jamNoAccess()}
            description={m.jamNoAccessHint()}
          />
        ) : sheet ? (
          sheet
        ) : (
          <div className="space-y-6">
            <Skeleton className="h-10 w-2/3" />
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-64 w-full" />
          </div>
        )}
        {isHost && upNext ? (
          <button
            type="button"
            onClick={() => void advance({ code }).catch(fail)}
            className="mt-12 flex w-full items-center justify-between gap-4 rounded-2xl border bg-card p-5 text-left transition-colors hover:border-primary/50"
          >
            <span>
              <span className="block text-xs font-semibold tracking-widest text-primary uppercase">
                {m.upNext()}
              </span>
              <span className="mt-1 block text-lg font-semibold">
                {upNext.song.title}
              </span>
            </span>
            <SkipForwardIcon className="size-5 text-muted-foreground" />
          </button>
        ) : null}
      </main>

      <StageDock>
        {isHost ? (
          <>
            <Suspense
              fallback={<Skeleton className="h-9 w-44 shrink-0 sm:w-56" />}
            >
              <JamSongCombo
                code={code}
                value={room.versionId ?? null}
                notation={notation}
                placeholder={m.chooseSong()}
                className="w-44 shrink-0 sm:w-56"
              />
            </Suspense>
            <div className="flex shrink-0 items-center">
              <Button
                variant="ghost"
                size="icon"
                aria-label={m.previousSection()}
                isDisabled={activeIndex <= 0}
                onPress={() => step(-1)}
              >
                <ChevronUpIcon />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                aria-label={m.nextSection()}
                isDisabled={activeIndex >= entryIds.length - 1}
                onPress={() => step(1)}
              >
                <ChevronDownIcon />
              </Button>
            </div>
            <DockDivider />
          </>
        ) : null}
        <KeyControls
          capo={capo}
          onCapo={(next) => {
            setCapo(next)
            updateMe({ capo: next })
          }}
          transpose={room.concertTranspose}
          onTranspose={
            isHost
              ? (next) =>
                  void setTransport({ code, concertTranspose: next }).catch(
                    fail,
                  )
              : undefined
          }
          concertKey={bundle.data?.version.concertKey ?? 'C'}
          notation={notation}
        />
        {!isHost && room.concertTranspose !== 0 ? (
          <Chip label={m.transpose()}>
            {room.concertTranspose > 0 ? '+' : ''}
            {room.concertTranspose}
          </Chip>
        ) : null}
        {!isHost && room.versionId ? (
          <Suspense fallback={null}>
            <JamVersionSelect
              roomVersionId={room.versionId}
              personalId={personalId}
              onChange={(next) => updateMe({ personalVersionId: next })}
            />
          </Suspense>
        ) : null}
        {isHost ? (
          <>
            <DockDivider />
            <Suspense fallback={<Skeleton className="h-9 w-40 shrink-0" />}>
              <JamSetlistSelect code={code} value={room.setlistId ?? ''} />
            </Suspense>
            {upNext ? (
              <Button
                variant="secondary"
                onPress={() => void advance({ code }).catch(fail)}
              >
                <SkipForwardIcon />
                <span className="hidden sm:inline">{m.nextSong()}</span>
              </Button>
            ) : null}
          </>
        ) : null}
        <DockDivider />
        <LayerToggles
          layers={layers}
          available={available}
          onLayers={prefs.setLayers}
          iconOnly
        />
        {passes.length > timeline.length ? (
          <LayoutToggle layout={prefs.layout} onLayout={prefs.setLayout} />
        ) : null}
        <TextSizeControl scale={prefs.scale} onScale={prefs.setScale} />
        <TracksFilter
          timeline={timeline}
          tracks={tracks}
          visibleTrackIds={visible}
          onVisibleTrackIds={(ids) => {
            setVisible(ids)
            updateMe({ visibleTrackIds: ids })
          }}
          iconOnly
        />
      </StageDock>
    </div>
  )
}

function useCatalog() {
  return useLiveQuery(convexQuery(api.songs.catalog, {})).data
}

type Catalog = ReturnType<typeof useCatalog>

function findSong(catalog: Catalog, versionId: string | undefined) {
  if (!versionId) return
  return catalog.find((row) =>
    row.versions.some((version) => version._id === versionId),
  )
}

function personalVersion(
  catalog: Catalog,
  roomVersionId: string | undefined,
  personalVersionId: string | undefined,
) {
  return findSong(catalog, roomVersionId)?.versions.find(
    (version) =>
      version._id === personalVersionId && version._id !== roomVersionId,
  )
}

function JamPersonalSync({
  roomVersionId,
  personalVersionId,
  onPersonal,
}: {
  roomVersionId?: Id<'versions'>
  personalVersionId?: Id<'versions'>
  onPersonal: (id: Id<'versions'> | undefined) => void
}) {
  const personal = personalVersion(
    useCatalog(),
    roomVersionId,
    personalVersionId,
  )
  useEffect(() => {
    onPersonal(personal?._id)
  }, [onPersonal, personal?._id])
  return null
}

function JamYourVersion({
  roomVersionId,
  personalVersionId,
}: {
  roomVersionId?: Id<'versions'>
  personalVersionId?: Id<'versions'>
}) {
  const personal = personalVersion(
    useCatalog(),
    roomVersionId,
    personalVersionId,
  )
  if (!personal) return null
  return <span className="shrink-0 text-primary">· {m.yourVersion()}</span>
}

function JamOthersNotice({
  versionId,
  meId,
  members,
}: {
  versionId?: Id<'versions'>
  meId?: string
  members: Array<{
    userId: string
    name: string
    personalVersionId?: Id<'versions'>
  }>
}) {
  const song = findSong(useCatalog(), versionId)
  const names = members
    .filter(
      (member) =>
        member.userId !== meId &&
        member.personalVersionId &&
        member.personalVersionId !== versionId &&
        song?.versions.some(
          (version) => version._id === member.personalVersionId,
        ),
    )
    .map((member) => member.name)
  if (names.length === 0) return null
  return (
    <div className="mx-auto max-w-5xl px-5 pt-4 sm:px-8">
      <p className="flex items-center gap-2 rounded-xl border border-primary/20 bg-primary/5 px-3 py-2 text-sm text-foreground/80">
        <InfoIcon className="size-4 shrink-0 text-primary" />
        {m.personalVersionWarning({ name: names.join(', ') })}
      </p>
    </div>
  )
}

function JamSongCombo({
  code,
  value,
  notation,
  placeholder,
  className,
}: {
  code: string
  value: string | null
  notation: Notation
  placeholder: string
  className?: string
}) {
  const catalog = useCatalog()
  const setVersion = useMutation(api.jam.setVersion)
  return (
    <ComboBox
      aria-label={m.chooseSong()}
      placeholder={placeholder}
      emptyText={m.noMatches()}
      value={value}
      options={catalog.flatMap((row) =>
        row.versions.map((version) => ({
          id: version._id,
          label: row.song.title,
          description: `${row.versions.length > 1 ? `${version.name} · ` : ''}${displayChord(version.concertKey, 0, 0, notation)}`,
        })),
      )}
      className={className}
      onChange={(next) => {
        if (next && next !== value)
          void setVersion({
            code,
            versionId: next as Id<'versions'>,
          }).catch(fail)
      }}
    />
  )
}

function JamVersionSelect({
  roomVersionId,
  personalId,
  onChange,
}: {
  roomVersionId: Id<'versions'>
  personalId?: Id<'versions'>
  onChange: (id: Id<'versions'> | undefined) => void
}) {
  const song = findSong(useCatalog(), roomVersionId)
  if (!song || song.versions.length < 2) return null
  return (
    <Select
      aria-label={m.yourVersion()}
      value={personalId ?? 'room'}
      className="w-40 shrink-0"
      options={[
        { id: 'room', label: m.roomVersion() },
        ...song.versions
          .filter((version) => version._id !== roomVersionId)
          .map((version) => ({ id: version._id, label: version.name })),
      ]}
      onChange={(next) =>
        onChange(next === 'room' ? undefined : (next as Id<'versions'>))
      }
    />
  )
}

function JamSetlistSelect({ code, value }: { code: string; value: string }) {
  const setlists = useLiveQuery(convexQuery(api.setlists.list, {})).data
  const attach = useMutation(api.jam.attachSetlist)
  return (
    <Select
      aria-label={m.setlists()}
      value={value}
      placeholder={m.attachSetlist()}
      className="w-40 shrink-0"
      options={setlists.map((item) => ({
        id: item._id,
        label: item.name,
        description: m.songCount({ count: String(item.count) }),
      }))}
      onChange={(next) => {
        if (next && next !== value)
          void attach({ code, setlistId: next as Id<'setlists'> }).catch(fail)
      }}
    />
  )
}
