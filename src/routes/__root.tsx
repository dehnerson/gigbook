import { deDE, enUS } from '@clerk/localizations'
import { ClerkProvider, useAuth } from '@clerk/tanstack-react-start'
import { convexQuery } from '@convex-dev/react-query'
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
import type { ConvexReactClient } from 'convex/react'
import { ConvexProviderWithClerk } from 'convex/react-clerk'
import { ThemeProvider, useTheme } from 'next-themes'
import { api } from '../../convex/_generated/api'
import { Toaster } from '@/components/ui/sonner'
import { EnsureUser } from '@/components/ensure-user'
import { fetchClerkAuth } from '@/lib/auth'
import { clerkAppearance } from '@/lib/clerk-appearance'
import { RouteError, RouteNotFound } from '@/components/app/route-states'
import { loadQuery } from '@/lib/load'
import { getLocale } from '@/paraglide/runtime'
import { m } from '@/paraglide/messages'
import appCss from '../styles.css?url'

export interface RouterContext {
  queryClient: QueryClient
  convexClient: ConvexReactClient
  convexQueryClient: ConvexQueryClient
}

export const Route = createRootRouteWithContext<RouterContext>()({
  beforeLoad: async ({ context }) => {
    const { userId, token } = await fetchClerkAuth()
    // serverHttpClient only exists during SSR, which is when loaders make HTTP queries.
    if (token) context.convexQueryClient.serverHttpClient?.setAuth(token)
    return { userId, token }
  },
  loader: async ({ context }) => {
    await loadQuery(context.queryClient, convexQuery(api.users.me, {}))
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

function RootComponent() {
  const { convexClient } = Route.useRouteContext()
  const { resolvedTheme } = useTheme()
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
      appearance={clerkAppearance(resolvedTheme !== 'light')}
    >
      <ConvexProviderWithClerk client={convexClient} useAuth={useAuth}>
        {tree}
        <EnsureUser />
      </ConvexProviderWithClerk>
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
