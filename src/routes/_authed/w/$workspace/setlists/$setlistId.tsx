import { convexQuery } from '@convex-dev/react-query'
import { createFileRoute } from '@tanstack/react-router'
import { api } from '../../../../../../convex/_generated/api'
import type { Id } from '../../../../../../convex/_generated/dataModel'
import { SetlistPage } from '@/screens/setlist'

export const Route = createFileRoute('/_authed/w/$workspace/setlists/$setlistId')({
  loader: ({ context, params }) =>
    context.load(
      convexQuery(api.setlists.get, {
        setlistId: params.setlistId as Id<'setlists'>,
      }),
    ),
  component: SetlistPage,
})
