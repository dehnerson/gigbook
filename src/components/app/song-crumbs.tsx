import type { ReactNode } from 'react'
import { Crumb } from '@/components/app/page-header'
import { songSearch } from '@/lib/song-context'
import { m } from '@/paraglide/messages'

export function songCrumbs({
  songId,
  title,
  linked = true,
  home,
}: {
  songId: string
  title: string
  linked?: boolean
  home?: string | null
}): Array<ReactNode> {
  const scoped = home !== undefined
  const song = linked ? (
    <Crumb
      key="song"
      to="/songs/$songId"
      params={{ songId }}
      search={songSearch(scoped ? home : undefined)}
    >
      {title}
    </Crumb>
  ) : (
    <span key="song" className="truncate text-foreground">
      {title}
    </span>
  )
  return [
    scoped ? (
      <Crumb key="songs" to="/songs" activeOptions={{ exact: true }}>
        {m.songs()}
      </Crumb>
    ) : (
      <Crumb key="library" to="/">
        {m.allSongs()}
      </Crumb>
    ),
    song,
  ]
}
