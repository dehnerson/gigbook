import { cn } from 'cn'
import { ChevronsUpDownIcon, SearchIcon } from 'lucide-react'
import {
  Button,
  ComboBox as ComboBoxPrimitive,
  Group,
  Input,
  Label,
  ListBox,
} from 'react-aria-components'
import type { Key } from 'react-aria-components'
import { SelectItem, SelectPopover } from './select'
import type { SelectOption } from './select'

function ComboBox({
  value,
  onChange,
  options,
  label,
  placeholder,
  className,
  emptyText,
  'aria-label': ariaLabel,
}: {
  value: string | null
  onChange: (value: string | null) => void
  options: Array<SelectOption>
  label?: string
  placeholder?: string
  className?: string
  emptyText?: string
  'aria-label'?: string
}) {
  return (
    <ComboBoxPrimitive
      data-slot="combobox"
      defaultItems={options}
      value={value === '' ? null : value}
      onChange={(key: Key | null) =>
        onChange(key === null ? null : String(key))
      }
      menuTrigger="focus"
      aria-label={ariaLabel}
      className={cn('group/combobox flex flex-col gap-1.5', className)}
    >
      {label ? (
        <Label className="text-sm font-medium text-foreground">{label}</Label>
      ) : null}
      <Group className="flex h-9 w-full items-center gap-2 rounded-lg border border-input bg-transparent px-3 transition-colors data-focus-within:border-ring data-focus-within:ring-3 data-focus-within:ring-ring/50 dark:bg-input/30">
        <SearchIcon className="size-4 shrink-0 text-muted-foreground" />
        <Input
          placeholder={placeholder}
          className="h-full min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
        />
        <Button className="text-muted-foreground outline-none">
          <ChevronsUpDownIcon className="size-4" />
        </Button>
      </Group>
      <SelectPopover>
        <ListBox
          className="outline-none"
          renderEmptyState={() => (
            <p className="px-2 py-3 text-center text-sm text-muted-foreground">
              {emptyText}
            </p>
          )}
        >
          {(option: SelectOption) => <SelectItem option={option} />}
        </ListBox>
      </SelectPopover>
    </ComboBoxPrimitive>
  )
}

export { ComboBox }
