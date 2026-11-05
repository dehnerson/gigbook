import { convexQuery } from '@convex-dev/react-query'
import { api } from '../../convex/_generated/api'
import { useLiveQuery } from '@/lib/live'
import type { Notation } from '@/lib/music/pitch'

export function useNotation(): Notation {
  const me = useLiveQuery(convexQuery(api.users.me, {}))
  return me.data?.notation === 'de' ? 'de' : 'en'
}
