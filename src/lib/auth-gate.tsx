import { useAuthToken } from '@convex-dev/auth/react'
import { useConvexAuth } from 'convex/react'
import { useEffect } from 'react'

type Session = 'pending' | 'in' | 'out'

let session: Session = 'pending'
let waiters: Array<(signedIn: boolean) => void> = []

/** Resolves once Convex Auth has settled. A held token during reconnect stays pending. */
export function waitForSession(): Promise<boolean> {
  if (session === 'in') return Promise.resolve(true)
  if (session === 'out') return Promise.resolve(false)
  return new Promise((resolve) => {
    waiters.push(resolve)
  })
}

function reportSession(next: Session) {
  if (next === session) return
  session = next
  if (next === 'pending') return
  const signedIn = next === 'in'
  const pending = waiters
  waiters = []
  for (const resolve of pending) resolve(signedIn)
}

/** Mirrors the auth provider into {@link waitForSession}. Render inside `ConvexAuthProvider`. */
export function SessionGate() {
  const { isAuthenticated, isLoading } = useConvexAuth()
  const token = useAuthToken()

  useEffect(() => {
    // useConvexAuth drops to signed-out while the client reconnects. The access
    // token is still held then, so that moment is not a sign-out.
    if (isLoading || (!isAuthenticated && token !== null)) {
      reportSession('pending')
      return
    }
    reportSession(isAuthenticated ? 'in' : 'out')
  }, [isAuthenticated, isLoading, token])

  return null
}
