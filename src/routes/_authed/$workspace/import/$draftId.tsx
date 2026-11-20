import { createFileRoute } from '@tanstack/react-router'
import { ReviewPage } from '@/screens/import-review'

export const Route = createFileRoute('/_authed/$workspace/import/$draftId')({
  component: ReviewPage,
})