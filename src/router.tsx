import { ConvexQueryClient } from '@convex-dev/react-query'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { createRouter as createTanStackRouter } from '@tanstack/react-router'
import { setupRouterSsrQueryIntegration } from '@tanstack/react-router-ssr-query'
import { ConvexProvider, ConvexReactClient } from 'convex/react'
import {
  RouteError,
  RouteNotFound,
  RoutePending,
} from '@/components/app/route-states'
import { routeTree } from './routeTree.gen'

const convexUrl = import.meta.env.VITE_CONVEX_URL
if (!convexUrl) throw new Error('VITE_CONVEX_URL is not set')

export function getRouter() {
  const convexClient = new ConvexReactClient(convexUrl, {
    unsavedChangesWarning: false,
  })
  const convexQueryClient = new ConvexQueryClient(convexClient)
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        queryKeyHashFn: convexQueryClient.hashFn(),
        queryFn: convexQueryClient.queryFn(),
        gcTime: 10 * 60 * 1000,
      },
    },
  })
  convexQueryClient.connect(queryClient)

  const router = createTanStackRouter({
    routeTree,
    scrollRestoration: true,
    defaultPreload: 'intent',
    defaultPreloadStaleTime: 0,
    defaultNotFoundComponent: RouteNotFound,
    defaultErrorComponent: ({ error }) => <RouteError error={error} />,
    defaultPendingComponent: RoutePending,
    defaultPendingMs: 300,
    context: { queryClient, convexClient, convexQueryClient },
    Wrap: ({ children }) => (
      <QueryClientProvider client={queryClient}>
        <ConvexProvider client={convexQueryClient.convexClient}>
          {children}
        </ConvexProvider>
      </QueryClientProvider>
    ),
  })
  setupRouterSsrQueryIntegration({ router, queryClient })
  return router
}

declare module '@tanstack/react-router' {
  interface Register {
    router: ReturnType<typeof getRouter>
  }
}
