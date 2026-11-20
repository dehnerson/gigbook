import { useMutation } from 'convex/react'
import { useEffect, useRef, useState } from 'react'
import { api } from '../../../convex/_generated/api'
import { AuthScreen } from '@/screens/auth/auth-screen'
import { RoutePending } from '@/components/app/route-states'
import {
  clearAddPasswordSecret,
  readAddPasswordSecret,
} from '@/lib/add-password'
import { authMessage } from '@/lib/auth-message'
import { m } from '@/paraglide/messages'

export function ConfirmAddPasswordScreen({ code }: { code: string }) {
  const complete = useMutation(api.auth.completeAddPassword)
  const started = useRef(false)
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState(false)

  useEffect(() => {
    if (started.current) return
    started.current = true
    const secret = readAddPasswordSecret()
    if (!code || !secret) {
      setError(m.linkWrongBrowser())
      return
    }
    void complete({ emailCode: code, browserSecret: secret }).then((result) => {
      if (!result.success) {
        setError(authMessage(result.userError))
        return
      }
      clearAddPasswordSecret()
      setDone(true)
    })
  }, [code, complete])

  return (
    <AuthScreen title={m.addPassword()}>
      {done ? (
        <p className="text-sm text-muted-foreground">{m.passwordAdded()}</p>
      ) : error ? (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      ) : (
        <RoutePending />
      )}
    </AuthScreen>
  )
}
