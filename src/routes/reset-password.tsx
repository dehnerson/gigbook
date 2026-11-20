import { createFileRoute } from '@tanstack/react-router'
import { ResetPasswordScreen } from '@/components/reset-password-screen'

export const Route = createFileRoute('/reset-password')({
  validateSearch: (search: Record<string, unknown>) => ({
    code: typeof search.code === 'string' ? search.code : '',
  }),
  component: ResetPasswordPage,
})

function ResetPasswordPage() {
  const { code } = Route.useSearch()
  return <ResetPasswordScreen code={code} />
}
