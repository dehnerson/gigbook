import { createLink } from '@tanstack/react-router'
import { cn } from 'cn'
import { ChevronRightIcon } from 'lucide-react'
import * as React from 'react'

const CrumbAnchor = React.forwardRef<
  HTMLAnchorElement,
  React.AnchorHTMLAttributes<HTMLAnchorElement>
>(({ className, ...props }, ref) => (
  <a
    ref={ref}
    className={cn(
      'truncate text-muted-foreground transition-colors hover:text-foreground',
      className,
    )}
    {...props}
  />
))

export const Crumb = createLink(CrumbAnchor)

export function PageHeader({
  title,
  subtitle,
  eyebrow,
  breadcrumbs,
  actions,
  className,
}: {
  title: React.ReactNode
  subtitle?: React.ReactNode
  eyebrow?: React.ReactNode
  breadcrumbs?: React.ReactNode
  actions?: React.ReactNode
  className?: string
}) {
  const crumbs = React.Children.toArray(breadcrumbs)
  return (
    <header className={cn('mb-8 space-y-3', className)}>
      {crumbs.length > 0 ? (
        <nav
          aria-label="Breadcrumb"
          className="flex min-w-0 items-center gap-1 text-sm"
        >
          {crumbs.map((crumb, index) => (
            <React.Fragment key={index}>
              {index > 0 ? (
                <ChevronRightIcon className="size-3.5 shrink-0 text-muted-foreground/60" />
              ) : null}
              {crumb}
            </React.Fragment>
          ))}
        </nav>
      ) : null}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="min-w-0 space-y-1">
          {eyebrow ? (
            <div className="text-xs font-semibold tracking-widest text-primary uppercase">
              {eyebrow}
            </div>
          ) : null}
          <h1 className="text-3xl font-semibold tracking-tight text-balance sm:text-4xl">
            {title}
          </h1>
          {subtitle ? (
            <div className="text-base text-muted-foreground">{subtitle}</div>
          ) : null}
        </div>
        {actions ? (
          <div className="flex flex-wrap items-center gap-2">{actions}</div>
        ) : null}
      </div>
    </header>
  )
}

export function SectionTitle({
  children,
  action,
  className,
}: {
  children: React.ReactNode
  action?: React.ReactNode
  className?: string
}) {
  return (
    <div
      className={cn('mb-3 flex items-center justify-between gap-3', className)}
    >
      <h2 className="text-sm font-semibold tracking-wide text-muted-foreground uppercase">
        {children}
      </h2>
      {action}
    </div>
  )
}
