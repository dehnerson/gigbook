import { useNavigate } from '@tanstack/react-router'
import { useMutation } from 'convex/react'
import { api } from '../../../convex/_generated/api'
import type { Id } from '../../../convex/_generated/dataModel'
import { ConfirmDialog } from '@/components/app/confirm-dialog'
import { m } from '@/paraglide/messages'

export function versionDeleteCopy(
  versionName: string,
  songTitle: string,
  isOnlyVersion: boolean,
) {
  if (isOnlyVersion) {
    return {
      title: m.deleteSongConfirm({ title: songTitle }),
      description: m.deleteOnlyVersionHint({
        name: versionName,
        title: songTitle,
      }),
    }
  }
  return {
    title: m.deleteVersionConfirm({ name: versionName }),
    description: m.deleteVersionHint(),
  }
}

export function DeleteVersionDialog({
  isOpen,
  onOpenChange,
  versionId,
  versionName,
  songTitle,
  isOnlyVersion,
  redirectToSong = false,
}: {
  isOpen: boolean
  onOpenChange: (open: boolean) => void
  versionId: Id<'versions'>
  versionName: string
  songTitle: string
  isOnlyVersion: boolean
  redirectToSong?: boolean
}) {
  const removeVersion = useMutation(api.versions.remove)
  const navigate = useNavigate()
  const copy = versionDeleteCopy(versionName, songTitle, isOnlyVersion)
  return (
    <ConfirmDialog
      isOpen={isOpen}
      onOpenChange={onOpenChange}
      title={copy.title}
      description={copy.description}
      confirmLabel={isOnlyVersion ? m.deleteSong() : undefined}
      onConfirm={async () => {
        const result = await removeVersion({ versionId })
        if (result.deletedSong) await navigate({ to: '/' })
        else if (redirectToSong)
          await navigate({
            to: '/songs/$songId',
            params: { songId: result.songId },
          })
      }}
    />
  )
}
