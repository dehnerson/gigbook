import { SearchIcon, SearchXIcon, XIcon } from 'lucide-react'
import type * as React from 'react'
import { cn } from 'cn'
import { EmptyState } from '@/components/app/empty-state'
import { Segmented } from '@/components/app/segmented'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { m } from '@/paraglide/messages'

export function ownershipSegments() {
  return [
    { id: 'all' as const, label: m.all() },
    { id: 'personal' as const, label: m.personal() },
    { id: 'band' as const, label: m.bands() },
  ]
}

export function NoMatches({
  query,
  onClear,
}: {
  query: string
  onClear: () => void
}) {
  return (
    <EmptyState
      icon={SearchXIcon}
      title={m.noMatches()}
      description={query ? m.noMatchesHint({ query }) : undefined}
      action={
        <Button variant="outline" onPress={onClear}>
          {m.clearFilters()}
        </Button>
      }
    />
  )
}

export function SearchField<T extends string>({
  value,
  onChange,
  label,
  autoFocus,
  className,
  segments,
}: {
  value: string
  onChange: (value: string) => void
  label: string
  autoFocus?: boolean
  className?: string
  segments?: {
    label: string
    value: T
    onChange: (value: T) => void
    options: Array<{
      id: T
      label: React.ReactNode
      icon?: React.ComponentType<{ className?: string }>
    }>
  }
}) {
  const field = (
    <div
      className={cn(
        'relative min-w-0',
        segments ? 'flex-1 basis-64' : className,
      )}
    >
      <SearchIcon className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
      <Input
        autoFocus={autoFocus}
        type="search"
        aria-label={label}
        placeholder={label}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === 'Escape') onChange('')
        }}
        className={cn(
          'h-10 pl-9 [&::-webkit-search-cancel-button]:hidden',
          value && 'pr-9',
        )}
      />
      {value ? (
        <button
          type="button"
          aria-label={m.clearSearch()}
          onClick={() => onChange('')}
          className="absolute top-1/2 right-2 grid size-6 -translate-y-1/2 place-items-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
        >
          <XIcon className="size-3.5" />
        </button>
      ) : null}
    </div>
  )

  if (!segments) return field

  return (
    <div className={cn('flex flex-wrap-reverse items-center gap-3', className)}>
      {field}
      <Segmented
        aria-label={segments.label}
        value={segments.value}
        onChange={segments.onChange}
        options={segments.options}
      />
    </div>
  )
}
