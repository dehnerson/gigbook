import {
  ArrowDownIcon,
  ArrowUpIcon,
  EllipsisIcon,
  GuitarIcon,
  RepeatIcon,
  Trash2Icon,
  UnlinkIcon,
} from 'lucide-react'
import { useState } from 'react'
import { ConfirmDialog } from '@/components/app/confirm-dialog'
import { useDebounced } from '@/components/app/save'
import { Stepper } from '@/components/app/stepper'
import { partName } from '@/components/sheet/parts'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import type { Notation } from '@/lib/music/pitch'
import type { VersionShape } from '@/lib/music/shapes'
import { allParts, GUITAR_PART_ID, partTuning } from '@/lib/parts'
import type { Instrument } from '@/lib/parts'
import { m } from '@/paraglide/messages'
import { ChartEditor, textareaClass } from './chart-editor'
import { TabEditor } from './tab-editor'
import type { EditorEntry, EditorLine, EditorVersion } from './types'
import { useEditor } from './use-editor'

function LineCard({
  line,
  version,
  notation,
  shapes,
}: {
  line: EditorLine
  version: EditorVersion
  notation: Notation
  shapes: Array<VersionShape>
}) {
  const { mutations, save } = useEditor()
  const [confirm, setConfirm] = useState(false)
  const part = allParts(version.parts).find((item) => item.id === line.partId)
  const tuning = part ? partTuning(part, version.tuning) : version.tuning
  const isEmpty = (line.measures?.length ?? 0) === 0

  return (
    <div className="rounded-2xl border bg-card">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2 border-b px-4 py-2.5">
        <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary">
          <GuitarIcon className="size-4" />
        </span>
        <div className="min-w-0 flex-1">
          <div className="text-[0.65rem] font-semibold tracking-widest text-muted-foreground uppercase">
            {m.tabPart()}
          </div>
          <div className="text-sm font-medium">
            {part ? partName(part) : line.partId}
          </div>
        </div>
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label={m.removeLine()}
          onPress={() => {
            if (isEmpty)
              void save(() => mutations.removeLine({ lineId: line._id }))
            else setConfirm(true)
          }}
        >
          <Trash2Icon />
        </Button>
      </div>
      <div className="p-4">
        <TabEditor
          line={line}
          tuning={tuning}
          timeSignature={version.timeSignature}
          bpm={version.bpm}
          notation={notation}
          shapes={part?.instrument === 'guitar' ? shapes : []}
        />
      </div>
      <ConfirmDialog
        isOpen={confirm}
        onOpenChange={setConfirm}
        title={m.removeLineConfirm()}
        confirmLabel={m.remove()}
        onConfirm={() => mutations.removeLine({ lineId: line._id })}
      />
    </div>
  )
}

function AddLine({
  entry,
  version,
}: {
  entry: EditorEntry
  version: EditorVersion
}) {
  const { mutations, save } = useEditor()
  const [name, setName] = useState('')
  const [instrument, setInstrument] = useState<Instrument>('guitar')
  const guitarTaken = entry.lines.some((line) => line.partId === GUITAR_PART_ID)
  const missing = allParts(version.parts).filter(
    (part) => !entry.lines.some((line) => line.partId === part.id),
  )

  const addFor = (partId?: string) =>
    void save(() => mutations.addLine({ sectionId: entry.section._id, partId }))

  const addNamed = () => {
    const trimmed = name.trim()
    if (instrument === 'guitar' && !trimmed && !guitarTaken) {
      addFor(undefined)
      return
    }
    void save(async () => {
      const partId = await mutations.addPart({
        versionId: version._id,
        instrument,
        name: trimmed || undefined,
      })
      await mutations.addLine({ sectionId: entry.section._id, partId })
    })
    setName('')
  }

  return (
    <div className="space-y-3">
      {!guitarTaken ? (
        <button
          type="button"
          onClick={() => addFor(undefined)}
          className="flex w-full items-center gap-3 rounded-2xl border border-dashed p-4 text-left transition-colors hover:border-primary/50 hover:bg-primary/5"
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
      ) : null}
      {missing
        .filter((part) => part.id !== GUITAR_PART_ID)
        .map((part) => (
          <button
            key={part.id}
            type="button"
            onClick={() => addFor(part.id)}
            className="flex w-full items-center gap-3 rounded-2xl border border-dashed p-4 text-left transition-colors hover:border-primary/50 hover:bg-primary/5"
          >
            <span className="grid size-10 place-items-center rounded-xl bg-primary/10 text-primary">
              <GuitarIcon className="size-5" />
            </span>
            <span className="font-medium">
              {m.addPartTab({ name: partName(part) })}
            </span>
          </button>
        ))}
      {guitarTaken ? (
        <form
          className="flex flex-wrap items-center gap-2 rounded-2xl border border-dashed p-4"
          onSubmit={(event) => {
            event.preventDefault()
            addNamed()
          }}
        >
          <Select
            aria-label={m.instrument()}
            value={instrument}
            className="w-36"
            options={[
              { id: 'guitar', label: m.partGuitar() },
              { id: 'bass', label: m.partBass() },
            ]}
            onChange={(id) => setInstrument(id as Instrument)}
          />
          <Input
            value={name}
            aria-label={m.partName()}
            placeholder={m.newPartPlaceholder()}
            maxLength={60}
            onChange={(event) => setName(event.target.value)}
            className="w-48"
          />
          <Button
            type="submit"
            variant="outline"
            isDisabled={instrument === 'guitar' && !name.trim()}
          >
            {m.addTab()}
          </Button>
        </form>
      ) : null}
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

      <div className="space-y-2">
        <h3 className="text-sm font-medium">{m.lyricsAndChords()}</h3>
        <ChartEditor
          key={entry.section._id}
          sectionId={entry.section._id}
          chartBody={entry.section.chartBody}
          strumming={entry.section.strumming}
          palette={palette}
          notation={notation}
          timeSignature={version.timeSignature}
        />
      </div>

      <div className="space-y-4">
        {entry.lines.map((line) => (
          <LineCard
            key={line._id}
            line={line}
            version={version}
            notation={notation}
            shapes={shapes}
          />
        ))}
        <AddLine entry={entry} version={version} />
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
