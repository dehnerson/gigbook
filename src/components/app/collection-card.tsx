import { Link } from '@tanstack/react-router'
import type { LinkProps } from '@tanstack/react-router'
import { cn } from 'cn'
import type * as React from 'react'

export function CollectionCard({
  leading,
  trailing,
  title,
  children,
  footer,
  actions,
  ...link
}: {
  leading?: React.ReactNode
  trailing?: React.ReactNode
  title: React.ReactNode
  children?: React.ReactNode
  footer?: React.ReactNode
  actions?: React.ReactNode
} & LinkProps) {
  return (
    <li className="group relative flex flex-col gap-4 rounded-2xl border bg-card p-5 transition-colors hover:border-foreground/15">
      {leading ? (
        <div className="flex items-start justify-between gap-3">
          {leading}
          {trailing}
        </div>
      ) : null}
      <div className="flex min-w-0 items-start justify-between gap-3">
        <div className="min-w-0">
          <Link
            {...link}
            className="block truncate text-lg font-semibold outline-none after:absolute after:inset-0 after:rounded-2xl focus-visible:after:ring-2 focus-visible:after:ring-ring"
          >
            {title}
          </Link>
          {children ? (
            <div className="text-sm text-muted-foreground">{children}</div>
          ) : null}
        </div>
        {!leading && trailing ? (
          <div className="shrink-0">{trailing}</div>
        ) : null}
      </div>
      {footer ? (
        <div className={cn('min-w-0', !actions && 'mt-auto')}>{footer}</div>
      ) : null}
      {actions ? (
        <div className="relative z-10 mt-auto flex items-center gap-2">
          {actions}
        </div>
      ) : null}
    </li>
  )
}
