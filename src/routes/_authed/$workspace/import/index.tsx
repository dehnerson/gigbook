import { createFileRoute } from '@tanstack/react-router'
import { ImportPage } from '@/screens/import'
import { useRouteWorkspace } from '@/lib/workspace'

export const Route = createFileRoute('/_authed/$workspace/import/')({
  component: WorkspaceImportRoute,
})

function WorkspaceImportRoute() {
  return <ImportPage workspace={useRouteWorkspace()} />
}
