import type * as React from 'react'
import { cn } from 'cn'
import { CheckIcon, ChevronsUpDownIcon } from 'lucide-react'
import {
  Button,
  Label,
  ListBox,
  ListBoxItem,
  Popover,
  Select as SelectPrimitive,
  SelectValue,
} from 'react-aria-components'
import type { Key } from 'react-aria-components'

export type SelectOption = {
  id: string
  label: string
  description?: string
  textValue?: string
  isDisabled?: boolean
}

function Select({
  value,
  onChange,
  options,
  label,
  placeholder,
  className,
  triggerClassName,
  isDisabled,
  'aria-label': ariaLabel,
}: {
  value: string | null
  onChange: (value: string) => void
  options: Array<SelectOption>
  label?: string
  placeholder?: string
  className?: string
  triggerClassName?: string
  isDisabled?: boolean
  'aria-label'?: string
}) {
  return (
    <SelectPrimitive
      data-slot="select"
      value={value === '' ? null : value}
      onChange={(key: Key | null) => {
        if (key !== null) onChange(String(key))
      }}
      placeholder={placeholder}
      isDisabled={isDisabled}
      aria-label={ariaLabel}
      className={cn('group/select flex min-w-0 flex-col gap-1.5', className)}
    >
      {label ? (
        <Label className="text-sm font-medium text-foreground">{label}</Label>
      ) : null}
      <Button
        className={cn(
          'flex h-9 w-full min-w-0 items-center justify-between gap-2 rounded-lg border border-input bg-transparent px-3 text-left text-sm transition-colors outline-none hover:bg-muted/50 data-disabled:opacity-50 data-focus-visible:border-ring data-focus-visible:ring-3 data-focus-visible:ring-ring/50 dark:bg-input/30 dark:hover:bg-input/50',
          triggerClassName,
        )}
      >
        <SelectValue className="min-w-0 flex-1 truncate data-placeholder:text-muted-foreground [&_[data-slot=select-description]]:hidden" />
        <ChevronsUpDownIcon className="size-4 shrink-0 text-muted-foreground" />
      </Button>
      <SelectPopover>
        <ListBox items={options} className="outline-none">
          {(option) => <SelectItem option={option} />}
        </ListBox>
      </SelectPopover>
    </SelectPrimitive>
  )
}

function SelectPopover({ children }: { children: React.ReactNode }) {
  return (
    <Popover
      offset={4}
      className="z-50 max-h-72 w-(--trigger-width) min-w-40 overflow-y-auto rounded-lg bg-popover p-1 text-popover-foreground shadow-lg ring-1 ring-foreground/10 outline-none data-entering:animate-in data-entering:fade-in-0 data-entering:zoom-in-95 data-exiting:animate-out data-exiting:fade-out-0"
    >
      {children}
    </Popover>
  )
}

function SelectItem({ option }: { option: SelectOption }) {
  return (
    <ListBoxItem
      id={option.id}
      textValue={
        option.textValue ??
        [option.label, option.description].filter(Boolean).join(' ')
      }
      isDisabled={option.isDisabled}
      className="group/item relative flex cursor-default flex-col rounded-md py-1.5 pr-8 pl-2 text-sm outline-none select-none data-disabled:opacity-50 data-focused:bg-accent data-focused:text-accent-foreground"
    >
      {({ isSelected }) => (
        <>
          <span className="truncate">{option.label}</span>
          {option.description ? (
            <span
              data-slot="select-description"
              className="truncate text-xs text-muted-foreground"
            >
              {option.description}
            </span>
          ) : null}
          {isSelected ? (
            <CheckIcon className="absolute top-1/2 right-2 size-4 -translate-y-1/2 text-primary" />
          ) : null}
        </>
      )}
    </ListBoxItem>
  )
}

export { Select, SelectItem, SelectPopover }
