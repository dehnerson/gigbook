import { convexQuery } from '@convex-dev/react-query'
import { useQuery } from '@tanstack/react-query'
import { api } from '../../convex/_generated/api'
import type { Notation } from '@/lib/music/pitch'

export function useNotation(): Notation {
  const me = useQuery(convexQuery(api.users.me, {}))
  return me.data?.notation === 'de' ? 'de' : 'en'
}
