import { SkipForwardIcon } from 'lucide-react'
import type { ReactNode } from 'react'
import { VersionCaption } from '@/components/sheet/song-sheet'
import { m } from '@/paraglide/messages'

export function UpNext({
  title,
  versionName,
  artist,
  mark,
  onClick,
}: {
  title: string
  versionName?: string
  artist?: string
  mark?: ReactNode
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="mt-12 flex w-full items-center justify-between gap-4 rounded-2xl border bg-card p-5 text-left transition-colors hover:border-primary/50"
    >
      <span className="min-w-0">
        <span className="block text-xs font-semibold tracking-widest text-primary uppercase">
          {m.upNext()}
        </span>
        <span className="mt-1 flex items-center gap-2 text-lg font-semibold">
          {mark}
          <span className="truncate">{title}</span>
        </span>
        {versionName ? (
          <VersionCaption
            name={versionName}
            artist={artist}
            className="truncate"
          />
        ) : null}
      </span>
      <SkipForwardIcon className="size-5 shrink-0 text-muted-foreground" />
    </button>
  )
}
