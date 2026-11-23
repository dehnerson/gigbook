import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import { useConvexAuth, useMutation, useQuery } from 'convex/react'
import { api } from '../../../convex/_generated/api'
import { AuthScreen } from '@/components/auth/auth-screen'
import { RoutePending } from '@/components/app/route-states'
import { Button } from '@/components/ui/button'
import { href } from '@/lib/space'
import { roleName } from '@/lib/roles'
import { m } from '@/paraglide/messages'

export const Route = createFileRoute('/invite/$token')({
  component: InvitePage,
})

function InvitePage() {
  const { token } = Route.useParams()
  return <InviteScreen token={token} />
}

function InviteScreen({ token }: { token: string }) {
  const { isAuthenticated, isLoading } = useConvexAuth()
  const invite = useQuery(api.bands.preview, isLoading ? 'skip' : { token })
  const accept = useMutation(api.bands.accept)
  const navigate = useNavigate()
  const back = `/invite/${token}`
  if (isLoading || invite === undefined) return <RoutePending />
  if (!invite) {
    return (
      <AuthScreen title={m.invite()}>
        <p className="text-sm text-muted-foreground">{m.inviteExpired()}</p>
      </AuthScreen>
    )
  }
  return (
    <AuthScreen title={m.inviteTitle({ name: invite.bandName })}>
      <p className="text-sm text-muted-foreground">
        {m.inviteBody({ role: roleName(invite.role) })}
      </p>
      {!isAuthenticated || !invite.signedIn ? (
        <div className="grid gap-2">
          <Link
            to="/sign-in"
            search={{ redirect: back, code: undefined, state: undefined }}
            className="text-sm text-foreground underline"
          >
            {m.signInTitle()}
          </Link>
          <Link
            to="/sign-up"
            search={{ redirect: back, code: undefined, state: undefined }}
            className="text-sm text-foreground underline"
          >
            {m.signUp()}
          </Link>
        </div>
      ) : invite.emailMatches ? (
        <Button
          onPress={() =>
            void accept({ token }).then((result) =>
              navigate(href(result.bandId, { page: 'songs' })),
            )
          }
        >
          {m.acceptInvite()}
        </Button>
      ) : (
        <p className="text-sm text-muted-foreground">
          {m.inviteWrongEmail({ email: invite.email })}
        </p>
      )}
    </AuthScreen>
  )
}
