'use client'

import * as React from 'react'
import { cva } from 'class-variance-authority'
import { cn } from 'cn'
import {
  composeRenderProps,
  MenuItem as MenuItemPrimitive,
  Menu as MenuPrimitive,
  MenuTrigger as MenuTriggerPrimitive,
  Popover as PopoverPrimitive,
  Separator as SeparatorPrimitive,
} from 'react-aria-components'
import type { MenuItemProps as MenuItemPrimitiveProps } from 'react-aria-components'
import { CheckIcon } from 'lucide-react'

function DropdownMenuTrigger({
  ...props
}: React.ComponentProps<typeof MenuTriggerPrimitive>) {
  return <MenuTriggerPrimitive data-slot="dropdown-menu-trigger" {...props} />
}

function DropdownMenu({
  'data-slot': dataSlot = 'dropdown-menu-content',
  placement = 'bottom start',
  offset = 4,
  crossOffset = 0,
  className,
  children,
  ...props
}: Omit<
  React.ComponentProps<typeof MenuPrimitive<object>>,
  'children' | 'className'
> &
  Pick<
    React.ComponentProps<typeof PopoverPrimitive>,
    'placement' | 'offset' | 'crossOffset'
  > & {
    'data-slot'?: string
    className?: string
    children?: React.ReactNode
  }) {
  return (
    <PopoverPrimitive
      data-slot={dataSlot}
      placement={placement}
      offset={offset}
      crossOffset={crossOffset}
      className={cn(
        'z-50 w-(--trigger-width) min-w-32 origin-(--trigger-anchor-point) overflow-x-hidden overflow-y-auto rounded-lg bg-popover p-1 text-popover-foreground shadow-md ring-1 ring-foreground/10 duration-100 outline-none data-entering:animate-in data-entering:fade-in-0 data-entering:zoom-in-95 data-exiting:animate-out data-exiting:overflow-hidden data-exiting:fade-out-0 data-exiting:zoom-out-95 data-[placement=bottom]:slide-in-from-top-2 data-[placement=left]:slide-in-from-right-2 data-[placement=right]:slide-in-from-left-2 data-[placement=top]:slide-in-from-bottom-2 **:data-[slot$=-item]:data-focused:bg-foreground/10',
        className,
      )}
    >
      <MenuPrimitive
        className="max-h-[inherit] overflow-x-hidden overflow-y-auto outline-hidden"
        {...props}
      >
        {children}
      </MenuPrimitive>
    </PopoverPrimitive>
  )
}

const dropdownMenuItemVariants = cva(
  'group/dropdown-menu-item relative flex cursor-default items-center outline-hidden select-none data-disabled:pointer-events-none data-disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0',
  {
    variants: {
      selectionMode: {
        none: "gap-1.5 rounded-md px-1.5 py-1 text-sm focus:bg-accent focus:text-accent-foreground not-data-[variant=destructive]:focus:**:text-accent-foreground data-inset:pl-7 data-[variant=destructive]:text-destructive data-[variant=destructive]:focus:bg-destructive/10 data-[variant=destructive]:focus:text-destructive dark:data-[variant=destructive]:focus:bg-destructive/20 [&_svg:not([class*='size-'])]:size-4 data-[variant=destructive]:*:[svg]:text-destructive",
        single:
          "gap-1.5 rounded-md py-1 pr-8 pl-1.5 text-sm focus:bg-accent focus:text-accent-foreground focus:**:text-accent-foreground data-inset:pl-7 [&_svg:not([class*='size-'])]:size-4",
        multiple:
          "gap-1.5 rounded-md py-1 pr-8 pl-1.5 text-sm focus:bg-accent focus:text-accent-foreground focus:**:text-accent-foreground data-inset:pl-7 [&_svg:not([class*='size-'])]:size-4",
      },
    },
  },
)

function DropdownMenuItem({
  className,
  inset,
  variant = 'default',
  children,
  ...props
}: MenuItemPrimitiveProps<object> & {
  inset?: boolean
  variant?: 'default' | 'destructive'
}) {
  return (
    <MenuItemPrimitive
      data-slot="dropdown-menu-item"
      data-inset={inset}
      data-variant={variant}
      textValue={typeof children === 'string' ? children : props.textValue}
      className={composeRenderProps(className, (className, { selectionMode }) =>
        cn(dropdownMenuItemVariants({ selectionMode }), className),
      )}
      {...props}
    >
      {composeRenderProps(
        children,
        (children, { isSelected, selectionMode }) => (
          <>
            {selectionMode !== 'none' ? (
              <span
                className="pointer-events-none absolute right-2 flex items-center justify-center"
                data-slot={
                  selectionMode === 'single'
                    ? 'dropdown-menu-radio-item-indicator'
                    : 'dropdown-menu-checkbox-item-indicator'
                }
              >
                {isSelected ? <CheckIcon /> : null}
              </span>
            ) : null}
            {children}
          </>
        ),
      )}
    </MenuItemPrimitive>
  )
}

function DropdownMenuSeparator({
  className,
  ...props
}: React.ComponentProps<typeof SeparatorPrimitive>) {
  return (
    <SeparatorPrimitive
      data-slot="dropdown-menu-separator"
      className={cn('-mx-1 my-1 h-px bg-border', className)}
      {...props}
    />
  )
}

export {
  DropdownMenuTrigger,
  DropdownMenu,
  DropdownMenuItem,
  DropdownMenuSeparator,
}
