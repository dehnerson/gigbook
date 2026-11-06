import { Link } from '@tanstack/react-router'
import { ChevronRightIcon, UsersIcon } from 'lucide-react'
import type * as React from 'react'
import { m } from '@/paraglide/messages'
import { Chip, Monogram } from './chip'

export type SongSummary = {
  _id: string
  title: string
  artist: string
  bandId?: string
}

export function SongRow({
  song,
  performers,
  keys,
  versionCount,
  bandName,
  trailing,
}: {
  song: SongSummary
  performers?: Array<string>
  keys?: Array<string>
  versionCount?: number
  bandName?: string
  trailing?: React.ReactNode
}) {
  const covers = [...new Set(performers)]
  return (
    <li className="group relative flex items-center gap-4 rounded-xl px-3 py-2.5 transition-colors hover:bg-card">
      <Monogram text={song.title} />
      <div className="min-w-0 flex-1">
        <Link
          to="/songs/$songId"
          params={{ songId: song._id }}
          className="block truncate font-medium outline-none after:absolute after:inset-0 after:rounded-xl focus-visible:after:ring-2 focus-visible:after:ring-ring"
        >
          {song.title}
        </Link>
        <p className="truncate text-sm text-muted-foreground">
          {song.artist}
          {covers.length > 0
            ? ` · ${m.performedByArtist({ artist: covers.join(', ') })}`
            : null}
        </p>
      </div>
      <div className="hidden items-center gap-1.5 sm:flex">
        {song.bandId ? (
          <Chip tone="primary" className="max-w-40">
            <UsersIcon className="size-3 shrink-0" />
            <span className="truncate">{bandName ?? m.band()}</span>
          </Chip>
        ) : null}
        {keys && keys.length > 0 ? (
          <Chip label={m.keyShort()}>
            <span className="font-mono">{[...new Set(keys)].join(' · ')}</span>
          </Chip>
        ) : null}
        {versionCount !== undefined && versionCount > 1 ? (
          <Chip>{m.versionCount({ count: String(versionCount) })}</Chip>
        ) : null}
      </div>
      {trailing ? (
        <div className="relative z-10 flex items-center gap-1">{trailing}</div>
      ) : (
        <ChevronRightIcon className="size-4 text-muted-foreground/50 transition-transform group-hover:translate-x-0.5 group-hover:text-foreground" />
      )}
    </li>
  )
}
