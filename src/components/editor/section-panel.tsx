import {
  ArrowDownIcon,
  ArrowUpIcon,
  EllipsisIcon,
  FileMusicIcon,
  GuitarIcon,
  RepeatIcon,
  Trash2Icon,
  UnlinkIcon,
} from 'lucide-react'
import { useRef, useState } from 'react'
import { ConfirmDialog } from '@/components/app/confirm-dialog'
import { useDebounced } from '@/components/app/save'
import { Stepper } from '@/components/app/stepper'
import { trackName } from '@/components/sheet/tracks'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Select } from '@/components/ui/select'
import type { Notation } from '@/lib/music/pitch'
import type { VersionShape } from '@/lib/music/shapes'
import { allTracks, trackOf } from '@/lib/tracks'
import { m } from '@/paraglide/messages'
import { ChartEditor, textareaClass } from './chart-editor'
import { TabEditor } from './tab-editor'
import type { EditorEntry, EditorPart, EditorVersion } from './types'
import { useEditor } from './use-editor'

const NEW_TRACK = '__new'

function PartCard({
  part,
  version,
  palette,
  notation,
  shapes,
}: {
  part: EditorPart
  version: EditorVersion
  palette: Array<string>
  notation: Notation
  shapes: Array<VersionShape>
}) {
  const { mutations, save } = useEditor()
  const [label, setLabel] = useState(part.label)
  const [newTrack, setNewTrack] = useState<string | null>(null)
  const [confirm, setConfirm] = useState(false)
  const saveLabel = useDebounced((value: string) => {
    void save(() =>
      mutations.updatePart({ partId: part._id, label: value.trim() }),
    )
  })
  const Icon = part.kind === 'chart' ? FileMusicIcon : GuitarIcon
  const isEmpty =
    part.kind === 'chart'
      ? !part.chartBody?.trim()
      : (part.measures?.length ?? 0) === 0
  const setTrack = (trackId: string) =>
    void save(() => mutations.updatePart({ partId: part._id, trackId }))
  const naming = useRef(false)
  const startTrack = () => {
    naming.current = true
    setNewTrack('')
  }
  const createTrack = (name: string) => {
    if (!naming.current) return
    naming.current = false
    setNewTrack(null)
    if (!name.trim()) return
    void save(async () => {
      const trackId = await mutations.addTrack({
        versionId: version._id,
        name,
      })
      await mutations.updatePart({ partId: part._id, trackId })
    })
  }

  return (
    <div className="rounded-2xl border bg-card">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2 border-b px-4 py-2.5">
        <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary">
          <Icon className="size-4" />
        </span>
        <div className="min-w-0 flex-1">
          <div className="text-[0.65rem] font-semibold tracking-widest text-muted-foreground uppercase">
            {part.kind === 'chart' ? m.lyricsAndChords() : m.tabPart()}
          </div>
          <input
            value={label}
            aria-label={m.partLabel()}
            placeholder={m.partLabelPlaceholder()}
            onChange={(event) => {
              setLabel(event.target.value)
              saveLabel.call(event.target.value)
            }}
            className="w-full bg-transparent text-sm font-medium outline-none placeholder:font-normal placeholder:text-muted-foreground/70"
          />
        </div>
        {newTrack === null ? (
          <Select
            aria-label={m.track()}
            value={trackOf(part, version.tracks)}
            className="w-44"
            triggerClassName="h-8"
            options={[
              ...allTracks(version.tracks).map((track) => ({
                id: track.id,
                label: trackName(track),
              })),
              { id: NEW_TRACK, label: m.newTrack() },
            ]}
            onChange={(id) => {
              if (id === NEW_TRACK) startTrack()
              else setTrack(id)
            }}
          />
        ) : (
          <input
            autoFocus
            value={newTrack}
            aria-label={m.newTrackName()}
            placeholder={m.newTrackName()}
            maxLength={60}
            onChange={(event) => setNewTrack(event.target.value)}
            onBlur={() => createTrack(newTrack)}
            onKeyDown={(event) => {
              if (event.key === 'Enter') createTrack(newTrack)
              if (event.key === 'Escape') {
                naming.current = false
                setNewTrack(null)
              }
            }}
            className="h-8 w-44 rounded-lg border border-input bg-transparent px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
          />
        )}
        <Stepper
          label={m.repeatCount()}
          value={part.repeat ?? 1}
          min={1}
          max={16}
          format={(value) => `×${value}`}
          onChange={(repeat) =>
            void save(() => mutations.updatePart({ partId: part._id, repeat }))
          }
        />
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label={m.removePart()}
          onPress={() => {
            if (isEmpty)
              void save(() => mutations.removePart({ partId: part._id }))
            else setConfirm(true)
          }}
        >
          <Trash2Icon />
        </Button>
      </div>
      <div className="p-4">
        {part.kind === 'chart' ? (
          <ChartEditor
            part={part}
            palette={palette}
            notation={notation}
            timeSignature={version.timeSignature}
          />
        ) : (
          <TabEditor
            part={part}
            tuning={version.tuning}
            timeSignature={version.timeSignature}
            bpm={version.bpm}
            notation={notation}
            shapes={shapes}
          />
        )}
      </div>
      <ConfirmDialog
        isOpen={confirm}
        onOpenChange={setConfirm}
        title={m.removePartConfirm()}
        confirmLabel={m.remove()}
        onConfirm={() => mutations.removePart({ partId: part._id })}
      />
    </div>
  )
}

export function SectionPanel({
  entry,
  timeline,
  version,
  palette,
  notation,
  shapes,
  onSelect,
}: {
  entry: EditorEntry
  timeline: Array<EditorEntry>
  version: EditorVersion
  palette: Array<string>
  notation: Notation
  shapes: Array<VersionShape>
  onSelect: (id: string) => void
}) {
  const { mutations, save } = useEditor()
  const [name, setName] = useState(entry.section.name)
  const [notes, setNotes] = useState(entry.section.notes ?? '')
  const [confirm, setConfirm] = useState(false)
  const uses = timeline.filter((item) => item.sectionId === entry.sectionId)
  const index = timeline.findIndex((item) => item.entryId === entry.entryId)
  const ids = timeline.map((item) => item.entryId)

  const saveName = useDebounced((value: string) => {
    if (value.trim())
      void save(() =>
        mutations.updateSection({
          sectionId: entry.section._id,
          name: value.trim(),
        }),
      )
  })
  const saveNotes = useDebounced((value: string) => {
    void save(() =>
      mutations.updateSection({ sectionId: entry.section._id, notes: value }),
    )
  })

  const move = (direction: -1 | 1) => {
    const target = index + direction
    if (target < 0 || target >= ids.length) return
    const next = [...ids]
    next.splice(index, 1)
    next.splice(target, 0, entry.entryId)
    void save(() =>
      mutations.reorderTimeline({ versionId: version._id, entryIds: next }),
    )
  }

  const removeEntry = () => {
    const neighbours = ids.filter((id) => id !== entry.entryId)
    onSelect(neighbours.at(Math.min(index, neighbours.length - 1)) ?? 'details')
    return mutations.removeEntry({
      versionId: version._id,
      entryId: entry.entryId,
    })
  }

  const addPart = (kind: 'chart' | 'tab') =>
    void save(() => mutations.addPart({ sectionId: entry.section._id, kind }))

  return (
    <div className="space-y-5">
      <div className="flex items-start gap-3">
        <div className="min-w-0 flex-1 space-y-1">
          <div className="text-xs font-semibold tracking-widest text-primary uppercase">
            {m.sectionNumber({ number: String(index + 1) })}
          </div>
          <input
            value={name}
            aria-label={m.sectionName()}
            onChange={(event) => {
              setName(event.target.value)
              saveName.call(event.target.value)
            }}
            className="w-full rounded-lg bg-transparent text-2xl font-semibold tracking-tight outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
          />
        </div>
        <Stepper
          label={m.repeatCount()}
          value={entry.repeat ?? 1}
          min={1}
          max={16}
          format={(value) => `×${value}`}
          onChange={(repeat) =>
            void save(() =>
              mutations.setRepeat({
                versionId: version._id,
                entryId: entry.entryId,
                repeat,
              }),
            )
          }
        />
        <Button
          variant="outline"
          onPress={() =>
            void save(() =>
              mutations.repeatSection({
                versionId: version._id,
                sectionId: entry.section._id,
              }),
            )
          }
        >
          <RepeatIcon />
          <span className="hidden sm:inline">{m.repeat()}</span>
        </Button>
        <DropdownMenuTrigger>
          <Button variant="outline" size="icon" aria-label={m.more()}>
            <EllipsisIcon />
          </Button>
          <DropdownMenu placement="bottom end" className="w-56">
            <DropdownMenuItem
              textValue={m.moveUp()}
              isDisabled={index <= 0}
              onAction={() => move(-1)}
            >
              <ArrowUpIcon />
              {m.moveUp()}
            </DropdownMenuItem>
            <DropdownMenuItem
              textValue={m.moveDown()}
              isDisabled={index >= ids.length - 1}
              onAction={() => move(1)}
            >
              <ArrowDownIcon />
              {m.moveDown()}
            </DropdownMenuItem>
            {uses.length > 1 ? (
              <DropdownMenuItem
                textValue={m.detach()}
                onAction={() =>
                  void save(() =>
                    mutations.detachEntry({
                      versionId: version._id,
                      entryId: entry.entryId,
                    }),
                  )
                }
              >
                <UnlinkIcon />
                {m.detach()}
              </DropdownMenuItem>
            ) : null}
            <DropdownMenuSeparator />
            <DropdownMenuItem
              textValue={m.removeSection()}
              variant="destructive"
              onAction={() => setConfirm(true)}
            >
              <Trash2Icon />
              {m.removeSection()}
            </DropdownMenuItem>
          </DropdownMenu>
        </DropdownMenuTrigger>
      </div>

      {uses.length > 1 ? (
        <div className="flex items-start gap-3 rounded-xl border border-primary/25 bg-primary/8 px-4 py-3 text-sm">
          <RepeatIcon className="mt-0.5 size-4 shrink-0 text-primary" />
          <span>{m.repeatedHint({ count: String(uses.length) })}</span>
        </div>
      ) : null}

      <label className="block space-y-1.5">
        <span className="text-sm font-medium">{m.performanceNotes()}</span>
        <textarea
          value={notes}
          rows={2}
          placeholder={m.notesPlaceholder()}
          onChange={(event) => {
            setNotes(event.target.value)
            saveNotes.call(event.target.value)
          }}
          className={`${textareaClass} font-sans`}
        />
      </label>

      <div className="space-y-4">
        {entry.parts.map((part) => (
          <PartCard
            key={part._id}
            part={part}
            version={version}
            palette={palette}
            notation={notation}
            shapes={shapes}
          />
        ))}
      </div>

      <div className="grid gap-2 sm:grid-cols-2">
        <button
          type="button"
          onClick={() => addPart('chart')}
          className="flex items-center gap-3 rounded-2xl border border-dashed p-4 text-left transition-colors hover:border-primary/50 hover:bg-primary/5"
        >
          <span className="grid size-10 place-items-center rounded-xl bg-primary/10 text-primary">
            <FileMusicIcon className="size-5" />
          </span>
          <span>
            <span className="block font-medium">{m.addLyricsAndChords()}</span>
            <span className="block text-xs text-muted-foreground">
              {m.addLyricsAndChordsHint()}
            </span>
          </span>
        </button>
        <button
          type="button"
          onClick={() => addPart('tab')}
          className="flex items-center gap-3 rounded-2xl border border-dashed p-4 text-left transition-colors hover:border-primary/50 hover:bg-primary/5"
        >
          <span className="grid size-10 place-items-center rounded-xl bg-primary/10 text-primary">
            <GuitarIcon className="size-5" />
          </span>
          <span>
            <span className="block font-medium">{m.addTab()}</span>
            <span className="block text-xs text-muted-foreground">
              {m.addTabHint()}
            </span>
          </span>
        </button>
      </div>

      <ConfirmDialog
        isOpen={confirm}
        onOpenChange={setConfirm}
        title={m.removeSectionConfirm({ name: entry.section.name })}
        description={uses.length > 1 ? m.removeRepeatHint() : undefined}
        confirmLabel={m.remove()}
        onConfirm={removeEntry}
      />
    </div>
  )
}
