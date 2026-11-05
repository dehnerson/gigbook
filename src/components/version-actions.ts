import { useNavigate } from '@tanstack/react-router'
import { useMutation } from 'convex/react'
import { ConvexError } from 'convex/values'
import { toast } from 'sonner'
import { api } from '../../convex/_generated/api'
import type { Id } from '../../convex/_generated/dataModel'
import { messageFor } from '@/lib/errors'
import { m } from '@/paraglide/messages'

export function useVersionActions() {
  const fork = useMutation(api.versions.duplicate)
  const copy = useMutation(api.versions.copy)
  const ensureShare = useMutation(api.versions.ensureShare)
  const saveKey = useMutation(api.versions.saveWrittenKey)
  const navigate = useNavigate()

  return {
    copy: async (version: { _id: Id<'versions'>; name: string }) => {
      try {
        const versionId = await copy({
          versionId: version._id,
          name: m.copyOf({ name: version.name }),
        })
        toast.success(m.duplicated())
        return versionId
      } catch (error) {
        toast.error(messageFor(error))
        return null
      }
    },
    fork: async (versionId: Id<'versions'>) => {
      try {
        const forked = await fork({ versionId })
        if (forked.existing) toast.info(m.alreadyInLibrary())
        else toast.success(m.copiedToLibrary())
        await navigate({
          to: '/songs/$songId',
          params: { songId: forked.songId },
        })
      } catch (error) {
        toast.error(messageFor(error))
      }
    },
    share: async (versionId: Id<'versions'>) => {
      try {
        const token = await ensureShare({ versionId })
        await navigator.clipboard.writeText(
          `${window.location.origin}/share/${token}`,
        )
        toast.success(m.linkCopied())
      } catch (error) {
        toast.error(messageFor(error))
      }
    },
    saveKey: async (versionId: Id<'versions'>, semitones: number) => {
      try {
        await saveKey({ versionId, semitones })
        toast.success(m.keySavedToVersion())
        return true
      } catch (error) {
        toast.error(
          error instanceof ConvexError && String(error.data) === 'INVALID'
            ? m.outOfRange()
            : messageFor(error),
        )
        return false
      }
    },
  }
}
