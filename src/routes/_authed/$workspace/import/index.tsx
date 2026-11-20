import { createFileRoute } from '@tanstack/react-router'
import { ImportPage } from '@/screens/import'

export const Route = createFileRoute('/_authed/$workspace/import/')({
  component: ImportPage,
})
