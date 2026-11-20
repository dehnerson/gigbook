import { createFileRoute } from '@tanstack/react-router'
import { ConfirmAddPasswordScreen } from '@/screens/auth/confirm-add-password'

export const Route = createFileRoute('/confirm-add-password')({
  validateSearch: (search: Record<string, unknown>) => ({
    code: typeof search.code === 'string' ? search.code : '',
  }),
  component: ConfirmAddPasswordPage,
})

function ConfirmAddPasswordPage() {
  const { code } = Route.useSearch()
  return <ConfirmAddPasswordScreen code={code} />
}
