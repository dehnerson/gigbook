import { Link } from '@tanstack/react-router'
import { CompassIcon, GuitarIcon, TriangleAlertIcon } from 'lucide-react'
import { messageFor } from '@/lib/errors'
import { m } from '@/paraglide/messages'
import { buttonVariants } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'

function Centered({
  icon: Icon,
  title,
  description,
}: {
  icon: React.ComponentType<{ className?: string }>
  title: string
  description?: string
}) {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 px-6 text-center">
      <div className="grid size-14 place-items-center rounded-2xl bg-primary/10 text-primary ring-1 ring-primary/20">
        <Icon className="size-6" />
      </div>
      <div className="space-y-1.5">
        <h1 className="text-xl font-semibold">{title}</h1>
        {description ? (
          <p className="max-w-sm text-sm text-muted-foreground">
            {description}
          </p>
        ) : null}
      </div>
      <Link to="/" className={buttonVariants({ variant: 'outline' })}>
        {m.backToLibrary()}
      </Link>
    </div>
  )
}

export function RouteError({ error }: { error: unknown }) {
  return (
    <Centered
      icon={TriangleAlertIcon}
      title={m.somethingWrong()}
      description={messageFor(error)}
    />
  )
}

export function RouteNotFound() {
  return (
    <Centered
      icon={CompassIcon}
      title={m.notFoundTitle()}
      description={m.errorNotFound()}
    />
  )
}

export function RoutePending() {
  return (
    <div
      className="grid min-h-dvh place-items-center"
      role="status"
      aria-live="polite"
      aria-busy="true"
    >
      <span className="grid size-16 animate-logo-pulse place-items-center rounded-2xl bg-primary text-primary-foreground shadow-[0_0_40px_-6px_var(--primary)] motion-reduce:animate-none">
        <GuitarIcon className="size-8" />
      </span>
      <span className="sr-only">{m.appName()}</span>
    </div>
  )
}

export function ListSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="space-y-2" aria-busy>
      {Array.from({ length: rows }, (_, index) => (
        <Skeleton key={index} className="h-16 w-full rounded-xl" />
      ))}
    </div>
  )
}

export function DetailSkeleton() {
  return (
    <div className="grid gap-4 md:grid-cols-2" aria-busy>
      <Skeleton className="h-36 w-full rounded-xl" />
      <Skeleton className="h-36 w-full rounded-xl" />
    </div>
  )
}

export function SheetSkeleton() {
  return (
    <div className="space-y-6" aria-busy>
      <Skeleton className="h-10 w-2/3" />
      <Skeleton className="h-[28rem] w-full rounded-xl" />
    </div>
  )
}
