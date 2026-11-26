import { convexQuery } from '@convex-dev/react-query'
import { useQuery } from '@tanstack/react-query'
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { api } from '../../../convex/_generated/api'
import { DetailSkeleton } from '@/components/app/route-states'
import { PageHeader } from '@/components/app/page-header'
import { m } from '@/paraglide/messages'
import { useForm } from '@tanstack/react-form'
import { useAuthActions, useAuthToken } from '@convex-dev/auth/react'
import { ConvexError } from 'convex/values'
import { useMutation } from 'convex/react'
import { useRef, useState } from 'react'
import { toast } from 'sonner'
import { ConfirmDialog } from '@/components/app/confirm-dialog'
import { FormInput } from '@/components/app/form-field'
import { UserAvatar } from '@/components/app/user-avatar'
import { Button } from '@/components/ui/button'
import { nameSchema } from '@/lib/auth-schema'
import {
  AVATAR_ACCEPT,
  MAX_AVATAR_BYTES,
  avatarTypeAllowed,
} from '@/lib/avatar'
import { convexSiteUrl } from '@/lib/convex-site'
import { messageFor } from '@/lib/errors'

export const Route = createFileRoute('/_authed/account')({
  component: AccountPage,
})

function AccountPage() {
  const { data: account, isPending } = useQuery(convexQuery(api.users.me, {}))
  if (!account)
    return (
      <div className="mx-auto max-w-3xl">
        <PageHeader title={m.manageAccount()} />
        {isPending ? <DetailSkeleton /> : null}
      </div>
    )
  return <AccountScreen account={account} />
}

type Account = {
  name: string
  email: string | null
  imageUrl: string | null
}

function AccountScreen({ account }: { account: Account }) {
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
          <DeleteSection />
        </section>
      </div>
    </div>
  )
}

function ProfileSection({ account }: { account: Account }) {
  const updateProfile = useMutation(api.users.updateProfile)
  const clearAvatar = useMutation(api.users.clearAvatar)
  const token = useAuthToken()
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
    if (file.current) file.current.value = ''
    if (!next) return
    if (next.size > MAX_AVATAR_BYTES) {
      toast.error(m.photoTooLarge())
      return
    }
    if (next.size === 0 || (next.type && !avatarTypeAllowed(next.type))) {
      toast.error(m.photoInvalid())
      return
    }
    if (!token) {
      toast.error(m.errorUnauthenticated())
      return
    }
    setBusy(true)
    try {
      const response = await fetch(`${convexSiteUrl()}/avatar`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': next.type || 'application/octet-stream',
        },
        body: next,
      })
      if (!response.ok) {
        const body = (await response.json().catch(() => null)) as {
          code?: string
        } | null
        throw new ConvexError(body?.code ?? 'AVATAR_INVALID')
      }
    } catch (cause) {
      toast.error(messageFor(cause))
    } finally {
      setBusy(false)
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
          accept={AVATAR_ACCEPT}
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
