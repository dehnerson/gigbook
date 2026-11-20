import { createFileRoute } from '@tanstack/react-router'
import { ValidateEmailScreen } from '@/screens/auth/validate-email'

export const Route = createFileRoute('/validate-email')({
  validateSearch: (search: Record<string, unknown>) => ({
    code: typeof search.code === 'string' ? search.code : '',
  }),
  component: ValidateEmailPage,
})

function ValidateEmailPage() {
  const { code } = Route.useSearch()
  return <ValidateEmailScreen code={code} />
}
