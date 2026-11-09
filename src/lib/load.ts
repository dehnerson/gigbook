import type { QueryClient } from '@tanstack/react-query'

export function createLoad(queryClient: QueryClient) {
  return (options: object) =>
    queryClient.query({
      ...options,
      staleTime: 'static',
    } as never)
}

export type Load = ReturnType<typeof createLoad>
