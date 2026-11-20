import { createFileRoute } from '@tanstack/react-router'
import { ConfirmEmailScreen } from '@/components/confirm-email-screen'

export const Route = createFileRoute('/confirm-email-change')({
  validateSearch: (search: Record<string, unknown>) => ({
    code: typeof search.code === 'string' ? search.code : '',
  }),
  component: ConfirmEmailPage,
})

function ConfirmEmailPage() {
  const { code } = Route.useSearch()
  return <ConfirmEmailScreen code={code} />
}
