import { cn } from 'cn'
import { UserRoundIcon } from 'lucide-react'
import { m } from '@/paraglide/messages'
import { hueOf } from './chip'

export type MarkParty = {
  bandId?: string | null
  name?: string | null
}

function letters(name: string) {
  return (
    name
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((word) => word[0]?.toUpperCase())
      .join('') || '♪'
  )
}

export function BandMark({
  name,
  className,
}: {
  name: string
  className?: string
}) {
  const hue = hueOf(name)
  return (
    <span
      role="img"
      aria-label={name}
      title={name}
      className={cn(
        'grid size-6 shrink-0 place-items-center rounded-md text-[0.65rem] font-semibold ring-1 ring-inset',
        className,
      )}
      style={{
        background: `color-mix(in oklch, oklch(0.72 0.14 ${hue}) 18%, transparent)`,
        color: `oklch(0.82 0.12 ${hue})`,
        ['--tw-ring-color' as string]: `color-mix(in oklch, oklch(0.72 0.14 ${hue}) 30%, transparent)`,
      }}
    >
      {letters(name)}
    </span>
  )
}

export function PersonalMark({ className }: { className?: string }) {
  return (
    <span
      role="img"
      aria-label={m.personal()}
      title={m.personal()}
      className={cn(
        'grid size-6 shrink-0 place-items-center rounded-md bg-muted text-muted-foreground ring-1 ring-border',
        className,
      )}
    >
      <UserRoundIcon className="size-3.5" />
    </span>
  )
}

export function ContextMark({
  bandId,
  ownerBandId,
  name,
  ownerName,
  className,
}: MarkParty & {
  ownerBandId?: string | null
  ownerName?: string | null
  className?: string
}) {
  const id = ownerBandId === undefined ? bandId : ownerBandId
  const label = ownerName === undefined ? name : ownerName
  return (
    <span className={cn('inline-flex items-center gap-1', className)}>
      {id && label ? <BandMark name={label} /> : <PersonalMark />}
    </span>
  )
}
