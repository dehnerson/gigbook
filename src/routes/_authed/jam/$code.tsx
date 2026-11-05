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
import { useEffect, useState } from 'react'
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
  DisplayModeToggle,
  KeyControls,
  PartsFilter,
  TextSizeControl,
} from '@/components/sheet/sheet-controls'
import {
  scrollToEntry,
  SectionNav,
  SongSheet,
  useActiveEntry,
} from '@/components/sheet/song-sheet'
import type { SheetEntry } from '@/components/sheet/types'
import { useSheetPrefs } from '@/components/sheet/use-sheet-prefs'
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
import { loadQuery } from '@/lib/load'
import { displayChord } from '@/lib/music/chords'
import { m } from '@/paraglide/messages'

export const Route = createFileRoute('/_authed/jam/$code')({
  loader: async ({ context, params }) => {
    await Promise.all([
      loadQuery(
        context.queryClient,
        convexQuery(api.jam.get, { code: params.code }),
      ),
      loadQuery(context.queryClient, convexQuery(api.songs.catalog, {})),
      loadQuery(context.queryClient, convexQuery(api.setlists.list, {})),
    ])
  },
  component: JamRoomPage,
})

type MemberView = {
  capo: number
  following: boolean
  visiblePartIds: Array<string>
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
  const catalog = useLiveQuery(convexQuery(api.songs.catalog, {})).data
  const setlists = useLiveQuery(convexQuery(api.setlists.list, {})).data
  const setVersion = useMutation(api.jam.setVersion)
  const setTransport = useMutation(api.jam.setTransport)
  const advance = useMutation(api.jam.advanceSetlist)
  const attach = useMutation(api.jam.attachSetlist)
  const setMemberView = useMutation(api.jam.setMemberView)
  const notation = useNotation()
  const prefs = useSheetPrefs('jam', 1.15)
  useForceDark()
  useWakeLock(true)

  const isHost = me?.userId === room.hostUserId
  const [capo, setCapo] = useState(me?.capo ?? 0)
  const [visible, setVisible] = useState<Array<string>>(
    me?.visiblePartIds ?? [],
  )
  const following = !isHost && (me?.following ?? true)

  const updateMe = (patch: Partial<MemberView>) =>
    void setMemberView({
      code,
      capo,
      following: me?.following ?? true,
      visiblePartIds: visible,
      personalVersionId: me?.personalVersionId,
      ...patch,
    }).catch(fail)

  const roomSong = room.versionId
    ? catalog.find((row) =>
        row.versions.some((version) => version._id === room.versionId),
      )
    : undefined
  const personal = roomSong?.versions.find(
    (version) =>
      version._id === me?.personalVersionId && version._id !== room.versionId,
  )
  const versionId = personal?._id ?? room.versionId

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
  const entryIds = timeline.map((entry) => entry.entryId)
  const entryKey = entryIds.join(',')
  const active = useActiveEntry(entryIds)
  const hostEntryId = entryIds.at(
    Math.min(room.timelineIndex, entryIds.length - 1),
  )
  useSectionKeys(entryIds, active)

  useEffect(() => {
    if (following && hostEntryId) scrollToEntry(hostEntryId)
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

  const others = members.filter(
    (member) =>
      member.userId !== me?.userId &&
      member.personalVersionId &&
      member.personalVersionId !== room.versionId &&
      roomSong?.versions.some(
        (version) => version._id === member.personalVersionId,
      ),
  )
  const setlistEntries = setlist.data?.entries ?? []
  const upNext = room.setlistId
    ? setlistEntries.at(room.setlistIndex + 1)
    : undefined
  const activeIndex = active ? entryIds.indexOf(active) : -1
  const step = (direction: -1 | 1) => {
    const target = entryIds.at(
      Math.min(entryIds.length - 1, Math.max(0, activeIndex + direction)),
    )
    if (target) scrollToEntry(target)
  }

  const songOptions = catalog.flatMap((row) =>
    row.versions.map((version) => ({
      id: version._id,
      label: row.song.title,
      description: `${row.versions.length > 1 ? `${version.name} · ` : ''}${displayChord(version.concertKey, 0, 0, notation)}`,
    })),
  )

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
        mode: prefs.mode,
        scale: prefs.scale,
      }}
      visiblePartIds={visible}
      highlightEntryId={following ? hostEntryId : active}
    />
  ) : null

  return (
    <div className="min-h-screen bg-background text-foreground">
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
                    {bundle.data.song.artist} · {bundle.data.version.name}
                  </span>
                  {personal ? (
                    <span className="shrink-0 text-primary">
                      · {m.yourVersion()}
                    </span>
                  ) : null}
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
              timeline={timeline}
              activeEntryId={(following ? hostEntryId : active) ?? null}
              onJump={(entryId) => scrollToEntry(entryId)}
            />
          </div>
        ) : null}
      </header>

      {others.length > 0 ? (
        <div className="mx-auto max-w-5xl px-5 pt-4 sm:px-8">
          <p className="flex items-center gap-2 rounded-xl border border-primary/20 bg-primary/5 px-3 py-2 text-sm text-foreground/80">
            <InfoIcon className="size-4 shrink-0 text-primary" />
            {m.personalVersionWarning({
              name: others.map((member) => member.name).join(', '),
            })}
          </p>
        </div>
      ) : null}

      <main className="mx-auto max-w-5xl px-5 pt-6 pb-48 sm:px-8">
        {!room.versionId ? (
          <EmptyState
            icon={MusicIcon}
            title={isHost ? m.jamPickSong() : m.jamWaiting()}
            description={isHost ? m.jamPickSongHint() : m.jamWaitingHint()}
            action={
              isHost ? (
                <ComboBox
                  aria-label={m.chooseSong()}
                  placeholder={m.searchSongs()}
                  emptyText={m.noMatches()}
                  value={null}
                  options={songOptions}
                  className="w-72"
                  onChange={(next) => {
                    if (next)
                      void setVersion({
                        code,
                        versionId: next as Id<'versions'>,
                      }).catch(fail)
                  }}
                />
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
            <ComboBox
              aria-label={m.chooseSong()}
              placeholder={m.chooseSong()}
              emptyText={m.noMatches()}
              value={room.versionId ?? null}
              options={songOptions}
              className="w-44 shrink-0 sm:w-56"
              onChange={(next) => {
                if (next && next !== room.versionId)
                  void setVersion({
                    code,
                    versionId: next as Id<'versions'>,
                  }).catch(fail)
              }}
            />
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
        {!isHost && roomSong && roomSong.versions.length > 1 ? (
          <Select
            aria-label={m.yourVersion()}
            value={personal?._id ?? 'room'}
            className="w-40 shrink-0"
            options={[
              { id: 'room', label: m.roomVersion() },
              ...roomSong.versions
                .filter((version) => version._id !== room.versionId)
                .map((version) => ({ id: version._id, label: version.name })),
            ]}
            onChange={(next) =>
              updateMe({
                personalVersionId:
                  next === 'room' ? undefined : (next as Id<'versions'>),
              })
            }
          />
        ) : null}
        {isHost ? (
          <>
            <DockDivider />
            <Select
              aria-label={m.setlists()}
              value={room.setlistId ?? ''}
              placeholder={m.attachSetlist()}
              className="w-40 shrink-0"
              options={setlists.map((item) => ({
                id: item._id,
                label: item.name,
                description: m.songCount({ count: String(item.count) }),
              }))}
              onChange={(next) => {
                if (next && next !== room.setlistId)
                  void attach({
                    code,
                    setlistId: next as Id<'setlists'>,
                  }).catch(fail)
              }}
            />
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
        <DisplayModeToggle mode={prefs.mode} onMode={prefs.setMode} iconOnly />
        <TextSizeControl scale={prefs.scale} onScale={prefs.setScale} />
        {timeline.length > 0 ? (
          <PartsFilter
            timeline={timeline}
            visiblePartIds={visible}
            onVisiblePartIds={(ids) => {
              setVisible(ids)
              updateMe({ visiblePartIds: ids })
            }}
          />
        ) : null}
      </StageDock>
    </div>
  )
}
