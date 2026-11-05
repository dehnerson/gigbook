import { cn } from 'cn'
import { displayChord } from '@/lib/music/chords'
import {
  isBarGridLine,
  isChordOnlyLine,
  parseChordPro,
  sectionLabelOf,
} from '@/lib/music/chordpro'
import type { ChartToken } from '@/lib/music/chordpro'
import type { SheetSettings } from './types'

type Cell = { chord?: string; text: string }

function cellsOf(tokens: Array<ChartToken>) {
  const cells: Array<Cell> = []
  for (const token of tokens) {
    if (token.kind === 'chord') {
      cells.push({ chord: token.symbol, text: '' })
      continue
    }
    const pieces = token.value.split(/(\s+)/).filter(Boolean)
    for (const piece of pieces) {
      const last = cells.at(-1)
      if (/^\s+$/.test(piece)) {
        if (last) last.text += piece
        else cells.push({ text: piece })
      } else if (last && !/\s$/.test(last.text)) {
        if (last.text === '' || last.chord === undefined) last.text += piece
        else cells.push({ text: piece })
      } else {
        cells.push({ text: piece })
      }
    }
  }
  return cells
}

function wordsOf(cells: Array<Cell>) {
  const words: Array<Array<Cell>> = []
  for (const cell of cells) {
    const word = words.at(-1)
    const previous = word?.at(-1)
    if (word && previous && !/\s$/.test(previous.text)) word.push(cell)
    else words.push([cell])
  }
  return words
}

function ChordOnlyRow({
  tokens,
  show,
}: {
  tokens: Array<ChartToken>
  show: (symbol: string) => string
}) {
  const items: Array<{ chord: string; gap: number }> = []
  for (const token of tokens) {
    if (token.kind === 'chord') items.push({ chord: token.symbol, gap: 0 })
    else {
      const last = items.at(-1)
      if (last) last.gap += token.value.length
    }
  }
  return (
    <div className="flex flex-wrap items-baseline gap-y-1 py-0.5">
      {items.map((item, index) => {
        const label = show(item.chord)
        return (
          <span
            key={index}
            className="font-semibold text-chord"
            style={{
              minWidth: `${Math.max(label.length + 1.5, label.length + item.gap) * 0.62}em`,
            }}
          >
            {label}
          </span>
        )
      })}
    </div>
  )
}

function BarGrid({
  line,
  show,
}: {
  line: string
  show: (symbol: string) => string
}) {
  const bars = line
    .split('|')
    .map((bar) => bar.trim())
    .filter(Boolean)
  return (
    <div className="my-1.5 flex flex-wrap">
      {bars.map((bar, index) => (
        <div
          key={index}
          className="flex min-w-[5.5em] items-center gap-3 border-l-2 border-foreground/25 px-3 py-1 last:border-r-2"
        >
          {bar.split(/\s+/).map((token, tokenIndex) => (
            <span
              key={tokenIndex}
              className={cn(
                'font-semibold',
                /^[%/.-]+$/.test(token)
                  ? 'text-muted-foreground'
                  : 'text-chord',
              )}
            >
              {/^[%/.-]+$/.test(token) ? token : show(token)}
            </span>
          ))}
        </div>
      ))}
    </div>
  )
}

function LyricLine({
  tokens,
  show,
}: {
  tokens: Array<ChartToken>
  show: (symbol: string) => string
}) {
  const words = wordsOf(cellsOf(tokens))
  return (
    <div className="flex flex-wrap items-end">
      {words.map((word, wordIndex) => (
        <span key={wordIndex} className="inline-flex items-end">
          {word.map((cell, cellIndex) => (
            <span key={cellIndex} className="inline-flex flex-col">
              <span className="h-[1.35em] pr-[0.35em] text-[0.92em] leading-[1.35em] font-semibold whitespace-nowrap text-chord">
                {cell.chord ? show(cell.chord) : ''}
              </span>
              <span className="whitespace-pre">{cell.text || '\u00a0'}</span>
            </span>
          ))}
        </span>
      ))}
    </div>
  )
}

export function ChartPart({
  body,
  settings,
}: {
  body: string
  settings: SheetSettings
}) {
  const show = (symbol: string) =>
    displayChord(symbol, settings.capo, settings.transpose, settings.notation)
  const lines = body.split(/\r?\n/)

  return (
    <div className="leading-snug">
      {lines.map((line, index) => {
        if (!line.trim()) return <div key={index} className="h-[0.9em]" />
        const label = sectionLabelOf(line)
        if (label) {
          return (
            <div
              key={index}
              className="mt-2 mb-0.5 text-[0.72em] font-semibold tracking-widest text-muted-foreground uppercase"
            >
              {label}
            </div>
          )
        }
        if (isBarGridLine(line)) {
          return settings.mode === 'lyrics' ? null : (
            <BarGrid key={index} line={line} show={show} />
          )
        }
        const tokens = parseChordPro(line)[0]?.tokens ?? []
        const hasChords = tokens.some((token) => token.kind === 'chord')
        if (isChordOnlyLine(tokens)) {
          return settings.mode === 'lyrics' ? null : (
            <ChordOnlyRow key={index} tokens={tokens} show={show} />
          )
        }
        if (settings.mode === 'lyrics' || !hasChords) {
          const text = tokens
            .map((token) => (token.kind === 'text' ? token.value : ''))
            .join('')
          return (
            <p key={index} className="py-0.5 whitespace-pre-wrap">
              {text}
            </p>
          )
        }
        if (settings.mode === 'chords') {
          return (
            <ChordOnlyRow
              key={index}
              tokens={tokens.filter((token) => token.kind === 'chord')}
              show={show}
            />
          )
        }
        return <LyricLine key={index} tokens={tokens} show={show} />
      })}
    </div>
  )
}
