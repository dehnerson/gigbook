import { createFileRoute, redirect } from '@tanstack/react-router'
import { MembersPage } from '@/screens/members'
import { PERSONAL, path, workspaceTrail } from '@/lib/space'
import { useRouteHome } from '@/lib/workspace'

export const Route = createFileRoute('/_authed/$workspace/members')({
  beforeLoad: ({ params }) => {
    if (params.workspace === PERSONAL)
      throw redirect({
        href: path(workspaceTrail(PERSONAL), { page: 'members' }),
      })
  },
  component: WorkspaceMembersRoute,
})

function WorkspaceMembersRoute() {
  return <MembersPage home={useRouteHome()} />
}
