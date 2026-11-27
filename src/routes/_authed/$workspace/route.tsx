import { convexQuery } from '@convex-dev/react-query'
import { createFileRoute, notFound, Outlet } from '@tanstack/react-router'
import { api } from '../../../../convex/_generated/api'
import { waitForSession } from '@/lib/auth-gate'
import { PERSONAL } from '@/lib/workspace'

export const Route = createFileRoute('/_authed/$workspace')({
  // A server pass has no local session. Skipping it here lets the client
  // beforeLoad decide, instead of dehydrating this match as found.
  ssr: false,
  beforeLoad: async ({ context, params }) => {
    if (typeof window === 'undefined') return
    const signedIn = await waitForSession()
    if (!signedIn) return
    if (params.workspace === PERSONAL) return
    const bands = await context.queryClient.ensureQueryData(
      convexQuery(api.bands.list, {}),
    )
    if (!bands.some((row) => row.band._id === params.workspace))
      throw notFound()
  },
  component: WorkspaceLayout,
})

function WorkspaceLayout() {
  return <Outlet />
}
