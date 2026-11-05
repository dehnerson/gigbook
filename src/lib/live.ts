import { useSuspenseQuery } from '@tanstack/react-query'
import type { QueryKey, UseQueryOptions } from '@tanstack/react-query'

export function useLiveQuery<TData, TKey extends QueryKey>(
  options: Pick<
    UseQueryOptions<TData, Error, TData, TKey>,
    'queryKey' | 'queryFn' | 'staleTime'
  >,
) {
  return useSuspenseQuery(options as never) as { data: TData }
}
