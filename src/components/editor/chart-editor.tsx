import { cn } from 'cn'
import { LightbulbIcon, PlusIcon, Undo2Icon } from 'lucide-react'
import { useRef, useState } from 'react'
import { toast } from 'sonner'
import { useDebounced } from '@/components/app/save'
import { ChartPart } from '@/components/sheet/chart-part'
import { StrumPattern } from '@/components/sheet/strum-pattern'
import type { SheetSettings } from '@/components/sheet/types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { displayChord } from '@/lib/music/chords'
import {
  chordsOverLyricsToChordPro,
  hasChordsOverLyrics,
  transposeChordPro,
} from '@/lib/music/chordpro'
import type { Notation } from '@/lib/music/pitch'
import { DEFAULT_LAYERS } from '@/lib/sheet-layers'
import { m } from '@/paraglide/messages'
import type { EditorPart } from './types'
import { useEditor } from './use-editor'

const COMMON = ['C', 'D', 'E', 'G', 'A', 'Am', 'Em', 'Dm', 'F', 'Bm']

function toEditorText(body: string, notation: Notation) {
  return notation === 'de' ? transposeChordPro(body, 0, 'en', 'de') : body
}

function fromEditorText(text: string, notation: Notation) {
  return notation === 'de' ? transposeChordPro(text, 0, 'de', 'en') : text
}

export const textareaClass =
  'block w-full resize-y rounded-xl border border-input bg-background/60 px-3.5 py-3 font-mono text-sm leading-relaxed outline-none placeholder:text-muted-foreground/60 focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/40'

export function ChartEditor({
  part,
  palette,
  notation,
  timeSignature,
}: {
  part: EditorPart
  palette: Array<string>
  notation: Notation
  timeSignature: string
}) {
  const { mutations, save } = useEditor()
  const [text, setText] = useState(() =>
    toEditorText(part.chartBody ?? '', notation),
  )
  const [strumming, setStrumming] = useState(part.strumming ?? '')
  const [custom, setCustom] = useState('')
  const history = useRef<Array<string>>([])
  const [canUndo, setCanUndo] = useState(false)
  const area = useRef<HTMLTextAreaElement>(null)

  const saveBody = useDebounced((value: string) => {
    void save(() =>
      mutations.updatePart({
        partId: part._id,
        chartBody: fromEditorText(value, notation),
      }),
    )
  })
  const saveStrum = useDebounced((value: string) => {
    void save(() =>
      mutations.updatePart({ partId: part._id, strumming: value.trim() }),
    )
  })

  const update = (value: string, remember = false) => {
    if (remember) {
      history.current.push(text)
      if (history.current.length > 50) history.current.shift()
      setCanUndo(true)
    }
    setText(value)
    saveBody.call(value)
  }

  const insertAtCursor = (snippet: string) => {
    const node = area.current
    const start = node?.selectionStart ?? text.length
    const end = node?.selectionEnd ?? text.length
    update(`${text.slice(0, start)}${snippet}${text.slice(end)}`, true)
    requestAnimationFrame(() => {
      node?.focus()
      node?.setSelectionRange(start + snippet.length, start + snippet.length)
    })
  }

  const chords = [...new Set([...palette, ...COMMON])].slice(0, 24)
  const settings: SheetSettings = {
    capo: 0,
    transpose: 0,
    notation,
    layers: DEFAULT_LAYERS,
    scale: 0.95,
  }

  return (
    <div className="grid gap-4 xl:grid-cols-2">
      <div className="min-w-0 space-y-3">
        <div className="flex flex-wrap items-center gap-1">
          {chords.map((chord) => {
            const label = displayChord(chord, 0, 0, notation)
            return (
              <button
                key={chord}
                type="button"
                onClick={() => insertAtCursor(`[${label}]`)}
                className="h-7 rounded-md border bg-background/60 px-2 font-mono text-xs font-semibold text-chord transition-colors hover:border-primary/50 hover:bg-primary/10"
              >
                {label}
              </button>
            )
          })}
          <form
            className="flex items-center"
            onSubmit={(event) => {
              event.preventDefault()
              if (!custom.trim()) return
              insertAtCursor(`[${custom.trim()}]`)
              setCustom('')
            }}
          >
            <Input
              value={custom}
              onChange={(event) => setCustom(event.target.value)}
              placeholder={m.chordPlaceholder()}
              aria-label={m.placeChord()}
              className="h-7 w-20 rounded-r-none px-2 font-mono text-xs"
            />
            <Button
              type="submit"
              size="icon-sm"
              variant="outline"
              className="rounded-l-none"
              aria-label={m.placeChord()}
            >
              <PlusIcon />
            </Button>
          </form>
          {canUndo ? (
            <Button
              variant="ghost"
              size="sm"
              className="ml-auto"
              onPress={() => {
                const previous = history.current.pop()
                if (previous === undefined) return
                setText(previous)
                saveBody.call(previous)
                setCanUndo(history.current.length > 0)
              }}
            >
              <Undo2Icon />
              {m.undo()}
            </Button>
          ) : null}
        </div>
        <textarea
          ref={area}
          value={text}
          rows={Math.min(24, Math.max(6, text.split('\n').length + 1))}
          spellCheck={false}
          aria-label={m.lyricsAndChords()}
          placeholder={m.lyricsPlaceholder()}
          onChange={(event) => update(event.target.value)}
          onPaste={(event) => {
            const pasted = event.clipboardData.getData('text/plain')
            if (!hasChordsOverLyrics(pasted)) return
            event.preventDefault()
            const converted = toEditorText(
              chordsOverLyricsToChordPro(pasted, notation),
              notation,
            )
            insertAtCursor(converted)
            toast.success(m.pasteConverted())
          }}
          onBlur={() => saveBody.flush()}
          className={textareaClass}
        />
        <p className="flex items-start gap-2 text-xs text-muted-foreground">
          <LightbulbIcon className="mt-0.5 size-3.5 shrink-0 text-primary" />
          {m.lyricsHint()}
        </p>
        <label className="block space-y-1.5">
          <span className="text-sm font-medium">{m.strumming()}</span>
          <Input
            value={strumming}
            placeholder="D-DU-UDU"
            className="font-mono"
            onChange={(event) => {
              setStrumming(event.target.value)
              saveStrum.call(event.target.value)
            }}
          />
          <span className="block text-xs text-muted-foreground">
            {m.strummingHint()}
          </span>
        </label>
      </div>
      <div
        className={cn(
          'min-w-0 space-y-3 rounded-xl border border-dashed bg-background/40 p-4 [--sheet-bg:var(--background)]',
        )}
      >
        <div className="text-[0.65rem] font-semibold tracking-widest text-muted-foreground uppercase">
          {m.preview()}
        </div>
        {strumming.trim() ? (
          <StrumPattern text={strumming} timeSignature={timeSignature} />
        ) : null}
        {text.trim() ? (
          <ChartPart
            body={fromEditorText(text, notation)}
            settings={settings}
          />
        ) : (
          <p className="text-sm text-muted-foreground">{m.previewEmpty()}</p>
        )}
      </div>
    </div>
  )
}
