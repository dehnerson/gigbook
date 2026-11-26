import { useAuthToken } from '@convex-dev/auth/react'
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useConvexAuth } from 'convex/react'
import { useEffect, useLayoutEffect, useState } from 'react'
import { RoutePending } from '@/components/app/route-states'
import {
  AuthScreen,
  OauthButtons,
  useReturnTo,
} from '@/components/auth/auth-screen'
import { authSearch } from '@/lib/return-path'
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
    </AuthScreen>
  )
}
