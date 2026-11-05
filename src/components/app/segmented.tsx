import { cn } from 'cn'
import type * as React from 'react'
import { ToggleButton, ToggleButtonGroup } from 'react-aria-components'

export function Segmented<T extends string>({
  value,
  onChange,
  options,
  size = 'default',
  className,
  'aria-label': ariaLabel,
}: {
  value: T
  onChange: (value: T) => void
  options: Array<{
    id: T
    label: React.ReactNode
    icon?: React.ComponentType<{ className?: string }>
  }>
  size?: 'sm' | 'default'
  className?: string
  'aria-label': string
}) {
  return (
    <ToggleButtonGroup
      aria-label={ariaLabel}
      selectionMode="single"
      disallowEmptySelection
      selectedKeys={[value]}
      onSelectionChange={(keys) => {
        const next = [...keys].at(0)
        if (next !== undefined) onChange(String(next) as T)
      }}
      className={cn(
        'inline-flex items-center gap-0.5 rounded-xl border bg-muted/40 p-1',
        className,
      )}
    >
      {options.map((option) => (
        <ToggleButton
          key={option.id}
          id={option.id}
          className={cn(
            'inline-flex flex-1 items-center justify-center gap-1.5 rounded-lg font-medium whitespace-nowrap text-muted-foreground transition-colors outline-none hover:text-foreground data-focus-visible:ring-2 data-focus-visible:ring-ring data-selected:bg-background data-selected:text-foreground data-selected:shadow-sm dark:data-selected:bg-raised',
            size === 'sm' ? 'h-7 px-2.5 text-xs' : 'h-8 px-3 text-sm',
          )}
        >
          {option.icon ? <option.icon className="size-4" /> : null}
          {option.label}
        </ToggleButton>
      ))}
    </ToggleButtonGroup>
  )
}
