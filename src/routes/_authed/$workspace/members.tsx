import { createFileRoute, redirect } from '@tanstack/react-router'
import { MembersPage } from '@/screens/members'
import { PERSONAL, path, workspace } from '@/lib/space'
import { useRouteWorkspace } from '@/lib/workspace'

export const Route = createFileRoute('/_authed/$workspace/members')({
  beforeLoad: ({ params }) => {
    if (params.workspace === PERSONAL)
      throw redirect({
        href: path(workspace(PERSONAL), { page: 'members' }),
      })
  },
  component: WorkspaceMembersRoute,
})

function WorkspaceMembersRoute() {
  return <MembersPage workspace={useRouteWorkspace()} />
}
