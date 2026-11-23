import {
  useOauth,
  useSignInWithGoogle,
} from '@convex-dev/auth/methods/google/react'
import { useRouterState } from '@tanstack/react-router'
import {
  GuitarIcon,
  ListMusicIcon,
  RadioIcon,
  SparklesIcon,
} from 'lucide-react'
import { useLayoutEffect, useState } from 'react'
import type { ReactNode } from 'react'
import { api } from '../../../convex/_generated/api'
import { Button } from '@/components/ui/button'
import { ChordStrip } from '@/components/sheet/chord-strip'
import { authMessage } from '@/lib/auth-message'
import { RETURN_KEY, safeNext } from '@/lib/return-path'
import { DEFAULT_LAYERS } from '@/lib/sheet-layers'
import { m } from '@/paraglide/messages'

const FEATURES = [
  { icon: ListMusicIcon, text: () => m.signInFeatureSheets() },
  { icon: RadioIcon, text: () => m.signInFeatureJam() },
  { icon: SparklesIcon, text: () => m.signInFeatureImport() },
]

export function useReturnTo() {
  const redirect = useRouterState({
    select: (state) =>
      safeNext(
        (state.location.search as { redirect?: unknown } | undefined)?.redirect,
      ),
  })
  const [continued, setContinued] = useState('/')
  useLayoutEffect(() => {
    if (redirect !== '/') {
      sessionStorage.setItem(RETURN_KEY, redirect)
      setContinued(redirect)
      return
    }
    setContinued(safeNext(sessionStorage.getItem(RETURN_KEY)))
  }, [redirect])
  return redirect === '/' ? continued : redirect
}

export function AuthScreen({
  title,
  children,
}: {
  title: string
  children: ReactNode
}) {
  return (
    <main className="grid min-h-screen bg-background text-foreground lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)]">
      <section className="stage-glow relative hidden flex-col justify-between overflow-hidden border-r bg-card px-12 py-10 lg:flex">
        <div className="flex items-center gap-2.5">
          <span className="grid size-10 place-items-center rounded-xl bg-primary text-primary-foreground shadow-[0_0_28px_-4px_var(--primary)]">
            <GuitarIcon className="size-5" />
          </span>
          <span className="text-xl font-semibold tracking-tight">
            {m.appName()}
          </span>
        </div>
        <div className="max-w-lg space-y-8">
          <h1 className="text-5xl leading-[1.05] font-semibold tracking-tight text-balance">
            {m.signInHeadline()}
          </h1>
          <ul className="space-y-3">
            {FEATURES.map((feature) => (
              <li
                key={feature.text()}
                className="flex items-center gap-3 text-muted-foreground"
              >
                <feature.icon className="size-5 shrink-0 text-primary" />
                {feature.text()}
              </li>
            ))}
          </ul>
        </div>
        <div aria-hidden className="pointer-events-none opacity-90">
          <ChordStrip
            symbols={['G', 'D', 'Em', 'C', 'Bm', 'Asus4']}
            shapes={[]}
            settings={{
              capo: 0,
              transpose: 0,
              notation: 'en',
              layers: DEFAULT_LAYERS,
              scale: 1,
            }}
          />
        </div>
      </section>
      <section className="flex flex-col items-center justify-center gap-8 px-4 py-12">
        <div className="flex flex-col items-center gap-3 text-center lg:hidden">
          <span className="grid size-12 place-items-center rounded-2xl bg-primary text-primary-foreground shadow-[0_0_28px_-4px_var(--primary)]">
            <GuitarIcon className="size-6" />
          </span>
          <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
        </div>
        <div className="grid w-full max-w-sm gap-4">{children}</div>
      </section>
    </main>
  )
}

export function OauthButtons() {
  const google = useSignInWithGoogle(api.auth)
  const { flowError } = useOauth()
  return (
    <div className="grid gap-2">
      {flowError ? (
        <p role="alert" className="text-sm text-destructive">
          {authMessage(flowError)}
        </p>
      ) : null}
      <Button variant="outline" onPress={() => void google.signIn()}>
        {m.continueWithGoogle()}
      </Button>
    </div>
  )
}
