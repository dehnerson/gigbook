import { convexQuery } from '@convex-dev/react-query'
import { createFileRoute } from '@tanstack/react-router'
import { api } from '../../../../../../convex/_generated/api'
import type { Id } from '../../../../../../convex/_generated/dataModel'
import { SongPage } from '@/routes/_authed/songs/$songId'
import { bandIdFromPath } from '@/lib/space'

export const Route = createFileRoute('/_authed/w/$workspace/songs/$songId')({
  loader: ({ context, params }) =>
    context.load(
      convexQuery(api.songs.get, {
        songId: params.songId as Id<'songs'>,
        bandId: bandIdFromPath(params.workspace),
      }),
    ),
  component: SongPage,
})
