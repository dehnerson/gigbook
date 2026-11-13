import { SignIn } from '@clerk/tanstack-react-start'
import { useRouterState } from '@tanstack/react-router'
import {
  GuitarIcon,
  ListMusicIcon,
  RadioIcon,
  SparklesIcon,
} from 'lucide-react'
import { useLayoutEffect, useState } from 'react'
import { RETURN_KEY, safeNext } from '@/lib/return-path'
import { ChordStrip } from '@/components/sheet/chord-strip'
import { DEFAULT_LAYERS } from '@/lib/sheet-layers'
import { m } from '@/paraglide/messages'

const FEATURES = [
  { icon: ListMusicIcon, text: () => m.signInFeatureSheets() },
  { icon: RadioIcon, text: () => m.signInFeatureJam() },
  { icon: SparklesIcon, text: () => m.signInFeatureImport() },
]

function useReturnTo() {
  const pathname = useRouterState({
    select: (state) => state.location.pathname,
  })
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
    const continuing = /^\/sign-in\/.+/.test(pathname)
    if (!continuing) {
      sessionStorage.removeItem(RETURN_KEY)
      setContinued('/')
      return
    }
    setContinued(safeNext(sessionStorage.getItem(RETURN_KEY)))
  }, [pathname, redirect])
  return redirect === '/' ? continued : redirect
}

export function SignInScreen() {
  const key = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY
  const returnTo = useReturnTo()
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
          <h1 className="text-2xl font-semibold tracking-tight">
            {m.signInTitle()}
          </h1>
        </div>
        {key ? (
          <SignIn
            forceRedirectUrl={returnTo}
            fallbackRedirectUrl={returnTo}
            signUpForceRedirectUrl={returnTo}
            signUpFallbackRedirectUrl={returnTo}
          />
        ) : (
          <p className="max-w-sm text-center text-muted-foreground">
            {m.missingKeys()}
          </p>
        )}
      </section>
    </main>
  )
}
