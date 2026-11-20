import { convexQuery } from '@convex-dev/react-query'
import { createFileRoute, Outlet, useNavigate } from '@tanstack/react-router'
import { useConvexAuth } from 'convex/react'
import { useEffect, useRef } from 'react'
import { api } from '../../../convex/_generated/api'
import { RoutePending } from '@/components/app/route-states'
import { Shell } from '@/components/shell'
import { useLiveQuery } from '@/lib/live'

export const Route = createFileRoute('/_authed')({
  component: Authed,
})

function Authed() {
  const { isAuthenticated, isLoading } = useConvexAuth()
  const navigate = useNavigate()
  const sent = useRef(false)
  useEffect(() => {
    if (isLoading || isAuthenticated || sent.current) return
    sent.current = true
    if (window.location.pathname.startsWith('/sign-in')) return
    const redirect = `${window.location.pathname}${window.location.search}${window.location.hash}`
    void navigate({
      href: `/sign-in?redirect=${encodeURIComponent(redirect)}`,
      replace: true,
    })
  }, [isAuthenticated, isLoading, navigate])
  if (isLoading || !isAuthenticated) return <RoutePending />
  return <SignedIn />
}

function SignedIn() {
  const me = useLiveQuery(convexQuery(api.users.me, {}))
  useSavedLocale(me.data?.locale ?? null)
  return <Shell>{me.data ? <Outlet /> : <RoutePending />}</Shell>
}

function useSavedLocale(locale: string | null) {
  useEffect(() => {
    if (!locale) return
    const hasCookie = document.cookie
      .split('; ')
      .some((row) => row.startsWith('PARAGLIDE_LOCALE='))
    if (hasCookie) return
    document.cookie = `PARAGLIDE_LOCALE=${locale}; Path=/; Max-Age=34560000; SameSite=Lax`
    window.location.reload()
  }, [locale])
}
