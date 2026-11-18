import { useNavigate, useRouterState } from '@tanstack/react-router'
import { path, trailFromPath } from '@/lib/space'
import type { Dest, Trail } from '@/lib/space'

export function useTrail(): Trail {
  const pathname = useRouterState({
    select: (state) => state.location.pathname,
  })
  return trailFromPath(pathname)
}

export function useGo() {
  const trail = useTrail()
  const navigate = useNavigate()
  const href = (dest: Dest) => path(trail, dest)
  return {
    trail,
    href,
    go: (dest: Dest, replace = false) => navigate({ href: href(dest), replace }),
  }
}
