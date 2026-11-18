import type { ReactNode } from 'react'
import { Crumb } from '@/components/app/page-header'
import { built } from '@/lib/built'
import { path } from '@/lib/space'
import { useTrail } from '@/lib/use-trail'
import { m } from '@/paraglide/messages'

export function songCrumbs({
  songId,
  title,
  linked = true,
}: {
  songId: string
  title: string
  linked?: boolean
}): Array<ReactNode> {
  const trail = useTrail()
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
