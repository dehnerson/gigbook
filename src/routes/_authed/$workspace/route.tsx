import { createFileRoute, Outlet } from '@tanstack/react-router'
import { RouteNotFound } from '@/components/app/route-states'
import { useWorkspace } from '@/lib/workspace'

export const Route = createFileRoute('/_authed/$workspace')({
  component: WorkspaceFrame,
})

function WorkspaceFrame() {
  const { current, all, bandsReady } = useWorkspace()
  if (bandsReady && !all.some((item) => item.key === current.key))
    return <RouteNotFound />
  return <Outlet />
}
