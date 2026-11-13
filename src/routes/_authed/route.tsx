import { convexQuery } from '@convex-dev/react-query'
import { createFileRoute, Outlet, redirect } from '@tanstack/react-router'
import { useEffect } from 'react'
import { api } from '../../../convex/_generated/api'
import { RoutePending } from '@/components/app/route-states'
import { Shell } from '@/components/shell'
import { useLiveQuery } from '@/lib/live'

export const Route = createFileRoute('/_authed')({
  beforeLoad: ({ context, location }) => {
    if (!context.userId)
      throw redirect({
        to: '/sign-in',
        search: {
          redirect: `${location.pathname}${location.searchStr}${location.hash}`,
        },
      })
  },
  loader: ({ context }) => context.load(convexQuery(api.users.me, {})),
  component: Authed,
})

function Authed() {
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
