import { createFileRoute } from '@tanstack/react-router'
import {
  PlayPage,
  playSearch,
} from '@/routes/_authed/versions/$versionId/play'

export const Route = createFileRoute('/_authed/$workspace/versions/$versionId/play')({
  validateSearch: playSearch,
  component: PlayPage,
})
