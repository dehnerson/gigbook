import type { ReactNode } from 'react'
import { Crumb } from '@/components/app/page-header'
import { songSearch } from '@/lib/song-context'
import { m } from '@/paraglide/messages'

export function songCrumbs({
  songId,
  title,
  band,
  linked = true,
}: {
  songId: string
  title: string
  band?: { id: string; name: string } | null
  linked?: boolean
}): Array<ReactNode> {
  const song = linked ? (
    <Crumb
      key="song"
      to="/songs/$songId"
      params={{ songId }}
      search={songSearch(band?.id)}
    >
      {title}
    </Crumb>
  ) : (
    <span key="song" className="truncate text-foreground">
      {title}
    </span>
  )
  if (!band) {
    return [
      <Crumb key="library" to="/">
        {m.library()}
      </Crumb>,
      song,
    ]
  }
  return [
    <Crumb key="bands" to="/bands">
      {m.bands()}
    </Crumb>,
    <Crumb key="band" to="/bands/$bandId" params={{ bandId: band.id }}>
      {band.name}
    </Crumb>,
    song,
  ]
}
