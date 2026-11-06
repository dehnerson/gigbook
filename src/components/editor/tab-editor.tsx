import {
  CheckIcon,
  FileTextIcon,
  GuitarIcon,
  KeyboardIcon,
  LightbulbIcon,
  MinusIcon,
  PlusIcon,
  Redo2Icon,
  SquareMinusIcon,
  SquarePlusIcon,
  Undo2Icon,
} from 'lucide-react'
import { useDeferredValue, useRef, useState } from 'react'
import type * as React from 'react'
import { toast } from 'sonner'
import { useDebounced } from '@/components/app/save'
import { Segmented } from '@/components/app/segmented'
import { TabStaff } from '@/components/sheet/tab-staff'
import type { SheetSettings } from '@/components/sheet/types'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Toggle } from '@/components/ui/toggle'
import { stringLabels } from '@/lib/music/diagrams'
import type { Notation } from '@/lib/music/pitch'
import { defaultDiagram } from '@/lib/music/shapes'
import {
  DURATIONS,
  MAX_FRET,
  cleanTabMeasures,
  keepRhythm,
  parseAsciiTab,
  serializeAsciiTab,
} from '@/lib/music/tab'
import type { Duration, TabMeasure, TabTechnique } from '@/lib/music/tab'
import {
  beatAt,
  clampCursor,
  clearNote,
  deleteBar,
  deleteBeat,
  emptyBar,
  insertBar,
  insertBeat,
  moveBeat,
  noteAt,
  placeShape,
  setBend,
  setChord,
  setDuration,
  setFret,
  toggleDot,
  toggleRest,
  toggleTechnique,
} from '@/lib/music/tab-edit'
import type { TabCursor, TabEdit } from '@/lib/music/tab-edit'
import { m } from '@/paraglide/messages'
import { textareaClass } from './chart-editor'
import { LENGTH_LABELS, TabGrid, noteLabel } from './tab-grid'
import type { EditorPart } from './types'
import { useEditor } from './use-editor'

type History = {
  past: Array<TabEdit>
  present: TabEdit
  future: Array<TabEdit>
}

const HISTORY_LIMIT = 100
const DIGIT_WINDOW_MS = 1000

const LENGTH_KEYS: Partial<Record<string, Duration>> = {
  Digit1: 1,
  Digit2: 2,
  Digit3: 4,
  Digit4: 8,
  Digit5: 16,
  Digit6: 32,
}

const LENGTH_NAMES: Record<Duration, () => string> = {
  1: m.lengthWhole,
  2: m.lengthHalf,
  4: m.lengthQuarter,
  8: m.lengthEighth,
  16: m.lengthSixteenth,
  32: m.lengthThirtySecond,
}

const TECHNIQUES: Array<{ id: TabTechnique; name: () => string }> = [
  { id: 'h', name: m.techHammer },
  { id: 'p', name: m.techPull },
  { id: 'b', name: m.techBend },
  { id: '/', name: m.techSlideUp },
  { id: '\\', name: m.techSlideDown },
  { id: '~', name: m.techVibrato },
]

const TECHNIQUE_KEYS = new Set<string>(TECHNIQUES.map((item) => item.id))

function sameShape(a: Array<TabMeasure>, b: Array<TabMeasure>) {
  return (
    a.length === b.length &&
    a.every((measure, index) => measure.beats.length === b[index]?.beats.length)
  )
}

export function TabEditor({
  part,
  tuning,
  timeSignature,
  bpm,
  notation,
}: {
  part: EditorPart
  tuning: Array<string>
  timeSignature: string
  bpm?: number
  notation: Notation
}) {
  const { mutations, save } = useEditor()
  const strings = tuning.length || 6
  const labels = stringLabels(tuning, strings)
  const [history, setHistory] = useState<History>(() => ({
    past: [],
    present: {
      measures:
        part.measures && part.measures.length > 0
          ? part.measures
          : [emptyBar(timeSignature)],
      cursor: { bar: 0, beat: 0, string: 1 },
    },
    future: [],
  }))
  const [guessed, setGuessed] = useState(part.rhythmGuessed ?? false)
  const [textOpen, setTextOpen] = useState(false)
  const gridRef = useRef<HTMLDivElement>(null)
  const chordRef = useRef<HTMLInputElement>(null)
  const digits = useRef<{ typed: string; at: number } | null>(null)

  const { measures } = history.present
  const cursor = clampCursor(measures, history.present.cursor, strings)
  const beat = beatAt(measures, cursor)
  const note = noteAt(measures, cursor)
  const preview = useDeferredValue(measures)

  const saveTab = useDebounced(
    (next: Array<TabMeasure>, rhythmGuessed: boolean) =>
      void save(() =>
        mutations.updatePart({
          partId: part._id,
          measures: cleanTabMeasures(next),
          rhythmGuessed,
        }),
      ),
    900,
  )

  const setCursor = (next: TabCursor) => {
    digits.current = null
    setHistory((current) => ({
      ...current,
      present: { ...current.present, cursor: next },
    }))
  }

  const commit = (
    edit: TabEdit | Array<TabMeasure>,
    options: { merge?: boolean; guessed?: boolean } = {},
  ) => {
    const next = Array.isArray(edit) ? { measures: edit, cursor } : edit
    if (next.measures === measures) {
      setCursor(next.cursor)
      return
    }
    setHistory({
      past: options.merge
        ? history.past
        : [...history.past, history.present].slice(-HISTORY_LIMIT),
      present: next,
      future: [],
    })
    const rhythmGuessed = options.guessed ?? guessed
    setGuessed(rhythmGuessed)
    saveTab.call(next.measures, rhythmGuessed)
  }

  const act = (edit: TabEdit | Array<TabMeasure>) => {
    commit(edit)
    gridRef.current?.focus()
  }

  const undo = () => {
    const previous = history.past.at(-1)
    if (!previous) return
    setHistory({
      past: history.past.slice(0, -1),
      present: previous,
      future: [history.present, ...history.future],
    })
    saveTab.call(previous.measures, guessed)
  }

  const redo = () => {
    const next = history.future.at(0)
    if (!next) return
    setHistory({
      past: [...history.past, history.present],
      present: next,
      future: history.future.slice(1),
    })
    saveTab.call(next.measures, guessed)
  }

  const typeDigit = (digit: string) => {
    const now = Date.now()
    const previous = digits.current
    const joined =
      previous && now - previous.at < DIGIT_WINDOW_MS
        ? `${previous.typed}${digit}`
        : ''
    if (joined && Number(joined) <= MAX_FRET) {
      digits.current = null
      commit(setFret(measures, cursor, Number(joined)), { merge: true })
    } else {
      commit(setFret(measures, cursor, Number(digit)))
      digits.current = { typed: digit, at: now }
    }
  }

  const applyChord = (value: string) => {
    if (value.trim() !== (beat?.chord ?? ''))
      commit(setChord(measures, cursor, value))
  }

  const insertShape = () => {
    const symbol = (chordRef.current?.value ?? beat?.chord ?? '').trim()
    if (!symbol) {
      chordRef.current?.focus()
      return
    }
    const diagram = defaultDiagram(symbol, tuning)
    if (!diagram) {
      toast.error(m.noVoicings())
      return
    }
    act(placeShape(measures, cursor, diagram.frets, symbol))
  }

  const applyText = (text: string) => {
    const parsed = keepRhythm(parseAsciiTab(text, timeSignature), measures)
    commit(
      {
        measures: parsed.length > 0 ? parsed : [emptyBar(timeSignature)],
        cursor: { bar: 0, beat: 0, string: 1 },
      },
      { guessed: guessed || !sameShape(parsed, measures) },
    )
  }

  const onKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    const { key } = event
    const command = event.metaKey || (event.ctrlKey && !event.altKey)
    const typed = digits.current
    digits.current = null
    const length = LENGTH_KEYS[event.code]

    if (command && key.toLowerCase() === 'z') {
      if (event.shiftKey) redo()
      else undo()
    } else if (command && key.toLowerCase() === 'y') redo()
    else if (command) return
    else if (event.altKey && !event.ctrlKey && length)
      commit(setDuration(measures, cursor, length))
    else if (/^[0-9]$/.test(key)) {
      digits.current = typed
      typeDigit(key)
    } else if (key === 'ArrowUp')
      setCursor({ ...cursor, string: Math.max(1, cursor.string - 1) })
    else if (key === 'ArrowDown')
      setCursor({ ...cursor, string: Math.min(strings, cursor.string + 1) })
    else if (key === 'ArrowLeft') commit(moveBeat(measures, cursor, -1))
    else if (key === 'ArrowRight') commit(moveBeat(measures, cursor, 1))
    else if (key === 'Home') setCursor({ ...cursor, beat: 0 })
    else if (key === 'End')
      setCursor({
        ...cursor,
        beat: (measures[cursor.bar]?.beats.length ?? 1) - 1,
      })
    else if ((key === 'Delete' || key === 'Backspace') && event.shiftKey)
      commit(deleteBeat(measures, cursor, timeSignature))
    else if (key === 'Delete' || key === 'Backspace')
      commit(clearNote(measures, cursor))
    else if (key === 'Enter' || key === 'Insert')
      commit(insertBeat(measures, cursor))
    else if (key === '|') commit(insertBar(measures, cursor, timeSignature))
    else if (key === '.') commit(toggleDot(measures, cursor))
    else if (key.toLowerCase() === 'r') commit(toggleRest(measures, cursor))
    else if (key.toLowerCase() === 'c') chordRef.current?.focus()
    else if (TECHNIQUE_KEYS.has(key.toLowerCase()))
      commit(
        toggleTechnique(measures, cursor, key.toLowerCase() as TabTechnique),
      )
    else return
    event.preventDefault()
  }

  const status = m.tabCursor({
    bar: String(cursor.bar + 1),
    beat: String(cursor.beat + 1),
    string: labels[cursor.string - 1] ?? String(cursor.string),
    value: note ? noteLabel(note) : m.emptyCell(),
  })

  const settings: SheetSettings = {
    capo: 0,
    transpose: 0,
    notation,
    mode: 'both',
    scale: 1,
  }

  return (
    <div className="space-y-3">
      {guessed ? (
        <div className="flex flex-wrap items-center gap-3 rounded-xl border border-primary/25 bg-primary/8 px-4 py-2.5 text-sm">
          <LightbulbIcon className="size-4 shrink-0 text-primary" />
          <span className="min-w-0 flex-1">{m.rhythmGuessedHint()}</span>
          <Button
            variant="outline"
            size="sm"
            onPress={() => {
              setGuessed(false)
              saveTab.call(measures, false)
            }}
          >
            <CheckIcon />
            {m.rhythmConfirm()}
          </Button>
        </div>
      ) : null}

      <div className="flex flex-wrap items-center gap-2">
        <Segmented
          size="sm"
          aria-label={m.noteLength()}
          value={String(beat?.d ?? 4)}
          onChange={(value) =>
            act(setDuration(measures, cursor, Number(value) as Duration))
          }
          options={DURATIONS.map((d) => ({
            id: String(d),
            label: (
              <>
                <span aria-hidden>{LENGTH_LABELS[d]}</span>
                <span className="sr-only">{LENGTH_NAMES[d]()}</span>
              </>
            ),
          }))}
        />
        <Toggle
          size="sm"
          variant="outline"
          isSelected={beat?.dot ?? false}
          isDisabled={beat?.d === 32}
          onChange={() => act(toggleDot(measures, cursor))}
        >
          {m.dotted()}
        </Toggle>
        <Toggle
          size="sm"
          variant="outline"
          isSelected={beat?.rest ?? false}
          onChange={() => act(toggleRest(measures, cursor))}
        >
          {m.tabRest()}
        </Toggle>
        <label className="flex items-center gap-1.5 text-xs text-muted-foreground">
          {m.fret()}
          <Input
            inputMode="numeric"
            value={note ? String(note.f) : ''}
            onChange={(event) => {
              const value = event.target.value.replace(/\D/g, '').slice(-2)
              commit(
                value
                  ? setFret(measures, cursor, Number(value))
                  : clearNote(measures, cursor),
              )
            }}
            className="h-7 w-12 px-2 text-center font-mono"
          />
        </label>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <div
          role="group"
          aria-label={m.techniques()}
          className="inline-flex items-center gap-0.5 rounded-xl border bg-muted/40 p-1"
        >
          {TECHNIQUES.map((technique) => (
            <Toggle
              key={technique.id}
              size="sm"
              aria-label={technique.name()}
              isSelected={note?.t === technique.id}
              isDisabled={!note}
              onChange={() =>
                act(toggleTechnique(measures, cursor, technique.id))
              }
              className="w-7 font-mono data-selected:bg-background data-selected:shadow-sm"
            >
              {technique.id}
            </Toggle>
          ))}
        </div>
        {note?.t === 'b' ? (
          <Segmented
            size="sm"
            aria-label={m.bendAmount()}
            value={String(note.bend ?? 2)}
            onChange={(value) => act(setBend(measures, cursor, Number(value)))}
            options={[
              { id: '1', label: '½' },
              { id: '2', label: m.bendFull() },
              { id: '3', label: '1½' },
            ]}
          />
        ) : null}
        <div className="flex items-center gap-1.5">
          <Input
            key={`${cursor.bar}:${cursor.beat}:${beat?.chord ?? ''}`}
            ref={chordRef}
            defaultValue={beat?.chord ?? ''}
            placeholder={m.chordPlaceholder()}
            aria-label={m.beatChord()}
            onBlur={(event) => applyChord(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter') {
                applyChord(event.currentTarget.value)
                gridRef.current?.focus()
              } else if (event.key === 'Escape') gridRef.current?.focus()
            }}
            className="h-7 w-24 px-2 text-sm font-semibold text-chord"
          />
          <Button variant="outline" size="sm" onPress={insertShape}>
            <GuitarIcon />
            {m.insertShape()}
          </Button>
        </div>
      </div>

      <TabGrid
        measures={measures}
        cursor={cursor}
        labels={labels}
        timeSignature={timeSignature}
        status={status}
        onCursor={setCursor}
        onKeyDown={onKeyDown}
        gridRef={gridRef}
      />

      <div className="flex flex-wrap items-center gap-1.5">
        <Button
          variant="outline"
          size="sm"
          onPress={() => act(insertBeat(measures, cursor))}
        >
          <PlusIcon />
          {m.insertBeat()}
        </Button>
        <Button
          variant="outline"
          size="sm"
          onPress={() => act(deleteBeat(measures, cursor, timeSignature))}
        >
          <MinusIcon />
          {m.deleteBeat()}
        </Button>
        <Button
          variant="outline"
          size="sm"
          onPress={() => act(insertBar(measures, cursor, timeSignature))}
        >
          <SquarePlusIcon />
          {m.addBar()}
        </Button>
        <Button
          variant="outline"
          size="sm"
          onPress={() => act(deleteBar(measures, cursor, timeSignature))}
        >
          <SquareMinusIcon />
          {m.deleteBar()}
        </Button>
        <span className="flex-1" />
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label={m.undo()}
          isDisabled={history.past.length === 0}
          onPress={undo}
        >
          <Undo2Icon />
        </Button>
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label={m.redo()}
          isDisabled={history.future.length === 0}
          onPress={redo}
        >
          <Redo2Icon />
        </Button>
        <Button variant="outline" size="sm" onPress={() => setTextOpen(true)}>
          <FileTextIcon />
          {m.editAsText()}
        </Button>
      </div>

      <p className="hidden items-start gap-2 text-xs text-muted-foreground sm:flex">
        <KeyboardIcon className="mt-0.5 size-3.5 shrink-0 text-primary" />
        {m.tabKeys()}
      </p>

      <div className="space-y-2 rounded-xl border border-dashed bg-background/40 p-4 [--sheet-bg:var(--background)]">
        <div className="text-[0.65rem] font-semibold tracking-widest text-muted-foreground uppercase">
          {m.preview()}
        </div>
        <TabStaff
          measures={preview}
          tuning={tuning}
          timeSignature={timeSignature}
          bpm={bpm}
          settings={settings}
        />
      </div>

      {textOpen ? (
        <TextDialog
          initial={serializeAsciiTab(measures, labels)}
          onApply={applyText}
          onClose={() => setTextOpen(false)}
        />
      ) : null}
    </div>
  )
}

function TextDialog({
  initial,
  onApply,
  onClose,
}: {
  initial: string
  onApply: (text: string) => void
  onClose: () => void
}) {
  const [text, setText] = useState(initial)
  return (
    <Dialog
      isOpen
      onOpenChange={(open) => {
        if (!open) onClose()
      }}
      className="sm:max-w-3xl"
    >
      <DialogHeader>
        <DialogTitle>{m.editAsText()}</DialogTitle>
        <DialogDescription>{m.editAsTextHint()}</DialogDescription>
      </DialogHeader>
      <textarea
        value={text}
        wrap="off"
        spellCheck={false}
        autoFocus
        rows={Math.min(20, Math.max(8, text.split('\n').length + 1))}
        aria-label={m.tabText()}
        onChange={(event) => setText(event.target.value)}
        className={`${textareaClass} overflow-x-auto whitespace-pre`}
      />
      <p className="flex items-start gap-2 text-xs text-muted-foreground">
        <LightbulbIcon className="mt-0.5 size-3.5 shrink-0 text-primary" />
        {m.tabHint()}
      </p>
      <DialogFooter>
        <Button variant="outline" onPress={onClose}>
          {m.cancel()}
        </Button>
        <Button
          onPress={() => {
            onApply(text)
            onClose()
          }}
        >
          {m.apply()}
        </Button>
      </DialogFooter>
    </Dialog>
  )
}
