import { useAuthToken } from '@convex-dev/auth/react'
import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import { authSearch } from '@/lib/return-path'
import { useForm } from '@tanstack/react-form'
import {
  useSignInWithEmailPassword,
  useStartPasswordRecovery,
} from '@convex-dev/auth/methods/email-password/react'
import { useConvexAuth } from 'convex/react'
import { useEffect, useLayoutEffect, useState } from 'react'
import { api } from '../../../convex/_generated/api'
import { FormInput } from '@/components/app/form-field'
import { RoutePending } from '@/components/app/route-states'
import {
  AuthScreen,
  OauthButtons,
  useReturnTo,
} from '@/components/auth/auth-screen'
import { Button } from '@/components/ui/button'
import { emailOnlySchema, signInSchema } from '@/lib/auth-schema'
import { authMessage } from '@/lib/auth-message'
import { m } from '@/paraglide/messages'

export const Route = createFileRoute('/sign-in/')({
  validateSearch: authSearch,
  component: SignInScreen,
})

function SignInScreen() {
  const returnTo = useReturnTo()
  const navigate = useNavigate()
  const { isAuthenticated, isLoading } = useConvexAuth()
  const token = useAuthToken()
  const [returnReady, setReturnReady] = useState(false)
  const { signIn, pending } = useSignInWithEmailPassword(api.auth)
  const recovery = useStartPasswordRecovery(api.auth)
  const [error, setError] = useState<string | null>(null)
  const [forgot, setForgot] = useState(false)
  const [sentTo, setSentTo] = useState<string | null>(null)
  const signInForm = useForm({
    defaultValues: { email: '', password: '' },
    validators: { onSubmit: signInSchema },
    onSubmit: async ({ value }) => {
      setError(null)
      const result = await signIn(value)
      if (result.status === 'error') setError(authMessage(result.userError))
    },
  })
  const recoveryForm = useForm({
    defaultValues: { email: '' },
    validators: { onSubmit: emailOnlySchema },
    onSubmit: async ({ value }) => {
      setError(null)
      const result = await recovery.startPasswordRecovery(value)
      if (!result.success) {
        setError(authMessage(result.userError))
        return
      }
      setSentTo(result.sentTo)
    },
  })

  useLayoutEffect(() => {
    setReturnReady(true)
  }, [returnTo])

  useEffect(() => {
    if (!returnReady || isLoading || !isAuthenticated) return
    void navigate({ href: returnTo })
  }, [isAuthenticated, isLoading, navigate, returnReady, returnTo])

  if (isLoading || isAuthenticated || token !== null) return <RoutePending />

  return (
    <AuthScreen title={m.signInTitle()}>
      <OauthButtons />
      <p className="text-center text-xs text-muted-foreground">
        {m.orDivider()}
      </p>
      {forgot ? (
        <form
          className="grid gap-3"
          onSubmit={(event) => {
            event.preventDefault()
            void recoveryForm.handleSubmit()
          }}
        >
          <recoveryForm.Field name="email">
            {(field) => (
              <FormInput
                field={field}
                label={m.email()}
                type="email"
                autoComplete="email"
              />
            )}
          </recoveryForm.Field>
          {sentTo ? (
            <p className="text-sm text-muted-foreground">
              {m.resetSent({ email: sentTo })}
            </p>
          ) : null}
          <FormAlert message={error} />
          <Button type="submit" isDisabled={recovery.pending}>
            {m.sendResetLink()}
          </Button>
          <button
            type="button"
            className="text-sm text-muted-foreground underline"
            onClick={() => {
              setForgot(false)
              setError(null)
            }}
          >
            {m.signInTitle()}
          </button>
        </form>
      ) : (
        <form
          className="grid gap-3"
          onSubmit={(event) => {
            event.preventDefault()
            void signInForm.handleSubmit()
          }}
        >
          <signInForm.Field name="email">
            {(field) => (
              <FormInput
                field={field}
                label={m.email()}
                type="email"
                autoComplete="email"
              />
            )}
          </signInForm.Field>
          <signInForm.Field name="password">
            {(field) => (
              <FormInput
                field={field}
                label={m.password()}
                type="password"
                autoComplete="current-password"
              />
            )}
          </signInForm.Field>
          <FormAlert message={error} />
          <Button type="submit" isDisabled={pending}>
            {m.signInTitle()}
          </Button>
          <button
            type="button"
            className="text-left text-sm text-muted-foreground underline"
            onClick={() => {
              setForgot(true)
              setError(null)
            }}
          >
            {m.forgotPassword()}
          </button>
        </form>
      )}
      <p className="text-sm text-muted-foreground">
        {m.createAccount()}{' '}
        <Link
          to="/sign-up"
          search={{ redirect: returnTo, code: undefined, state: undefined }}
          className="text-foreground underline"
        >
          {m.signUp()}
        </Link>
      </p>
    </AuthScreen>
  )
}

function FormAlert({ message }: { message: string | null }) {
  if (!message) return null
  return (
    <p role="alert" className="text-sm text-destructive">
      {message}
    </p>
  )
}
