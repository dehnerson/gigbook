import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useCompleteSignUpWithEmailPassword } from '@convex-dev/auth/methods/email-password/react'
import { useEffect } from 'react'
import { api } from '../../convex/_generated/api'
import { AuthScreen } from '@/components/auth/auth-screen'
import { RoutePending } from '@/components/app/route-states'
import { authMessage } from '@/lib/auth-message'
import { RETURN_KEY, safeNext } from '@/lib/return-path'
import { m } from '@/paraglide/messages'

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

function ValidateEmailScreen({ code }: { code: string }) {
  const state = useCompleteSignUpWithEmailPassword(api.auth, {
    emailCode: code,
  })
  const navigate = useNavigate()
  useEffect(() => {
    if (state.status !== 'complete') return
    void navigate({ href: safeNext(sessionStorage.getItem(RETURN_KEY)) })
  }, [navigate, state.status])
  return (
    <AuthScreen title={m.signUp()}>
      {state.status === 'loading' || state.status === 'complete' ? (
        <RoutePending />
      ) : (
        <p role="alert" className="text-sm text-destructive">
          {authMessage(state.userError)}
        </p>
      )}
    </AuthScreen>
  )
}
