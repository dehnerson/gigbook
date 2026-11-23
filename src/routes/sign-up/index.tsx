import { createFileRoute, Link } from '@tanstack/react-router'
import { authSearch } from '@/lib/return-path'
import { useForm } from '@tanstack/react-form'
import { useSignUpWithEmailPassword } from '@convex-dev/auth/methods/email-password/react'
import { useState } from 'react'
import { api } from '../../../convex/_generated/api'
import { FormInput } from '@/components/app/form-field'
import {
  AuthScreen,
  OauthButtons,
  useReturnTo,
} from '@/components/auth/auth-screen'
import { Button } from '@/components/ui/button'
import { signUpSchema } from '@/lib/auth-schema'
import { authMessage } from '@/lib/auth-message'
import { m } from '@/paraglide/messages'

export const Route = createFileRoute('/sign-up/')({
  validateSearch: authSearch,
  component: SignUpScreen,
})

function SignUpScreen() {
  const returnTo = useReturnTo()
  const { signUp: startSignUp, pending } = useSignUpWithEmailPassword(
    api.auth as Parameters<typeof useSignUpWithEmailPassword>[0],
  )
  const signUp = startSignUp as (credentials: {
    name: string
    email: string
    password: string
  }) => ReturnType<typeof startSignUp>
  const [error, setError] = useState<string | null>(null)
  const [sentTo, setSentTo] = useState<string | null>(null)
  const form = useForm({
    defaultValues: { name: '', email: '', password: '' },
    validators: { onSubmit: signUpSchema },
    onSubmit: async ({ value }) => {
      setError(null)
      const result = await signUp({
        name: value.name.trim(),
        email: value.email,
        password: value.password,
      })
      if (!result.success) {
        setError(authMessage(result.userError))
        return
      }
      setSentTo(value.email)
    },
  })

  return (
    <AuthScreen title={m.signUp()}>
      <OauthButtons />
      <p className="text-center text-xs text-muted-foreground">
        {m.orDivider()}
      </p>
      {sentTo ? (
        <p className="text-sm text-muted-foreground">
          {m.validateEmailSent({ email: sentTo })}
        </p>
      ) : (
        <form
          className="grid gap-3"
          onSubmit={(event) => {
            event.preventDefault()
            void form.handleSubmit()
          }}
        >
          <form.Field name="name">
            {(field) => (
              <FormInput
                field={field}
                label={m.displayName()}
                autoComplete="name"
              />
            )}
          </form.Field>
          <form.Field name="email">
            {(field) => (
              <FormInput
                field={field}
                label={m.email()}
                type="email"
                autoComplete="email"
              />
            )}
          </form.Field>
          <form.Field name="password">
            {(field) => (
              <FormInput
                field={field}
                label={m.password()}
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
            {m.signUp()}
          </Button>
        </form>
      )}
      <p className="text-sm text-muted-foreground">
        {m.haveAccount()}{' '}
        <Link
          to="/sign-in"
          search={{ redirect: returnTo, code: undefined, state: undefined }}
          className="text-foreground underline"
        >
          {m.signInTitle()}
        </Link>
      </p>
    </AuthScreen>
  )
}
