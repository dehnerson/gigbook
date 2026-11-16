import { deDE, enUS } from '@clerk/localizations'
import { ClerkProvider, useAuth } from '@clerk/tanstack-react-start'
import {
  HeadContent,
  Outlet,
  Scripts,
  createRootRouteWithContext,
} from '@tanstack/react-router'
import { TanStackRouterDevtoolsPanel } from '@tanstack/react-router-devtools'
import { TanStackDevtools } from '@tanstack/react-devtools'
import type { ConvexQueryClient } from '@convex-dev/react-query'
import type { QueryClient } from '@tanstack/react-query'
import { ConvexProviderWithAuth } from 'convex/react'
import type { ConvexReactClient } from 'convex/react'
import { useCallback, useMemo, useRef } from 'react'
import { ThemeProvider } from 'next-themes'
import { Toaster } from '@/components/ui/sonner'
import { auth } from '@clerk/tanstack-react-start/server'
import { createServerFn } from '@tanstack/react-start'
import { RouteError, RouteNotFound } from '@/components/app/route-states'
import { WorkspaceState } from '@/lib/workspace'
import type { Load } from '@/lib/load'
import { getLocale } from '@/paraglide/runtime'
import { m } from '@/paraglide/messages'
import appCss from '../styles.css?url'

export const fetchClerkAuth = createServerFn({ method: 'GET' }).handler(
  async () => {
    const { userId, getToken } = await auth()
    const token = (await getToken()) ?? null
    return { userId, token }
  },
)

export interface RouterContext {
  queryClient: QueryClient
  convexClient: ConvexReactClient
  convexQueryClient: ConvexQueryClient
  load: Load
}

export const Route = createRootRouteWithContext<RouterContext>()({
  beforeLoad: async ({ context }) => {
    const { userId, token } = await fetchClerkAuth()
    // serverHttpClient only exists during SSR, which is when loaders make HTTP queries.
    if (token) context.convexQueryClient.serverHttpClient?.setAuth(token)
    return { userId, token }
  },
  head: () => ({
    meta: [
      { charSet: 'utf-8' },
      {
        name: 'viewport',
        content: 'width=device-width, initial-scale=1, viewport-fit=cover',
      },
      { name: 'theme-color', content: '#0a0c12' },
      { name: 'mobile-web-app-capable', content: 'yes' },
      { name: 'apple-mobile-web-app-title', content: m.appName() },
      { name: 'apple-mobile-web-app-status-bar-style', content: 'black' },
      { title: m.appName() },
    ],
    links: [
      { rel: 'stylesheet', href: appCss },
      { rel: 'icon', href: '/favicon.svg', type: 'image/svg+xml' },
      { rel: 'apple-touch-icon', href: '/apple-touch-icon.png' },
      { rel: 'manifest', href: '/manifest.webmanifest' },
    ],
  }),
  errorComponent: ({ error }) => <RouteError error={error} />,
  notFoundComponent: () => <RouteNotFound />,
  shellComponent: RootDocument,
  component: RootComponent,
})

function useClerkConvexAuth() {
  const { isLoaded, isSignedIn, getToken, sessionClaims } = useAuth()
  const getTokenRef = useRef(getToken)
  getTokenRef.current = getToken
  const audience = sessionClaims?.aud
  const convexAudience =
    audience === 'convex' ||
    (Array.isArray(audience) && audience.includes('convex'))
  const fetchAccessToken = useCallback(
    async ({ forceRefreshToken }: { forceRefreshToken: boolean }) => {
      try {
        const token = convexAudience
          ? await getTokenRef.current({ skipCache: forceRefreshToken })
          : await getTokenRef.current({
              template: 'convex',
              skipCache: forceRefreshToken,
            })
        return token ?? null
      } catch {
        return null
      }
    },
    [convexAudience],
  )
  return useMemo(
    () => ({
      isLoading: !isLoaded,
      isAuthenticated: isSignedIn ?? false,
      fetchAccessToken,
    }),
    [fetchAccessToken, isLoaded, isSignedIn],
  )
}

function RootComponent() {
  const { convexClient } = Route.useRouteContext()
  const key = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY
  const tree = (
    <>
      <Outlet />
      <Toaster />
      <TanStackDevtools
        config={{ position: 'bottom-right' }}
        plugins={[
          { name: 'Tanstack Router', render: <TanStackRouterDevtoolsPanel /> },
        ]}
      />
    </>
  )
  if (!key) return tree
  return (
    <ClerkProvider
      publishableKey={key}
      localization={getLocale() === 'de' ? deDE : enUS}
      appearance={{
        variables: {
          colorPrimary: 'var(--primary)',
          colorPrimaryForeground: 'var(--primary-foreground)',
          colorBackground: 'var(--card)',
          colorForeground: 'var(--foreground)',
          colorMutedForeground: 'var(--muted-foreground)',
          colorInput: 'var(--raised)',
          colorInputForeground: 'var(--foreground)',
          colorNeutral: 'var(--foreground)',
          colorDanger: 'var(--destructive)',
          colorSuccess: 'var(--success)',
          borderRadius: 'var(--radius)',
          fontFamily: 'inherit',
        },
        elements: {
          cardBox: 'shadow-none border border-border',
          footer: 'bg-none',
        },
      }}
    >
      <ConvexProviderWithAuth
        client={convexClient}
        useAuth={useClerkConvexAuth}
      >
        <WorkspaceState>{tree}</WorkspaceState>
      </ConvexProviderWithAuth>
    </ClerkProvider>
  )
}

function RootDocument({ children }: { children: React.ReactNode }) {
  return (
    <html lang={getLocale()} suppressHydrationWarning>
      <head>
        <HeadContent />
      </head>
      <body>
        <ThemeProvider
          attribute="class"
          defaultTheme="dark"
          enableSystem
          disableTransitionOnChange
        >
          {children}
        </ThemeProvider>
        <Scripts />
      </body>
    </html>
  )
}
