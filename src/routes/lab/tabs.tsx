import { createFileRoute } from '@tanstack/react-router'
import { useTheme } from 'next-themes'
import { useState } from 'react'
import { signed, Stepper } from '@/components/app/stepper'
import { Segmented } from '@/components/app/segmented'
import { AlphaTabStaff } from '@/components/lab/alphatab-staff'
import type { AlphaTabTiming } from '@/components/lab/alphatab-staff'
import { RhythmTabStaff } from '@/components/lab/rhythm-tab-staff'
import { TEST_PIECES } from '@/components/lab/test-pieces'
import { TextSizeControl } from '@/components/sheet/sheet-controls'
import type { SheetSettings } from '@/components/sheet/types'
import { Switch } from '@/components/ui/switch'
import { displayChord } from '@/lib/music/chords'
import type { Notation } from '@/lib/music/pitch'
import { measureFill, previewTabShift, toAlphaTex } from '@/lib/music/tab'

export const Route = createFileRoute('/lab/tabs')({
  component: TabLab,
})

type View = 'both' | 'alphatab' | 'own'
type Width = 'full' | 'phone'

function Toggle({
  label,
  value,
  onChange,
}: {
  label: string
  value: boolean
  onChange: (value: boolean) => void
}) {
  return (
    <div className="flex items-center gap-2 rounded-xl border bg-card/60 px-3 py-2 text-sm">
      <Switch aria-label={label} isSelected={value} onChange={onChange} />
      <span>{label}</span>
    </div>
  )
}

function Panel({
  title,
  subtitle,
  children,
}: {
  title: string
  subtitle: string
  children: React.ReactNode
}) {
  return (
    <section className="space-y-3 rounded-2xl border bg-card p-4 [--sheet-bg:var(--card)] sm:p-6">
      <header>
        <h2 className="font-semibold">{title}</h2>
        <p className="text-xs text-muted-foreground">{subtitle}</p>
      </header>
      {children}
    </section>
  )
}

function TabLab() {
  const { resolvedTheme, setTheme } = useTheme()
  const [notation, setNotation] = useState<Notation>('en')
  const [pieceId, setPieceId] = useState(TEST_PIECES[0].id)
  const [view, setView] = useState<View>('both')
  const [width, setWidth] = useState<Width>('full')
  const [scale, setScale] = useState(1)
  const [transpose, setTranspose] = useState(0)
  const [names, setNames] = useState(false)
  const [score, setScore] = useState(false)
  const [timing, setTiming] = useState<AlphaTabTiming | null>(null)

  const piece =
    TEST_PIECES.find((item) => item.id === pieceId) ?? TEST_PIECES[0]

  const settings: SheetSettings = {
    capo: 0,
    transpose,
    notation,
    mode: 'both',
    scale,
  }
  const shifted = previewTabShift(piece.measures, transpose).measures
  const outOfRange = shifted.some((measure) =>
    measure.beats.some((beat) => beat.notes.some((note) => note.unplayable)),
  )
  const tex = toAlphaTex(shifted, {
    tuning: piece.tuning,
    timeSignature: piece.timeSignature,
    tempo: piece.tempo,
    score,
    chordLabel: (symbol) => displayChord(symbol, 0, transpose, notation),
  })
  const badBars = piece.measures.flatMap((measure, index) =>
    measureFill(measure, piece.timeSignature) === 'full' ? [] : [index + 1],
  )

  const frame = (node: React.ReactNode) => (
    <div
      className={
        width === 'phone'
          ? 'mx-auto w-[390px] max-w-full rounded-xl border border-dashed p-2'
          : undefined
      }
    >
      {node}
    </div>
  )

  return (
    <div className="mx-auto max-w-6xl space-y-6 px-4 py-8 pb-24 sm:px-8">
      <header className="space-y-1">
        <h1 className="text-3xl font-semibold tracking-tight">
          Tab renderer prototype
        </h1>
        <p className="max-w-2xl text-sm text-muted-foreground">
          Same pieces, two renderers. Option A is alphaTab (loaded on demand),
          option B is our own SVG renderer extended with rhythm. Both read the
          proposed tab model with note lengths.
        </p>
      </header>

      <div className="flex flex-wrap items-center gap-2">
        <Segmented
          aria-label="Piece"
          value={pieceId}
          onChange={(id) => {
            setPieceId(id)
          }}
          options={TEST_PIECES.map((item) => ({
            id: item.id,
            label: item.name,
          }))}
        />
        <Segmented<View>
          aria-label="Renderer"
          value={view}
          onChange={setView}
          options={[
            { id: 'both', label: 'Both' },
            { id: 'alphatab', label: 'A: alphaTab' },
            { id: 'own', label: 'B: own' },
          ]}
        />
        <Segmented
          aria-label="Theme"
          value={resolvedTheme === 'light' ? 'light' : 'dark'}
          onChange={setTheme}
          options={[
            { id: 'light', label: 'Light' },
            { id: 'dark', label: 'Dark' },
          ]}
        />
        <Segmented<Width>
          aria-label="Width"
          value={width}
          onChange={setWidth}
          options={[
            { id: 'full', label: 'Full width' },
            { id: 'phone', label: 'Phone' },
          ]}
        />
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <TextSizeControl scale={scale} onScale={setScale} />
        <Stepper
          label="Transpose"
          value={transpose}
          onChange={setTranspose}
          min={-11}
          max={11}
          format={signed}
        />
        <Segmented<Notation>
          aria-label="Notation"
          value={notation}
          onChange={setNotation}
          options={[
            { id: 'en', label: 'B (EN)' },
            { id: 'de', label: 'H (DE)' },
          ]}
        />
        <Toggle label="Note names (B)" value={names} onChange={setNames} />
        <Toggle
          label="Standard notation (A)"
          value={score}
          onChange={setScore}
        />
      </div>

      <div className="space-y-1 text-sm text-muted-foreground">
        <p>
          {piece.description} {piece.timeSignature}, {piece.tempo} bpm.
        </p>
        {outOfRange ? (
          <p className="text-destructive">
            Some notes fall outside the fretboard at this transposition. B marks
            them red, A keeps the original fret.
          </p>
        ) : null}
        {badBars.length > 0 ? (
          <p className="text-destructive">
            Bars that don't add up to the time signature: {badBars.join(', ')}
          </p>
        ) : null}
      </div>

      {view !== 'own' ? (
        <Panel
          title="A: alphaTab"
          subtitle={
            timing
              ? `Library loaded in ${Math.round(timing.load)} ms, first render ${Math.round(timing.render)} ms`
              : 'Loading library…'
          }
        >
          {frame(
            <AlphaTabStaff
              tex={tex}
              scale={scale}
              onTiming={(value) => setTiming(value)}
            />,
          )}
        </Panel>
      ) : null}

      {view !== 'alphatab' ? (
        <Panel title="B: own renderer" subtitle="SVG, no extra dependencies">
          {frame(
            <RhythmTabStaff
              measures={piece.measures}
              tuning={piece.tuning}
              timeSignature={piece.timeSignature}
              settings={settings}
              showNames={names}
            />,
          )}
        </Panel>
      ) : null}

      <details className="rounded-2xl border bg-card p-4 text-sm">
        <summary className="cursor-pointer font-medium">
          Generated alphaTex
        </summary>
        <pre className="mt-3 overflow-x-auto font-mono text-xs whitespace-pre">
          {tex}
        </pre>
      </details>
    </div>
  )
}
