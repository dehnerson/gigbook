import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useForm } from '@tanstack/react-form'
import { useCompletePasswordRecovery } from '@convex-dev/auth/methods/email-password/react'
import { useEffect, useState } from 'react'
import { api } from '../../convex/_generated/api'
import { FormInput } from '@/components/app/form-field'
import { AuthScreen } from '@/components/auth/auth-screen'
import { RoutePending } from '@/components/app/route-states'
import { Button } from '@/components/ui/button'
import { newPasswordSchema } from '@/lib/auth-schema'
import { authMessage } from '@/lib/auth-message'
import { RETURN_KEY, safeNext } from '@/lib/return-path'
import { m } from '@/paraglide/messages'

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

function ResetPasswordScreen({ code }: { code: string }) {
  const state = useCompletePasswordRecovery(api.auth, { emailCode: code })
  const navigate = useNavigate()
  useEffect(() => {
    if (state.status !== 'complete') return
    void navigate({ href: safeNext(sessionStorage.getItem(RETURN_KEY)) })
  }, [navigate, state.status])
  return (
    <AuthScreen title={m.resetPassword()}>
      {state.status === 'loading' || state.status === 'complete' ? (
        <RoutePending />
      ) : state.status === 'error' ? (
        <p role="alert" className="text-sm text-destructive">
          {authMessage(state.userError)}
        </p>
      ) : (
        <ResetPasswordForm
          pending={state.pending}
          onSubmit={state.completePasswordRecovery}
        />
      )}
    </AuthScreen>
  )
}

function ResetPasswordForm({
  pending,
  onSubmit,
}: {
  pending: boolean
  onSubmit: (args: { newPassword: string }) => Promise<{
    status: string
    userError?: Parameters<typeof authMessage>[0]
  }>
}) {
  const [error, setError] = useState<string | null>(null)
  const form = useForm({
    defaultValues: { password: '' },
    validators: { onSubmit: newPasswordSchema },
    onSubmit: async ({ value }) => {
      setError(null)
      const result = await onSubmit({ newPassword: value.password })
      if (result.status === 'error') setError(authMessage(result.userError))
    },
  })
  return (
    <form
      className="grid gap-3"
      onSubmit={(event) => {
        event.preventDefault()
        void form.handleSubmit()
      }}
    >
      <form.Field name="password">
        {(field) => (
          <FormInput
            field={field}
            label={m.newPassword()}
            type="password"
            autoComplete="new-password"
          />
        )}
      </form.Field>
      {error ? (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      ) : null}
      <Button type="submit" isDisabled={pending}>
        {m.resetPassword()}
      </Button>
    </form>
  )
}
