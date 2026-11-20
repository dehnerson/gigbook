import { createFileRoute } from '@tanstack/react-router'
import { SongPage } from '@/routes/_authed/songs/$songId'

export const Route = createFileRoute('/_authed/$workspace/songs/$songId')({
  component: SongPage,
})
