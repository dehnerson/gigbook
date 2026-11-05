import { cn } from 'cn'
import type * as React from 'react'

export function Chip({
  label,
  children,
  tone = 'default',
  className,
}: {
  label?: React.ReactNode
  children: React.ReactNode
  tone?: 'default' | 'primary' | 'success' | 'warning'
  className?: string
}) {
  return (
    <span
      className={cn(
        'inline-flex h-6 items-center gap-1.5 rounded-md border px-2 text-xs font-medium whitespace-nowrap',
        tone === 'default' && 'bg-muted/40 text-foreground',
        tone === 'primary' && 'border-primary/30 bg-primary/10 text-primary',
        tone === 'success' && 'border-success/30 bg-success/10 text-success',
        tone === 'warning' &&
          'border-destructive/30 bg-destructive/10 text-destructive',
        className,
      )}
    >
      {label ? (
        <span className="text-muted-foreground uppercase tracking-wide text-[0.65rem]">
          {label}
        </span>
      ) : null}
      {children}
    </span>
  )
}

function hueOf(text: string) {
  let hash = 0
  for (const char of text) hash = (hash * 31 + char.charCodeAt(0)) % 360
  return hash
}

export function Monogram({
  text,
  className,
}: {
  text: string
  className?: string
}) {
  const hue = hueOf(text)
  const letters =
    text
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((word) => word[0]?.toUpperCase())
      .join('') || '♪'
  return (
    <span
      aria-hidden
      className={cn(
        'grid size-11 shrink-0 place-items-center rounded-xl text-sm font-semibold ring-1 ring-inset',
        className,
      )}
      style={{
        background: `color-mix(in oklch, oklch(0.72 0.14 ${hue}) 18%, transparent)`,
        color: `oklch(0.82 0.12 ${hue})`,
        ['--tw-ring-color' as string]: `color-mix(in oklch, oklch(0.72 0.14 ${hue}) 30%, transparent)`,
      }}
    >
      {letters}
    </span>
  )
}

export function initials(name: string) {
  return (
    name
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((word) => word[0]?.toUpperCase())
      .join('') || '?'
  )
}
