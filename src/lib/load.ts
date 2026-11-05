import type { QueryClient } from '@tanstack/react-query'

export async function loadQuery(queryClient: QueryClient, options: object) {
  await queryClient.query({
    ...options,
    staleTime: 'static',
  } as never)
}
