import { Link } from '@tanstack/react-router'
import { CompassIcon, TriangleAlertIcon } from 'lucide-react'
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
    <div className="space-y-6" aria-busy>
      <div className="space-y-3">
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-9 w-72" />
        <Skeleton className="h-4 w-48" />
      </div>
      <div className="space-y-2">
        {Array.from({ length: 5 }, (_, index) => (
          <Skeleton key={index} className="h-16 w-full rounded-xl" />
        ))}
      </div>
    </div>
  )
}
