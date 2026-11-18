import { createContext, useContext } from 'react'
import type { ReactNode } from 'react'
import type { Id } from '../../convex/_generated/dataModel'

export type Home = {
  bandId: Id<'bands'> | null
  label: string
  role: 'owner' | 'editor' | 'viewer'
  organizationId: string | null
}

const HomeContext = createContext<Home | null>(null)

export function HomeProvider({
  home,
  children,
}: {
  home: Home
  children: ReactNode
}) {
  return <HomeContext value={home}>{children}</HomeContext>
}

export function useHome() {
  return useContext(HomeContext)
}
