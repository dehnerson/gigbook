import { cn } from 'cn'
import { useQuery } from 'convex/react'
import { useState } from 'react'
import { ChordDiagram } from '@/components/chord-diagram'
import { resolveChord, tuningKey } from '@/lib/music/shapes'
import type { PersonalShape, ResolvedChord } from '@/lib/music/shapes'
import { m } from '@/paraglide/messages'
import { api } from '../../../convex/_generated/api'
import type { Id } from '../../../convex/_generated/dataModel'
import { ChordPicker } from './chord-picker'
import type { ChordShapeOverride, SheetSettings } from './types'

export function ChordStrip({
  symbols,
  shapes,
  settings,
  tuning = [],
  personalShapes = [],
  onPick,
  className,
}: {
  symbols: Array<string>
  shapes: Array<ChordShapeOverride>
  settings: SheetSettings
  tuning?: Array<string>
  personalShapes?: Array<PersonalShape>
  onPick?: (chord: ResolvedChord) => void
  className?: string
}) {
  const seen = new Set<string>()
  const items = symbols.flatMap((symbol) => {
    const chord = resolveChord({
      symbol,
      capo: settings.capo,
      transpose: settings.transpose,
      notation: settings.notation,
      tuning,
      versionShapes: shapes,
      personalShapes,
    })
    if (seen.has(chord.name)) return []
    seen.add(chord.name)
    return [chord]
  })
  if (items.length === 0) return null
  return (
    <div className={cn('-mx-1 overflow-x-auto pb-1', className)}>
      <div className="flex w-max gap-2 px-1">
        {items.map((item) => {
          if (!item.diagram)
            return (
              <div
                key={item.name}
                className="grid min-w-16 place-items-center rounded-xl border border-dashed px-3 text-sm font-semibold text-chord"
              >
                {item.name}
              </div>
            )
          const card = cn(
            'relative rounded-xl border bg-card/60 px-2 pt-2 pb-1',
            item.source !== 'default' && 'border-primary/40',
          )
          const content = (
            <>
              <ChordDiagram name={item.name} diagram={item.diagram} />
              {item.source !== 'default' ? (
                <span className="absolute top-1.5 right-1.5 size-1.5 rounded-full bg-primary" />
              ) : null}
            </>
          )
          return onPick ? (
            <button
              key={item.name}
              type="button"
              aria-label={m.changeVoicing({ chord: item.name })}
              onClick={() => onPick(item)}
              className={cn(
                card,
                'transition-colors hover:border-primary/60 focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:outline-none',
              )}
            >
              {content}
            </button>
          ) : (
            <div key={item.name} className={card}>
              {content}
            </div>
          )
        })}
      </div>
    </div>
  )
}

export function PickableChordStrip({
  symbols,
  shapes,
  settings,
  tuning,
  versionId,
  canEdit,
}: {
  symbols: Array<string>
  shapes: Array<ChordShapeOverride>
  settings: SheetSettings
  tuning: Array<string>
  versionId?: Id<'versions'>
  canEdit: boolean
}) {
  const mine = useQuery(api.chordShapes.mine, { tuning: tuningKey(tuning) })
  const [picking, setPicking] = useState<ResolvedChord | null>(null)
  return (
    <>
      <ChordStrip
        symbols={symbols}
        shapes={shapes}
        settings={settings}
        tuning={tuning}
        personalShapes={mine ?? []}
        onPick={setPicking}
      />
      {picking ? (
        <ChordPicker
          key={`${picking.symbol}:${picking.shift}`}
          chord={picking}
          tuning={tuning}
          versionId={canEdit ? versionId : undefined}
          hasMine={(mine ?? []).some(
            (shape) => shape.symbol === picking.played,
          )}
          onClose={() => setPicking(null)}
        />
      ) : null}
    </>
  )
}
