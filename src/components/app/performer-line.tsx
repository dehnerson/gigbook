import { m } from '@/paraglide/messages'

// Song-level credit. A single version uses VersionCaption (name, then artist)
// instead, because the version name is part of that line.
export function performerNames(artists: Array<string | undefined>) {
  return [
    ...new Set(
      artists.flatMap((artist) => {
        const name = artist?.trim()
        return name ? [name] : []
      }),
    ),
  ]
}

export function PerformerLine({
  artists,
  className,
}: {
  artists: Array<string | undefined>
  className?: string
}) {
  const names = performerNames(artists)
  if (names.length === 0) return null
  return (
    <span className={className}>
      {m.performedByArtist({ artist: names.join(', ') })}
    </span>
  )
}
