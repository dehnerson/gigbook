import { createFileRoute, Outlet, redirect } from '@tanstack/react-router'
import { Shell } from '@/components/shell'

export const Route = createFileRoute('/_authed')({
  beforeLoad: ({ context }) => {
    if (!context.userId) throw redirect({ to: '/sign-in' })
  },
  component: () => (
    <Shell>
      <Outlet />
    </Shell>
  ),
})
