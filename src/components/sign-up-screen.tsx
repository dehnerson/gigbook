import { useSignUpWithEmailPassword } from '@convex-dev/auth/methods/email-password/react'
import { Link } from '@tanstack/react-router'
import { useState } from 'react'
import { api } from '../../convex/_generated/api'
import { Field } from '@/components/app/field'
import { AuthScreen, OauthButtons, useReturnTo } from '@/components/auth-screen'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { authMessage } from '@/lib/auth-message'
import { built } from '@/lib/built'
import { m } from '@/paraglide/messages'

export function SignUpScreen() {
  const returnTo = useReturnTo()
  const { signUp, pending } = useSignUpWithEmailPassword(api.auth)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [sent, setSent] = useState(false)

  return (
    <AuthScreen title={m.signUp()}>
      <OauthButtons />
      <p className="text-center text-xs text-muted-foreground">{m.orDivider()}</p>
      {sent ? (
        <p className="text-sm text-muted-foreground">
          {m.validateEmailSent({ email })}
        </p>
      ) : (
        <form
          className="grid gap-3"
          onSubmit={(event) => {
            event.preventDefault()
            setError(null)
            void signUp({ email, password }).then((result) => {
              if (!result.success) {
                setError(authMessage(result.userError))
                return
              }
              setSent(true)
            })
          }}
        >
          <Field label={m.email()}>
            <Input
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
            />
          </Field>
          <Field label={m.password()}>
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
          <Button type="submit" isDisabled={pending}>
            {m.signUp()}
          </Button>
        </form>
      )}
      <p className="text-sm text-muted-foreground">
        {m.haveAccount()}{' '}
        <Link
          {...built(`/sign-in?redirect=${encodeURIComponent(returnTo)}`)}
          className="text-foreground underline"
        >
          {m.signInTitle()}
        </Link>
      </p>
    </AuthScreen>
  )
}
