import { convexQuery } from '@convex-dev/react-query'
import { createFileRoute } from '@tanstack/react-router'
import { api } from '../../../../../../convex/_generated/api'
import { ImportPage } from '@/screens/import'

export const Route = createFileRoute('/_authed/w/$workspace/import/')({
  loader: ({ context }) => context.load(convexQuery(api.songs.catalog, {})),
  component: ImportPage,
})
