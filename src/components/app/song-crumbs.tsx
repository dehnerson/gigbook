import type { ReactNode } from 'react'
import { Crumb } from '@/components/app/page-header'
import { href } from '@/lib/space'
import { m } from '@/paraglide/messages'

export function songCrumbs({
  at,
  songId,
  title,
  linked = true,
}: {
  /** Null keeps the crumb on the library. A key stays in that workspace. */
  at: string | null
  songId: string
  title: string
  linked?: boolean
}): Array<ReactNode> {
  const song = linked ? (
    <Crumb key="song" {...href(at, { page: 'song', songId })}>
      {title}
    </Crumb>
  ) : (
    <span key="song" className="truncate text-foreground">
      {title}
    </span>
  )
  return [
    at ? (
      <Crumb key="songs" {...href(at, { page: 'songs' })}>
        {m.songs()}
      </Crumb>
    ) : (
      <Crumb key="library" {...href(null, { page: 'library' })}>
        {m.allSongs()}
      </Crumb>
    ),
    song,
  ]
}
