import { cn } from 'cn'
import type * as React from 'react'

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  className,
}: {
  icon: React.ComponentType<{ className?: string }>
  title: React.ReactNode
  description?: React.ReactNode
  action?: React.ReactNode
  className?: string
}) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center gap-4 rounded-2xl border border-dashed bg-card/40 px-6 py-14 text-center',
        className,
      )}
    >
      <div className="grid size-14 place-items-center rounded-2xl bg-primary/10 text-primary ring-1 ring-primary/20">
        <Icon className="size-6" />
      </div>
      <div className="max-w-sm space-y-1.5">
        <h3 className="text-lg font-semibold">{title}</h3>
        {description ? (
          <p className="text-sm text-muted-foreground">{description}</p>
        ) : null}
      </div>
      {action ? (
        <div className="flex flex-wrap justify-center gap-2">{action}</div>
      ) : null}
    </div>
  )
}
