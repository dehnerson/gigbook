import { useNavigate } from '@tanstack/react-router'
import { MinusIcon, PlusIcon, Trash2Icon } from 'lucide-react'
import { useState } from 'react'
import { ConfirmDialog } from '@/components/app/confirm-dialog'
import { Field } from '@/components/app/field'
import { useDebounced } from '@/components/app/save'
import { Stepper } from '@/components/app/stepper'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { trackName } from '@/components/sheet/tracks'
import { TUNING_PRESETS } from '@/lib/music/diagrams'
import { keyOptions, TIME_SIGNATURES } from '@/lib/music/keys'
import type { Notation } from '@/lib/music/pitch'
import { allTracks, trackOf } from '@/lib/tracks'
import type { Track } from '@/lib/tracks'
import { m } from '@/paraglide/messages'
import type { Id } from '../../../convex/_generated/dataModel'
import type { EditorEntry, EditorVersion } from './types'
import { useEditor } from './use-editor'

function presetName(id: string) {
  if (id === 'standard') return m.tuningStandard()
  if (id === 'dropD') return m.tuningDropD()
  if (id === 'halfDown') return m.tuningHalfDown()
  if (id === 'dadgad') return 'DADGAD'
  if (id === 'openG') return m.tuningOpenG()
  return m.tuningCustom()
}

function TrackRow({
  track,
  count,
  versionId,
}: {
  track: Track
  count: number
  versionId: Id<'versions'>
}) {
  const { mutations, save } = useEditor()
  const [name, setName] = useState(track.name ?? '')
  const commit = () => {
    const trimmed = name.trim()
    if (trimmed === (track.name ?? '')) return
    if (!trimmed) {
      if (track.builtIn)
        void save(() => mutations.removeTrack({ versionId, trackId: track.id }))
      else setName(track.name ?? '')
      return
    }
    void save(() =>
      mutations.renameTrack({ versionId, trackId: track.id, name: trimmed }),
    )
  }
  return (
    <li className="flex items-center gap-2">
      <Input
        value={name}
        aria-label={m.trackName()}
        placeholder={
          track.builtIn ? trackName({ ...track, name: undefined }) : undefined
        }
        maxLength={60}
        onChange={(event) => setName(event.target.value)}
        onBlur={commit}
        onKeyDown={(event) => {
          if (event.key === 'Enter') event.currentTarget.blur()
        }}
      />
      <span className="w-20 shrink-0 text-right text-xs text-muted-foreground tabular-nums">
        {m.partCount({ count: String(count) })}
      </span>
      {track.builtIn ? (
        <span className="size-9 shrink-0" />
      ) : (
        <Button
          variant="ghost"
          size="icon"
          aria-label={m.removeTrack()}
          onPress={() =>
            void save(() =>
              mutations.removeTrack({ versionId, trackId: track.id }),
            )
          }
        >
          <Trash2Icon />
        </Button>
      )}
    </li>
  )
}

function TracksCard({
  version,
  timeline,
}: {
  version: EditorVersion
  timeline: Array<EditorEntry>
}) {
  const { mutations, save } = useEditor()
  const [name, setName] = useState('')
  const parts = [
    ...new Map(
      timeline.flatMap((entry) => entry.parts).map((part) => [part._id, part]),
    ).values(),
  ]
  const add = () => {
    if (!name.trim()) return
    void save(() => mutations.addTrack({ versionId: version._id, name }))
    setName('')
  }
  return (
    <div className="space-y-4 rounded-2xl border bg-card p-5">
      <div>
        <div className="font-medium">{m.tracks()}</div>
        <p className="text-sm text-muted-foreground">{m.tracksHint()}</p>
      </div>
      <ul className="space-y-2">
        {allTracks(version.tracks).map((track) => (
          <TrackRow
            key={`${track.id}:${track.name ?? ''}`}
            track={track}
            count={
              parts.filter((part) => trackOf(part, version.tracks) === track.id)
                .length
            }
            versionId={version._id}
          />
        ))}
      </ul>
      <form
        className="flex items-center gap-2"
        onSubmit={(event) => {
          event.preventDefault()
          add()
        }}
      >
        <Input
          value={name}
          aria-label={m.newTrackName()}
          placeholder={m.newTrackPlaceholder()}
          maxLength={60}
          onChange={(event) => setName(event.target.value)}
        />
        <Button type="submit" variant="outline" isDisabled={!name.trim()}>
          <PlusIcon />
          {m.addTrack()}
        </Button>
      </form>
    </div>
  )
}

export function DetailsPanel({
  version,
  timeline,
  songArtist,
  notation,
}: {
  version: EditorVersion
  timeline: Array<EditorEntry>
  songArtist: string
  notation: Notation
}) {
  const { mutations, save } = useEditor()
  const navigate = useNavigate()
  const [name, setName] = useState(version.name)
  const [artist, setArtist] = useState(version.artist ?? '')
  const [bpm, setBpm] = useState(version.bpm ? String(version.bpm) : '')
  const [tuningText, setTuningText] = useState(version.tuning.join(' '))
  const preset =
    TUNING_PRESETS.find(
      (item) => item.tuning.join(' ') === version.tuning.join(' '),
    )?.id ?? 'custom'
  const [tuningMode, setTuningMode] = useState(preset)
  const [confirmDelete, setConfirmDelete] = useState(false)

  const patch = (values: Partial<Omit<EditorVersion, '_id' | 'songId'>>) =>
    void save(() => mutations.updateMeta({ versionId: version._id, ...values }))
  const saveName = useDebounced((value: string) => {
    if (value.trim()) patch({ name: value.trim() })
  })
  const saveArtist = useDebounced((value: string) => patch({ artist: value }))
  const saveBpm = useDebounced((value: string) => {
    const parsed = Number(value)
    if (parsed >= 20 && parsed <= 400) patch({ bpm: Math.round(parsed) })
  })
  const saveTuning = useDebounced((value: string) => {
    const tuning = value.split(/\s+/).filter(Boolean)
    if (tuning.length >= 4 && tuning.length <= 8) patch({ tuning })
  })

  const setBpmValue = (value: string) => {
    setBpm(value)
    saveBpm.call(value)
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold">{m.versionDetails()}</h2>
        <p className="text-sm text-muted-foreground">
          {m.versionDetailsHint()}
        </p>
      </div>
      <div className="grid gap-5 rounded-2xl border bg-card p-5 sm:grid-cols-2">
        <Field label={m.versionName()} className="sm:col-span-2">
          <Input
            value={name}
            onChange={(event) => {
              setName(event.target.value)
              saveName.call(event.target.value)
            }}
          />
        </Field>
        <Field
          label={m.performedBy()}
          hint={m.performedByHint({ artist: songArtist })}
          className="sm:col-span-2"
        >
          <Input
            value={artist}
            placeholder={songArtist}
            onChange={(event) => {
              setArtist(event.target.value)
              saveArtist.call(event.target.value)
            }}
          />
        </Field>
        <Select
          label={m.concertKey()}
          value={version.concertKey}
          options={keyOptions(notation, version.concertKey)}
          onChange={(concertKey) => patch({ concertKey })}
        />
        <Select
          label={m.timeSignature()}
          value={version.timeSignature}
          options={[
            ...new Set([version.timeSignature, ...TIME_SIGNATURES]),
          ].map((id) => ({ id, label: id }))}
          onChange={(timeSignature) => patch({ timeSignature })}
        />
        <Field label={m.bpm()} hint={m.bpmHint()}>
          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="icon"
              aria-label={`${m.bpm()} −`}
              onPress={() =>
                setBpmValue(String(Math.max(20, (Number(bpm) || 100) - 1)))
              }
            >
              <MinusIcon />
            </Button>
            <Input
              type="number"
              inputMode="numeric"
              min={20}
              max={400}
              value={bpm}
              placeholder="—"
              className="text-center font-mono"
              onChange={(event) => setBpmValue(event.target.value)}
            />
            <Button
              variant="outline"
              size="icon"
              aria-label={`${m.bpm()} +`}
              onPress={() =>
                setBpmValue(String(Math.min(400, (Number(bpm) || 100) + 1)))
              }
            >
              <PlusIcon />
            </Button>
          </div>
        </Field>
        <Field label={m.suggestedCapoLabel()} hint={m.suggestedCapoHint()}>
          <Stepper
            label={m.capo()}
            value={version.suggestedCapo}
            min={0}
            max={12}
            onChange={(suggestedCapo) => patch({ suggestedCapo })}
            className="w-fit"
          />
        </Field>
        <Select
          label={m.tuning()}
          value={tuningMode}
          className="sm:col-span-2"
          options={[
            ...TUNING_PRESETS.map((item) => ({
              id: item.id,
              label: presetName(item.id),
              description: item.tuning
                .map((note) => note.replace(/\d+$/, ''))
                .join(' '),
            })),
            { id: 'custom', label: m.tuningCustom() },
          ]}
          onChange={(id) => {
            setTuningMode(id)
            const found = TUNING_PRESETS.find((item) => item.id === id)
            if (found) {
              setTuningText(found.tuning.join(' '))
              patch({ tuning: found.tuning })
            }
          }}
        />
        {tuningMode === 'custom' ? (
          <Field
            label={m.tuningCustom()}
            hint={m.tuningHint()}
            className="sm:col-span-2"
          >
            <Input
              value={tuningText}
              className="font-mono"
              onChange={(event) => {
                setTuningText(event.target.value)
                saveTuning.call(event.target.value)
              }}
            />
          </Field>
        ) : null}
      </div>

      <TracksCard version={version} timeline={timeline} />

      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-destructive/30 bg-destructive/5 p-5">
        <div>
          <div className="font-medium">{m.deleteVersion()}</div>
          <p className="text-sm text-muted-foreground">
            {m.deleteVersionHint()}
          </p>
        </div>
        <Button variant="destructive" onPress={() => setConfirmDelete(true)}>
          <Trash2Icon />
          {m.deleteVersion()}
        </Button>
      </div>
      <ConfirmDialog
        isOpen={confirmDelete}
        onOpenChange={setConfirmDelete}
        title={m.deleteVersionConfirm({ name: version.name })}
        description={m.deleteVersionHint()}
        onConfirm={async () => {
          await mutations.removeVersion({ versionId: version._id })
          await navigate({
            to: '/songs/$songId',
            params: { songId: version.songId },
          })
        }}
      />
    </div>
  )
}
