import { useForm } from '@tanstack/react-form'
import { useSignInWithGoogle } from '@convex-dev/auth/methods/google/react'
import { useStartChangeEmail } from '@convex-dev/auth/methods/email-password/react'
import { useAuthActions } from '@convex-dev/auth/react'
import { useNavigate } from '@tanstack/react-router'
import { useMutation } from 'convex/react'
import { useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { toast } from 'sonner'
import { api } from '../../convex/_generated/api'
import type { Id } from '../../convex/_generated/dataModel'
import { ConfirmDialog } from '@/components/app/confirm-dialog'
import { FormInput } from '@/components/app/form-field'
import { PageHeader } from '@/components/app/page-header'
import { UserAvatar } from '@/components/app/user-avatar'
import { Button } from '@/components/ui/button'
import { saveAddPasswordSecret } from '@/lib/add-password'
import {
  addPasswordSchema,
  changeEmailSchema,
  changePasswordSchema,
  nameSchema,
} from '@/lib/auth-schema'
import { authMessage } from '@/lib/auth-message'
import { messageFor } from '@/lib/errors'
import { m } from '@/paraglide/messages'

export type Account = {
  name: string
  email: string | null
  imageUrl: string | null
  password: { email: string } | null
  google: { email: string | null } | null
}

export function AccountScreen({ account }: { account: Account }) {
  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader
        title={m.manageAccount()}
        subtitle={account.email ?? undefined}
      />
      <div className="space-y-4">
        <section className="rounded-2xl border bg-card p-5 sm:p-6">
          <ProfileSection account={account} />
        </section>
        <section className="rounded-2xl border bg-card p-5 sm:p-6">
          <MethodsSection account={account} />
        </section>
        <section className="rounded-2xl border bg-card p-5 sm:p-6">
          <DeleteSection />
        </section>
      </div>
    </div>
  )
}

function ProfileSection({ account }: { account: Account }) {
  const updateProfile = useMutation(api.users.updateProfile)
  const uploadUrl = useMutation(api.users.generateAvatarUploadUrl)
  const setAvatar = useMutation(api.users.setAvatar)
  const clearAvatar = useMutation(api.users.clearAvatar)
  const file = useRef<HTMLInputElement>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const form = useForm({
    defaultValues: { name: account.name },
    validators: { onSubmit: nameSchema },
    onSubmit: async ({ value }) => {
      setError(null)
      try {
        await updateProfile({ name: value.name.trim() })
        toast.success(m.profileSaved())
      } catch (cause) {
        setError(messageFor(cause))
      }
    },
  })

  const pick = async (next: File | undefined) => {
    if (!next) return
    if (!next.type.startsWith('image/')) {
      toast.error(m.photoInvalid())
      return
    }
    setBusy(true)
    try {
      const postUrl = await uploadUrl({})
      const response = await fetch(postUrl, {
        method: 'POST',
        headers: { 'Content-Type': next.type },
        body: next,
      })
      if (!response.ok) throw new Error('upload failed')
      const payload = (await response.json()) as { storageId: Id<'_storage'> }
      await setAvatar({ storageId: payload.storageId })
    } catch (cause) {
      toast.error(messageFor(cause))
    } finally {
      setBusy(false)
      if (file.current) file.current.value = ''
    }
  }

  return (
    <section className="grid gap-4">
      <h2 className="font-semibold">{m.profilePhoto()}</h2>
      <div className="flex items-center gap-4">
        <UserAvatar
          name={account.name}
          email={account.email}
          imageUrl={account.imageUrl}
          className="size-16"
        />
        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            isDisabled={busy}
            onPress={() => file.current?.click()}
          >
            {m.uploadPhoto()}
          </Button>
          {account.imageUrl ? (
            <Button
              variant="ghost"
              isDisabled={busy}
              onPress={() => {
                void clearAvatar().catch((cause: unknown) =>
                  toast.error(messageFor(cause)),
                )
              }}
            >
              {m.removePhoto()}
            </Button>
          ) : null}
        </div>
        <input
          ref={file}
          type="file"
          accept="image/*"
          className="sr-only"
          tabIndex={-1}
          onChange={(event) => void pick(event.target.files?.[0])}
        />
      </div>
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
        <FormAlert message={error} />
        <form.Subscribe selector={(state) => state.isSubmitting}>
          {(pending) => (
            <Button
              type="submit"
              isDisabled={pending}
              className="justify-self-start"
            >
              {m.save()}
            </Button>
          )}
        </form.Subscribe>
      </form>
    </section>
  )
}

function MethodsSection({ account }: { account: Account }) {
  const google = useSignInWithGoogle(api.auth)
  const disconnect = useMutation(api.users.disconnectGoogle)
  const [panel, setPanel] = useState<'email' | 'password' | 'add' | null>(null)
  return (
    <section className="grid gap-3">
      <h2 className="font-semibold">{m.signInMethods()}</h2>
      <MethodRow
        title={m.emailPasswordMethod()}
        detail={account.password?.email ?? null}
        connected={account.password !== null}
      >
        {account.password ? (
          <div className="flex flex-wrap gap-2">
            <Button
              size="sm"
              variant="outline"
              onPress={() => setPanel(panel === 'email' ? null : 'email')}
            >
              {m.changeEmail()}
            </Button>
            <Button
              size="sm"
              variant="outline"
              onPress={() => setPanel(panel === 'password' ? null : 'password')}
            >
              {m.changePassword()}
            </Button>
          </div>
        ) : (
          <Button
            size="sm"
            variant="outline"
            onPress={() => setPanel(panel === 'add' ? null : 'add')}
          >
            {m.addPassword()}
          </Button>
        )}
      </MethodRow>
      {panel === 'email' ? <ChangeEmailForm /> : null}
      {panel === 'password' ? <ChangePasswordForm /> : null}
      {panel === 'add' ? (
        <AddPasswordForm email={account.google?.email ?? ''} />
      ) : null}
      <MethodRow
        title={m.googleMethod()}
        detail={account.google?.email ?? null}
        connected={account.google !== null}
      >
        {account.google ? (
          account.password ? (
            <Button
              size="sm"
              variant="ghost"
              onPress={() => {
                void disconnect().catch((cause: unknown) =>
                  toast.error(messageFor(cause)),
                )
              }}
            >
              {m.removeGoogle()}
            </Button>
          ) : null
        ) : (
          <Button
            size="sm"
            variant="outline"
            onPress={() => void google.signIn()}
          >
            {m.connectGoogle()}
          </Button>
        )}
      </MethodRow>
    </section>
  )
}

function MethodRow({
  title,
  detail,
  connected,
  children,
}: {
  title: string
  detail: string | null
  connected: boolean
  children: ReactNode
}) {
  return (
    <div className="grid gap-3 rounded-xl border p-3 sm:grid-cols-[1fr_auto] sm:items-center">
      <div className="min-w-0">
        <div className="font-medium">{title}</div>
        <div className="truncate text-sm text-muted-foreground">
          {connected ? (detail ?? m.methodConnected()) : m.methodAvailable()}
        </div>
      </div>
      {children}
    </div>
  )
}

function ChangeEmailForm() {
  const { startChangeEmail, pending } = useStartChangeEmail(api.auth)
  const [error, setError] = useState<string | null>(null)
  const [sent, setSent] = useState<string | null>(null)
  const form = useForm({
    defaultValues: { currentPassword: '', newEmail: '' },
    validators: { onSubmit: changeEmailSchema },
    onSubmit: async ({ value }) => {
      setError(null)
      const result = await startChangeEmail(value)
      if (!result.success) {
        setError(authMessage(result.userError))
        return
      }
      setSent(value.newEmail)
    },
  })
  if (sent) {
    return (
      <p className="text-sm text-muted-foreground">
        {m.emailChangeSent({ email: sent })}
      </p>
    )
  }
  return (
    <form
      className="grid gap-3"
      onSubmit={(event) => {
        event.preventDefault()
        void form.handleSubmit()
      }}
    >
      <form.Field name="currentPassword">
        {(field) => (
          <FormInput
            field={field}
            label={m.currentPassword()}
            type="password"
            autoComplete="current-password"
          />
        )}
      </form.Field>
      <form.Field name="newEmail">
        {(field) => (
          <FormInput
            field={field}
            label={m.newEmail()}
            type="email"
            autoComplete="email"
          />
        )}
      </form.Field>
      <FormAlert message={error} />
      <Button type="submit" isDisabled={pending} className="justify-self-start">
        {m.changeEmail()}
      </Button>
    </form>
  )
}

function ChangePasswordForm() {
  const changePassword = useMutation(api.auth.changePassword)
  const [error, setError] = useState<string | null>(null)
  const form = useForm({
    defaultValues: { currentPassword: '', newPassword: '' },
    validators: { onSubmit: changePasswordSchema },
    onSubmit: async ({ value }) => {
      setError(null)
      const result = await changePassword(value)
      if (!result.success) {
        setError(authMessage(result.userError))
        return
      }
      toast.success(m.passwordChanged())
      form.reset()
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
      <form.Field name="currentPassword">
        {(field) => (
          <FormInput
            field={field}
            label={m.currentPassword()}
            type="password"
            autoComplete="current-password"
          />
        )}
      </form.Field>
      <form.Field name="newPassword">
        {(field) => (
          <FormInput
            field={field}
            label={m.newPassword()}
            type="password"
            autoComplete="new-password"
          />
        )}
      </form.Field>
      <FormAlert message={error} />
      <form.Subscribe selector={(state) => state.isSubmitting}>
        {(pending) => (
          <Button
            type="submit"
            isDisabled={pending}
            className="justify-self-start"
          >
            {m.changePassword()}
          </Button>
        )}
      </form.Subscribe>
    </form>
  )
}

function AddPasswordForm({ email }: { email: string }) {
  const start = useMutation(api.auth.startAddPassword)
  const [error, setError] = useState<string | null>(null)
  const [sent, setSent] = useState<string | null>(null)
  const form = useForm({
    defaultValues: { email, password: '' },
    validators: { onSubmit: addPasswordSchema },
    onSubmit: async ({ value }) => {
      setError(null)
      const result = await start(value)
      if (!result.success) {
        setError(authMessage(result.userError))
        return
      }
      saveAddPasswordSecret(result.browserSecret)
      setSent(value.email)
    },
  })
  if (sent) {
    return (
      <p className="text-sm text-muted-foreground">
        {m.addPasswordSent({ email: sent })}
      </p>
    )
  }
  return (
    <form
      className="grid gap-3"
      onSubmit={(event) => {
        event.preventDefault()
        void form.handleSubmit()
      }}
    >
      <p className="text-sm text-muted-foreground">{m.addPasswordHint()}</p>
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
      <FormAlert message={error} />
      <form.Subscribe selector={(state) => state.isSubmitting}>
        {(pending) => (
          <Button
            type="submit"
            isDisabled={pending}
            className="justify-self-start"
          >
            {m.addPassword()}
          </Button>
        )}
      </form.Subscribe>
    </form>
  )
}

function DeleteSection() {
  const deleteAccount = useMutation(api.users.deleteAccount)
  const { signOut } = useAuthActions()
  const navigate = useNavigate()
  const [confirm, setConfirm] = useState(false)
  return (
    <section className="grid gap-3">
      <div>
        <h2 className="font-semibold text-destructive">{m.deleteAccount()}</h2>
        <p className="text-sm text-muted-foreground">{m.deleteAccountHint()}</p>
      </div>
      <Button
        variant="destructive"
        className="justify-self-start"
        onPress={() => setConfirm(true)}
      >
        {m.deleteAccount()}
      </Button>
      <ConfirmDialog
        isOpen={confirm}
        onOpenChange={setConfirm}
        title={m.deleteAccount()}
        description={m.deleteAccountHint()}
        confirmLabel={m.deleteAccount()}
        onConfirm={async () => {
          await deleteAccount()
          await signOut()
          void navigate({ href: '/sign-in' })
        }}
      />
    </section>
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
