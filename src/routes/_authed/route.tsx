import { useAuthToken } from '@convex-dev/auth/react'
import { convexQuery } from '@convex-dev/react-query'
import { useQuery } from '@tanstack/react-query'
import { createFileRoute, Outlet, useNavigate } from '@tanstack/react-router'
import { useConvexAuth } from 'convex/react'
import { useEffect } from 'react'
import { api } from '../../../convex/_generated/api'
import { RoutePending } from '@/components/app/route-states'
import { Shell } from '@/components/app/shell'
import { WorkspaceProvider } from '@/lib/workspace'
import { setLocale } from '@/paraglide/runtime'

export const Route = createFileRoute('/_authed')({
  component: Authed,
})

function Authed() {
  const { isAuthenticated, isLoading } = useConvexAuth()
  // useConvexAuth drops to signed-out while the client reconnects. The access
  // token is still held then, so that moment is not a sign-out.
  const token = useAuthToken()
  const navigate = useNavigate()

  useEffect(() => {
    if (isLoading || isAuthenticated || token !== null) return
    if (window.location.pathname.startsWith('/sign-in')) return
    const redirect = `${window.location.pathname}${window.location.search}${window.location.hash}`
    void navigate({
      href: `/sign-in?redirect=${encodeURIComponent(redirect)}`,
      replace: true,
    })
  }, [isAuthenticated, isLoading, navigate, token])

  if (isLoading || !isAuthenticated) return <RoutePending />

  return <SignedIn />
}

function SignedIn() {
  const { data: me } = useQuery(convexQuery(api.users.me, {}))
  useSavedLocale(me?.locale ?? null)
  return (
    <WorkspaceProvider>
      <Shell>
        <Outlet />
      </Shell>
    </WorkspaceProvider>
  )
}

function useSavedLocale(locale: string | null) {
  useEffect(() => {
    if (locale !== 'en' && locale !== 'de') return
    // setLocale reloads only when the language actually changes. Reloading
    // just to store a cookie dropped the session UI back through sign-in.
    void setLocale(locale)
  }, [locale])
}
