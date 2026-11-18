import { createFileRoute, redirect } from '@tanstack/react-router'
import { MembersPage } from '@/screens/members'
import { PERSONAL, path, workspaceTrail } from '@/lib/space'

export const Route = createFileRoute('/_authed/w/$workspace/members')({
  beforeLoad: ({ params }) => {
    if (params.workspace === PERSONAL)
      throw redirect({
        href: path(workspaceTrail(PERSONAL), { page: 'members' }),
      })
  },
  component: MembersPage,
})
