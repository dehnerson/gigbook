import { convexQuery } from '@convex-dev/react-query'
import { createFileRoute } from '@tanstack/react-router'
import { api } from '../../../../../../convex/_generated/api'
import type { Id } from '../../../../../../convex/_generated/dataModel'
import { ReviewPage } from '@/screens/import-review'

export const Route = createFileRoute('/_authed/w/$workspace/import/$draftId')({
  loader: ({ context, params }) =>
    context.load(
      convexQuery(api.importDrafts.get, {
        draftId: params.draftId as Id<'importDrafts'>,
      }),
    ),
  component: ReviewPage,
})