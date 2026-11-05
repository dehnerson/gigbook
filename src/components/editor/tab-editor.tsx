import { LightbulbIcon, PlusIcon, Rows3Icon } from 'lucide-react'
import { useMemo, useState } from 'react'
import { useDebounced } from '@/components/app/save'
import { TabStaff } from '@/components/sheet/tab-staff'
import type { SheetSettings } from '@/components/sheet/types'
import { Button } from '@/components/ui/button'
import { stringLabels } from '@/lib/music/diagrams'
import type { Notation } from '@/lib/music/pitch'
import { parseAsciiTab, serializeAsciiTab } from '@/lib/music/tab'
import { m } from '@/paraglide/messages'
import { textareaClass } from './chart-editor'
import type { EditorPart } from './types'
import { useEditor } from './use-editor'

const STRING_LINE = /^\s*[A-Ga-g][#b]?\s*\|/
const EMPTY_BAR = `${'-'.repeat(12)}|`

function emptySystem(labels: Array<string>, bars = 4) {
  const width = Math.max(...labels.map((label) => label.length))
  return labels
    .map((label) => `${label.padEnd(width)}|${EMPTY_BAR.repeat(bars)}`)
    .join('\n')
}

function addBar(text: string) {
  const lines = text.split('\n')
  let end = -1
  for (let index = lines.length - 1; index >= 0; index -= 1) {
    if (STRING_LINE.test(lines[index] ?? '')) {
      end = index
      break
    }
  }
  if (end === -1) return text
  let start = end
  while (start > 0 && STRING_LINE.test(lines[start - 1] ?? '')) start -= 1
  for (let index = start; index <= end; index += 1) {
    const line = (lines[index] ?? '').trimEnd()
    lines[index] = `${line}${line.endsWith('|') ? '' : '|'}${EMPTY_BAR}`
  }
  return lines.join('\n')
}

export function TabEditor({
  part,
  tuning,
  notation,
}: {
  part: EditorPart
  tuning: Array<string>
  notation: Notation
}) {
  const { mutations, save } = useEditor()
  const labels = stringLabels(tuning, tuning.length || 6)
  const [text, setText] = useState(() =>
    part.measures && part.measures.length > 0
      ? serializeAsciiTab(part.measures, labels)
      : emptySystem(labels),
  )
  const measures = useMemo(() => parseAsciiTab(text), [text])

  const saveTab = useDebounced((value: string) => {
    void save(() =>
      mutations.updatePart({
        partId: part._id,
        measures: parseAsciiTab(value),
      }),
    )
  }, 900)

  const update = (value: string) => {
    setText(value)
    saveTab.call(value)
  }

  const settings: SheetSettings = {
    capo: 0,
    transpose: 0,
    notation,
    mode: 'both',
    scale: 1,
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          onPress={() => update(addBar(text))}
        >
          <PlusIcon />
          {m.addBar()}
        </Button>
        <Button
          variant="outline"
          size="sm"
          onPress={() => update(`${text.trimEnd()}\n\n${emptySystem(labels)}`)}
        >
          <Rows3Icon />
          {m.addSystem()}
        </Button>
      </div>
      <textarea
        value={text}
        wrap="off"
        spellCheck={false}
        rows={Math.min(28, Math.max(8, text.split('\n').length + 1))}
        aria-label={m.tabText()}
        onChange={(event) => update(event.target.value)}
        onBlur={() => saveTab.flush()}
        className={`${textareaClass} overflow-x-auto whitespace-pre`}
      />
      <p className="flex items-start gap-2 text-xs text-muted-foreground">
        <LightbulbIcon className="mt-0.5 size-3.5 shrink-0 text-primary" />
        {m.tabHint()}
      </p>
      <div className="space-y-2 rounded-xl border border-dashed bg-background/40 p-4 [--sheet-bg:var(--background)]">
        <div className="text-[0.65rem] font-semibold tracking-widest text-muted-foreground uppercase">
          {m.preview()}
        </div>
        {measures.length > 0 ? (
          <TabStaff measures={measures} tuning={tuning} settings={settings} />
        ) : (
          <p className="text-sm text-muted-foreground">{m.previewEmpty()}</p>
        )}
      </div>
    </div>
  )
}
