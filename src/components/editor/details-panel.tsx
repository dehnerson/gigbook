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
import { TUNING_PRESETS } from '@/lib/music/diagrams'
import { keyOptions, TIME_SIGNATURES } from '@/lib/music/keys'
import type { Notation } from '@/lib/music/pitch'
import { m } from '@/paraglide/messages'
import type { EditorVersion } from './types'
import { useEditor } from './use-editor'

function presetName(id: string) {
  if (id === 'standard') return m.tuningStandard()
  if (id === 'dropD') return m.tuningDropD()
  if (id === 'halfDown') return m.tuningHalfDown()
  if (id === 'dadgad') return 'DADGAD'
  if (id === 'openG') return m.tuningOpenG()
  return m.tuningCustom()
}

export function DetailsPanel({
  version,
  songArtist,
  notation,
}: {
  version: EditorVersion
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
