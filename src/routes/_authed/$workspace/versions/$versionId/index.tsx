import { createFileRoute } from '@tanstack/react-router'
import { ReadPage } from '@/routes/_authed/versions/$versionId/index'

export const Route = createFileRoute('/_authed/$workspace/versions/$versionId/')({
  component: ReadPage,
})
