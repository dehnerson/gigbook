import { createFileRoute } from '@tanstack/react-router'
import { useCompleteChangeEmail } from '@convex-dev/auth/methods/email-password/react'
import { api } from '../../convex/_generated/api'
import { AuthScreen } from '@/components/auth/auth-screen'
import { RoutePending } from '@/components/app/route-states'
import { authMessage } from '@/lib/auth-message'
import { m } from '@/paraglide/messages'

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

function ConfirmEmailScreen({ code }: { code: string }) {
  const state = useCompleteChangeEmail(api.auth, { emailCode: code })
  return (
    <AuthScreen title={m.email()}>
      {state.status === 'loading' ? (
        <RoutePending />
      ) : state.status === 'complete' ? (
        <p className="text-sm text-muted-foreground">{m.emailChanged()}</p>
      ) : (
        <p role="alert" className="text-sm text-destructive">
          {authMessage(state.userError)}
        </p>
      )}
    </AuthScreen>
  )
}
