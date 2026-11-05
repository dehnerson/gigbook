import { convexQuery } from '@convex-dev/react-query'
import { useAuth } from '@clerk/tanstack-react-start'
import { useQuery } from '@tanstack/react-query'
import { useConvexAuth, useMutation } from 'convex/react'
import { useEffect, useRef } from 'react'
import { api } from '../../convex/_generated/api'

export function EnsureUser() {
  const { isSignedIn } = useAuth()
  const { isAuthenticated } = useConvexAuth()
  const ensure = useMutation(api.users.ensure)
  const me = useQuery(
    convexQuery(api.users.me, isSignedIn && isAuthenticated ? {} : 'skip'),
  )
  const started = useRef(false)

  useEffect(() => {
    if (!isSignedIn || !isAuthenticated || started.current) return
    started.current = true
    void ensure({})
  }, [ensure, isAuthenticated, isSignedIn])

  useEffect(() => {
    if (!me.data?.locale) return
    const hasCookie = document.cookie
      .split('; ')
      .some((row: any) => row.startsWith('PARAGLIDE_LOCALE='))
    if (hasCookie) return
    document.cookie = `PARAGLIDE_LOCALE=${me.data.locale}; Path=/; Max-Age=34560000; SameSite=Lax`
    window.location.reload()
  }, [me.data?.locale])

  return null
}
