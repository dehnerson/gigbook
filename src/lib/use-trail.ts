import { useRouterState } from '@tanstack/react-router'
import { trailFromPath } from '@/lib/space'
import type { Trail } from '@/lib/space'

/** The shell reads the URL because it is mounted above every route. */
export function useTrail(): Trail {
  const pathname = useRouterState({
    select: (state) => state.location.pathname,
  })
  return trailFromPath(pathname)
}
