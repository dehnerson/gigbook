import { cn } from 'cn'
import { useMutation } from 'convex/react'
import { useMemo, useState } from 'react'
import { toast } from 'sonner'
import { ChordDiagram } from '@/components/chord-diagram'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { messageFor } from '@/lib/errors'
import type { ChordDiagram as Diagram } from '@/lib/music/diagrams'
import { shapeKey, tuningKey, voicingOptions } from '@/lib/music/shapes'
import type { ResolvedChord } from '@/lib/music/shapes'
import { m } from '@/paraglide/messages'
import { api } from '../../../convex/_generated/api'
import type { Id } from '../../../convex/_generated/dataModel'

export function ChordPicker({
  chord,
  tuning,
  versionId,
  hasMine,
  onClose,
}: {
  chord: ResolvedChord
  tuning: Array<string>
  versionId?: Id<'versions'>
  hasMine: boolean
  onClose: () => void
}) {
  const setMine = useMutation(api.chordShapes.setMine)
  const clearMine = useMutation(api.chordShapes.clearMine)
  const setForVersion = useMutation(api.chordShapes.setForVersion)
  const clearForVersion = useMutation(api.chordShapes.clearForVersion)
  const options = useMemo(() => {
    const generated = voicingOptions(chord.played, tuning)
    const current = chord.diagram
    if (
      !current ||
      generated.some(
        (option) => shapeKey(option.frets) === shapeKey(current.frets),
      )
    )
      return generated
    return [current, ...generated]
  }, [chord, tuning])
  const [selected, setSelected] = useState<Diagram | null>(
    chord.diagram ?? options.at(0) ?? null,
  )
  const [busy, setBusy] = useState(false)
  const tuningId = tuningKey(tuning)

  function run(action: () => Promise<unknown>, saved: boolean) {
    setBusy(true)
    action()
      .then(() => {
        if (saved) toast.success(m.shapeSaved())
        onClose()
      })
      .catch((error: unknown) => toast.error(messageFor(error)))
      .finally(() => setBusy(false))
  }

  const shape = selected
    ? { frets: selected.frets, fingers: selected.fingers }
    : null

  return (
    <Dialog
      isOpen
      onOpenChange={(open) => {
        if (!open) onClose()
      }}
      className="sm:max-w-xl"
    >
      <DialogHeader>
        <DialogTitle>{m.chordVoicings({ chord: chord.name })}</DialogTitle>
        <DialogDescription>{m.chordVoicingsHint()}</DialogDescription>
      </DialogHeader>
      {options.length === 0 ? (
        <p className="py-6 text-center text-muted-foreground">
          {m.noVoicings()}
        </p>
      ) : (
        <div className="grid max-h-[55vh] grid-cols-3 gap-2 overflow-y-auto p-0.5 sm:grid-cols-4">
          {options.map((option) => {
            const key = shapeKey(option.frets)
            const active = selected ? shapeKey(selected.frets) === key : false
            const current = chord.diagram
              ? shapeKey(chord.diagram.frets) === key
              : false
            return (
              <button
                key={key}
                type="button"
                aria-pressed={active}
                onClick={() => setSelected(option)}
                className={cn(
                  'relative grid place-items-center rounded-xl border bg-card/60 px-2 pt-2 pb-1 transition-colors hover:border-primary/50',
                  active && 'border-primary ring-2 ring-primary/30',
                )}
              >
                <ChordDiagram name={chord.name} diagram={option} />
                {current && chord.source !== 'default' ? (
                  <span className="absolute top-1.5 right-1.5 size-1.5 rounded-full bg-primary" />
                ) : null}
              </button>
            )
          })}
        </div>
      )}
      {chord.source !== 'default' ? (
        <p className="text-xs text-muted-foreground">
          {chord.source === 'version' ? m.shapeFromSong() : m.shapeMine()}
        </p>
      ) : null}
      <DialogFooter className="sm:justify-between">
        <div className="flex flex-wrap gap-2">
          {versionId && chord.source === 'version' ? (
            <Button
              variant="ghost"
              isDisabled={busy}
              onPress={() =>
                run(
                  () =>
                    clearForVersion({
                      versionId,
                      symbol: chord.symbol,
                      shift: chord.shift,
                    }),
                  false,
                )
              }
            >
              {m.removeSongShape()}
            </Button>
          ) : null}
          {hasMine ? (
            <Button
              variant="ghost"
              isDisabled={busy}
              onPress={() =>
                run(
                  () => clearMine({ tuning: tuningId, symbol: chord.played }),
                  false,
                )
              }
            >
              {m.forgetMyShape()}
            </Button>
          ) : null}
        </div>
        <div className="flex flex-col-reverse gap-2 sm:flex-row">
          {versionId ? (
            <Button
              variant="outline"
              isDisabled={busy || !shape}
              onPress={() =>
                shape &&
                run(
                  () =>
                    setForVersion({
                      versionId,
                      symbol: chord.symbol,
                      shift: chord.shift,
                      ...shape,
                    }),
                  true,
                )
              }
            >
              {m.useInSong()}
            </Button>
          ) : null}
          <Button
            isDisabled={busy || !shape}
            onPress={() =>
              shape &&
              run(
                () =>
                  setMine({ tuning: tuningId, symbol: chord.played, ...shape }),
                true,
              )
            }
          >
            {m.alwaysUseForMe()}
          </Button>
        </div>
      </DialogFooter>
    </Dialog>
  )
}
