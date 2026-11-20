import type { ReactNode } from 'react'
import { Crumb } from '@/components/app/page-header'
import { built } from '@/lib/built'
import { path } from '@/lib/space'
import type { Trail } from '@/lib/space'
import { m } from '@/paraglide/messages'

export function songCrumbs({
  trail,
  songId,
  title,
  linked = true,
}: {
  trail: Trail
  songId: string
  title: string
  linked?: boolean
}): Array<ReactNode> {
  const song = linked ? (
    <Crumb key="song" {...built(path(trail, { page: 'song', songId }))}>
      {title}
    </Crumb>
  ) : (
    <span key="song" className="truncate text-foreground">
      {title}
    </span>
  )
  return [
    trail.kind === 'workspace' ? (
      <Crumb key="songs" {...built(path(trail, { page: 'songs' }))}>
        {m.songs()}
      </Crumb>
    ) : (
      <Crumb key="library" {...built(path(trail, { page: 'library' }))}>
        {m.allSongs()}
      </Crumb>
    ),
    song,
  ]
}
