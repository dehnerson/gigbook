import { useNavigate } from '@tanstack/react-router'
import { useMutation } from 'convex/react'
import { ConvexError } from 'convex/values'
import { toast } from 'sonner'
import { api } from '../../convex/_generated/api'
import type { Id } from '../../convex/_generated/dataModel'
import { messageFor } from '@/lib/errors'
import { songSearch } from '@/lib/song-context'
import { m } from '@/paraglide/messages'

async function copyShareLink(token: string) {
  await navigator.clipboard.writeText(
    `${window.location.origin}/share/${encodeURIComponent(token)}`,
  )
}

export function useVersionActions() {
  const fork = useMutation(api.versions.duplicate)
  const copyTo = useMutation(api.versions.copyTo)
  const moveTo = useMutation(api.versions.moveTo)
  const copy = useMutation(api.versions.copy)
  const ensureShare = useMutation(api.versions.ensureShare)
  const rotateShare = useMutation(api.versions.rotateShare)
  const revokeShare = useMutation(api.versions.revokeShare)
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
    copyToLibrary: async (versionId: Id<'versions'>) => {
      try {
        const copied = await copyTo({ versionId })
        if (copied.existing) toast.info(m.alreadyInLibrary())
        else toast.success(m.madeMyCopy())
        await navigate({
          to: '/versions/$versionId',
          params: { versionId: copied.versionId },
        })
      } catch (error) {
        toast.error(messageFor(error))
      }
    },
    copyToBand: async (versionId: Id<'versions'>, bandId: Id<'bands'>) => {
      try {
        const copied = await copyTo({ versionId, bandId })
        if (copied.existing) toast.info(m.alreadyInLibrary())
        else toast.success(m.copiedToBand())
        await navigate({
          to: '/versions/$versionId',
          params: { versionId: copied.versionId },
        })
      } catch (error) {
        toast.error(messageFor(error))
      }
    },
    moveToLibrary: async (versionId: Id<'versions'>) => {
      try {
        const moved = await moveTo({ versionId })
        toast.success(m.movedChart())
        await navigate({
          to: '/versions/$versionId',
          params: { versionId: moved.versionId },
        })
      } catch (error) {
        toast.error(messageFor(error))
      }
    },
    moveToBand: async (versionId: Id<'versions'>, bandId: Id<'bands'>) => {
      try {
        const moved = await moveTo({ versionId, bandId })
        toast.success(m.movedChart())
        await navigate({
          to: '/versions/$versionId',
          params: { versionId: moved.versionId },
        })
      } catch (error) {
        toast.error(messageFor(error))
      }
    },
    fork: async (versionId: Id<'versions'>, token?: string) => {
      try {
        const forked = await fork({ versionId, token })
        if (forked.existing) toast.info(m.alreadyInLibrary())
        else if (forked.joinedSong)
          toast.success(m.addedAsVersion({ title: forked.joinedSong }))
        else toast.success(m.copiedToLibrary())
        await navigate({
          to: '/songs/$songId',
          params: { songId: forked.songId },
          search: songSearch(),
        })
      } catch (error) {
        toast.error(messageFor(error))
      }
    },
    share: async (versionId: Id<'versions'>) => {
      try {
        await copyShareLink(await ensureShare({ versionId }))
        toast.success(m.linkCopied())
      } catch (error) {
        toast.error(messageFor(error))
      }
    },
    rotateShare: async (versionId: Id<'versions'>) => {
      try {
        await copyShareLink(await rotateShare({ versionId }))
        toast.success(m.newLinkCopied())
      } catch (error) {
        toast.error(messageFor(error))
      }
    },
    revokeShare: async (versionId: Id<'versions'>) => {
      try {
        await revokeShare({ versionId })
        toast.success(m.shareStopped())
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
