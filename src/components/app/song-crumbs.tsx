import type { ReactNode } from 'react'
import { Crumb } from '@/components/app/page-header'
import { built } from '@/lib/built'
import { path } from '@/lib/space'
import type { Workspace } from '@/lib/space'
import { m } from '@/paraglide/messages'

export function songCrumbs({
  workspace,
  songId,
  title,
  linked = true,
}: {
  workspace: Workspace | null
  songId: string
  title: string
  linked?: boolean
}): Array<ReactNode> {
  const song = linked ? (
    <Crumb key="song" {...built(path(workspace, { page: 'song', songId }))}>
      {title}
    </Crumb>
  ) : (
    <span key="song" className="truncate text-foreground">
      {title}
    </span>
  )
  return [
    workspace ? (
      <Crumb key="songs" {...built(path(workspace, { page: 'songs' }))}>
        {m.songs()}
      </Crumb>
    ) : (
      <Crumb key="library" {...built(path(null, { page: 'library' }))}>
        {m.allSongs()}
      </Crumb>
    ),
    song,
  ]
}
