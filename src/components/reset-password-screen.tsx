import { useCompletePasswordRecovery } from '@convex-dev/auth/methods/email-password/react'
import { useNavigate } from '@tanstack/react-router'
import { useEffect, useState } from 'react'
import { api } from '../../convex/_generated/api'
import { Field } from '@/components/app/field'
import { AuthScreen } from '@/components/auth-screen'
import { RoutePending } from '@/components/app/route-states'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { authMessage } from '@/lib/auth-message'
import { RETURN_KEY, safeNext } from '@/lib/return-path'
import { m } from '@/paraglide/messages'

export function ResetPasswordScreen({ code }: { code: string }) {
  const state = useCompletePasswordRecovery(api.auth, { emailCode: code })
  const navigate = useNavigate()
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
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
        <form
          className="grid gap-3"
          onSubmit={(event) => {
            event.preventDefault()
            setError(null)
            void state.completePasswordRecovery({ newPassword: password }).then(
              (result) => {
                if (result.status === 'error')
                  setError(authMessage(result.userError))
              },
            )
          }}
        >
          <Field label={m.newPassword()}>
            <Input
              type="password"
              required
              autoComplete="new-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
            />
          </Field>
          {error ? (
            <p role="alert" className="text-sm text-destructive">
              {error}
            </p>
          ) : null}
          <Button type="submit" isDisabled={state.pending}>
            {m.resetPassword()}
          </Button>
        </form>
      )}
    </AuthScreen>
  )
}
