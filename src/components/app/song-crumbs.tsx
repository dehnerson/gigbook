import type { ReactNode } from 'react'
import { Crumb } from '@/components/app/page-header'
import type { Workspace } from '@/lib/workspace'
import { m } from '@/paraglide/messages'

export function songCrumbs({
  workspace,
  songId,
  title,
  linked = true,
}: {
  workspace?: Workspace
  songId: string
  title: string
  linked?: boolean
}): Array<ReactNode> {
  const song = linked ? (
    <Crumb
      key="song"
      {...{
        to: workspace ? '/$workspace/songs/$songId' : '/songs/$songId',
        params: workspace ? { workspace: workspace.key, songId } : { songId },
      }}
    >
      {title}
    </Crumb>
  ) : (
    <span key="song" className="truncate text-foreground">
      {title}
    </span>
  )
  return [
    workspace ? (
      <Crumb
        key="songs"
        {...{
          to: '/$workspace/songs',
          params: { workspace: workspace.key },
        }}
      >
        {m.songs()}
      </Crumb>
    ) : (
      <Crumb
        key="library"
        {...{
          to: '/',
        }}
      >
        {m.allSongs()}
      </Crumb>
    ),
    song,
  ]
}
