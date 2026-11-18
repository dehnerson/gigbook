import { convexQuery } from '@convex-dev/react-query'
import { createFileRoute } from '@tanstack/react-router'
import { api } from '../../../../../../../convex/_generated/api'
import type { Id } from '../../../../../../../convex/_generated/dataModel'
import {
  PlayPage,
  playSearch,
} from '@/routes/_authed/versions/$versionId/play'

export const Route = createFileRoute('/_authed/w/$workspace/versions/$versionId/play')({
  validateSearch: playSearch,
  loader: ({ context, params }) =>
    context.load(
      convexQuery(api.versions.getBundle, {
        versionId: params.versionId as Id<'versions'>,
      }),
    ),
  component: PlayPage,
})
