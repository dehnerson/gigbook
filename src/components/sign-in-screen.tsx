import {
  useSignInWithEmailPassword,
  useStartPasswordRecovery,
} from '@convex-dev/auth/methods/email-password/react'
import { useConvexAuth } from 'convex/react'
import { Link, useNavigate } from '@tanstack/react-router'
import { useEffect, useState } from 'react'
import { api } from '../../convex/_generated/api'
import { Field } from '@/components/app/field'
import { AuthScreen, OauthButtons, useReturnTo } from '@/components/auth-screen'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { authMessage } from '@/lib/auth-message'
import { built } from '@/lib/built'
import { m } from '@/paraglide/messages'

export function SignInScreen() {
  const returnTo = useReturnTo()
  const navigate = useNavigate()
  const { isAuthenticated, isLoading } = useConvexAuth()
  const { signIn, pending } = useSignInWithEmailPassword(api.auth)
  const recovery = useStartPasswordRecovery(api.auth)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [forgot, setForgot] = useState(false)
  const [sentTo, setSentTo] = useState<string | null>(null)

  useEffect(() => {
    if (!isLoading && isAuthenticated) void navigate({ href: returnTo })
  }, [isAuthenticated, isLoading, navigate, returnTo])

  return (
    <AuthScreen title={m.signInTitle()}>
      <OauthButtons />
      <p className="text-center text-xs text-muted-foreground">{m.orDivider()}</p>
      {forgot ? (
        <form
          className="grid gap-3"
          onSubmit={(event) => {
            event.preventDefault()
            setError(null)
            void recovery
              .startPasswordRecovery({ email })
              .then((result) => {
                if (!result.success) {
                  setError(authMessage(result.userError))
                  return
                }
                setSentTo(result.sentTo)
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
          {sentTo ? (
            <p className="text-sm text-muted-foreground">
              {m.resetSent({ email: sentTo })}
            </p>
          ) : null}
          {error ? (
            <p role="alert" className="text-sm text-destructive">
              {error}
            </p>
          ) : null}
          <Button type="submit" isDisabled={recovery.pending || !email.trim()}>
            {m.sendResetLink()}
          </Button>
          <button
            type="button"
            className="text-sm text-muted-foreground underline"
            onClick={() => setForgot(false)}
          >
            {m.signInTitle()}
          </button>
        </form>
      ) : (
        <form
          className="grid gap-3"
          onSubmit={(event) => {
            event.preventDefault()
            setError(null)
            void signIn({ email, password }).then((result) => {
              if (result.status === 'error') setError(authMessage(result.userError))
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
              autoComplete="current-password"
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
            {m.signInTitle()}
          </Button>
          <button
            type="button"
            className="text-left text-sm text-muted-foreground underline"
            onClick={() => setForgot(true)}
          >
            {m.forgotPassword()}
          </button>
        </form>
      )}
      <p className="text-sm text-muted-foreground">
        {m.createAccount()}{' '}
        <Link
          {...built(`/sign-up?redirect=${encodeURIComponent(returnTo)}`)}
          className="text-foreground underline"
        >
          {m.signUp()}
        </Link>
      </p>
    </AuthScreen>
  )
}
