import { cn } from 'cn'
import type { ChordDiagram as Diagram } from '@/lib/music/diagrams'

const STRING_GAP = 13
const FRET_GAP = 16
const LEFT = 20
const TOP = 20

export function ChordDiagram({
  name,
  diagram,
  className,
}: {
  name: string
  diagram: Diagram
  className?: string
}) {
  const strings = diagram.frets.length
  const played = diagram.frets.filter((fret) => fret > 0)
  const span =
    played.length > 0 ? Math.max(...played) - diagram.baseFret + 1 : 1
  const fretCount = Math.max(4, Math.min(5, span))
  const gridWidth = STRING_GAP * (strings - 1)
  const gridHeight = FRET_GAP * fretCount
  const width = LEFT + gridWidth + 12
  const height = TOP + gridHeight + 18
  const nut = diagram.baseFret === 1
  const x = (string: number) => LEFT + string * STRING_GAP
  const y = (fret: number) => TOP + (fret - diagram.baseFret + 0.5) * FRET_GAP

  return (
    <figure
      className={cn(
        'flex w-[4.75rem] shrink-0 flex-col items-center gap-1',
        className,
      )}
    >
      <figcaption className="max-w-full truncate text-sm font-semibold text-chord">
        {name}
      </figcaption>
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="w-full text-foreground"
        role="img"
        aria-label={name}
      >
        {Array.from({ length: fretCount + 1 }, (_, fret) => (
          <line
            key={`f${fret}`}
            x1={LEFT}
            x2={LEFT + gridWidth}
            y1={TOP + fret * FRET_GAP}
            y2={TOP + fret * FRET_GAP}
            stroke="currentColor"
            strokeOpacity={fret === 0 && nut ? 1 : 0.35}
            strokeWidth={fret === 0 && nut ? 3.5 : 1}
            strokeLinecap="round"
          />
        ))}
        {diagram.frets.map((_, string) => (
          <line
            key={`s${string}`}
            x1={x(string)}
            x2={x(string)}
            y1={TOP}
            y2={TOP + gridHeight}
            stroke="currentColor"
            strokeOpacity={0.5}
            strokeWidth={1}
          />
        ))}
        {nut ? null : (
          <text
            x={LEFT - 6}
            y={TOP + FRET_GAP * 0.5 + 3.5}
            textAnchor="end"
            fontSize="9"
            fontWeight={600}
            fill="currentColor"
            fillOpacity={0.7}
          >
            {diagram.baseFret}fr
          </text>
        )}
        {diagram.barre ? (
          <rect
            x={x(diagram.barre.from) - 5.5}
            y={y(diagram.barre.fret) - 5.5}
            width={x(diagram.barre.to) - x(diagram.barre.from) + 11}
            height={11}
            rx={5.5}
            className="fill-chord"
          />
        ) : null}
        {diagram.frets.map((fret, string) => {
          if (fret < 0) {
            return (
              <text
                key={`m${string}`}
                x={x(string)}
                y={TOP - 6}
                textAnchor="middle"
                fontSize="10"
                fill="currentColor"
                fillOpacity={0.6}
              >
                ×
              </text>
            )
          }
          if (fret === 0) {
            return (
              <circle
                key={`o${string}`}
                cx={x(string)}
                cy={TOP - 9}
                r={3.2}
                fill="none"
                stroke="currentColor"
                strokeOpacity={0.75}
                strokeWidth={1.2}
              />
            )
          }
          const onBarre =
            diagram.barre &&
            fret === diagram.barre.fret &&
            string >= diagram.barre.from &&
            string <= diagram.barre.to
          return onBarre ? null : (
            <circle
              key={`d${string}`}
              cx={x(string)}
              cy={y(fret)}
              r={5.5}
              className="fill-chord"
            />
          )
        })}
        {diagram.fingers?.some((finger) => finger > 0)
          ? diagram.fingers.map((finger, string) =>
              finger > 0 ? (
                <text
                  key={`n${string}`}
                  x={x(string)}
                  y={TOP + gridHeight + 13}
                  textAnchor="middle"
                  fontSize="9"
                  fontWeight={500}
                  fill="currentColor"
                  fillOpacity={0.6}
                >
                  {finger}
                </text>
              ) : null,
            )
          : null}
      </svg>
    </figure>
  )
}
