import { createFileRoute } from '@tanstack/react-router'
import { EditPage } from '@/routes/_authed/versions/$versionId/edit'

export const Route = createFileRoute('/_authed/$workspace/versions/$versionId/edit')({
  component: EditPage,
})
