import { Link } from '@tanstack/react-router'
import { ChevronRightIcon } from 'lucide-react'
import type * as React from 'react'
import { songSearch } from '@/lib/song-context'
import type { SongSearch } from '@/lib/song-context'
import { m } from '@/paraglide/messages'
import { Chip, Monogram } from './chip'
import { PerformerLine, performerNames } from './performer-line'

export type SongSummary = {
  _id: string
  title: string
  subTitle?: string
  bandId?: string
  bandName?: string
}

export function SongRow({
  song,
  performers,
  versionCount,
  search,
  trailing,
}: {
  song: SongSummary
  performers?: Array<string>
  versionCount?: number
  search?: SongSearch
  trailing?: React.ReactNode
}) {
  const subtitle = song.subTitle?.trim()
  const credited = performerNames(performers ?? []).length > 0
  return (
    <li className="group relative flex items-center gap-4 rounded-xl px-3 py-2.5 transition-colors hover:bg-card">
      <Monogram text={song.title} />
      <div className="min-w-0 flex-1">
        <div className="flex min-w-0 items-center gap-2">
          <Link
            to="/songs/$songId"
            params={{ songId: song._id }}
            search={search ?? songSearch()}
            className="truncate font-medium outline-none after:absolute after:inset-0 after:rounded-xl focus-visible:after:ring-2 focus-visible:after:ring-ring"
          >
            {song.title}
          </Link>
        </div>
        {subtitle || credited ? (
          <p className="truncate text-sm text-muted-foreground">
            {subtitle}
            {subtitle && credited ? ' · ' : null}
            <PerformerLine artists={performers ?? []} />
          </p>
        ) : null}
      </div>
      <div className="hidden items-center gap-1.5 sm:flex">
        {versionCount !== undefined ? (
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
