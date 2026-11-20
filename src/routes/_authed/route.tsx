import { convexQuery } from '@convex-dev/react-query'
import { useQuery } from '@tanstack/react-query'
import { createFileRoute, Outlet, useNavigate } from '@tanstack/react-router'
import { useConvexAuth } from 'convex/react'
import { useEffect, useLayoutEffect } from 'react'
import { api } from '../../../convex/_generated/api'
import { RoutePending } from '@/components/app/route-states'
import { Shell } from '@/components/app/shell'
import { noteSignedIn, signedOutDelay } from '@/lib/auth-presence'
import { setLocale } from '@/paraglide/runtime'

export const Route = createFileRoute('/_authed')({
  component: Authed,
})

function Authed() {
  const { isAuthenticated, isLoading } = useConvexAuth()
  const navigate = useNavigate()
  useLayoutEffect(() => {
    if (isAuthenticated) noteSignedIn()
  }, [isAuthenticated])
  useEffect(() => {
    if (isLoading || isAuthenticated) return
    const redirectToSignIn = () => {
      if (window.location.pathname.startsWith('/sign-in')) return
      const redirect = `${window.location.pathname}${window.location.search}${window.location.hash}`
      void navigate({
        href: `/sign-in?redirect=${encodeURIComponent(redirect)}`,
        replace: true,
      })
    }
    const delay = signedOutDelay()
    if (delay === 0) {
      redirectToSignIn()
      return
    }
    const id = window.setTimeout(redirectToSignIn, delay)
    return () => window.clearTimeout(id)
  }, [isAuthenticated, isLoading, navigate])
  if (isLoading || !isAuthenticated) return <RoutePending />
  return <SignedIn />
}

function SignedIn() {
  const { data: me } = useQuery(convexQuery(api.users.me, {}))
  useSavedLocale(me?.locale ?? null)
  return (
    <Shell>
      <Outlet />
    </Shell>
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
