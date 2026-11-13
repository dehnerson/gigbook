import { convexQuery } from '@convex-dev/react-query'
import { useNavigate } from '@tanstack/react-router'
import {
  CopyIcon,
  Link2OffIcon,
  PencilIcon,
  RefreshCwIcon,
  Share2Icon,
  Trash2Icon,
} from 'lucide-react'
import { useState } from 'react'
import type { ReactNode } from 'react'
import { api } from '../../convex/_generated/api'
import type { Id } from '../../convex/_generated/dataModel'
import { ContextMark } from '@/components/app/context-mark'
import { DeleteVersionDialog } from '@/components/app/delete-version-dialog'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  DropdownMenu,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { useVersionActions } from '@/components/version-actions'
import { useLiveQuery } from '@/lib/live'
import { cn } from 'cn'
import { m } from '@/paraglide/messages'

type VersionTarget = {
  _id: Id<'versions'>
  name: string
  canEdit: boolean
  shared: boolean
  ownerBandId: string | null
}

type Home = {
  id: string
  label: string
  bandId?: Id<'bands'>
}

export function VersionMenu({
  version,
  songTitle,
  isOnlyVersion,
  includeEdit = false,
  redirectToSong = false,
  trigger,
}: {
  version: VersionTarget
  songTitle: string
  isOnlyVersion: boolean
  includeEdit?: boolean
  redirectToSong?: boolean
  trigger: ReactNode
}) {
  const bands = useLiveQuery(convexQuery(api.bands.list, {}))
  const actions = useVersionActions()
  const navigate = useNavigate()
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [linkAction, setLinkAction] = useState<'rotate' | 'revoke' | null>(null)
  const [place, setPlace] = useState<'copy' | 'move' | null>(null)
  const [choice, setChoice] = useState<string | null>(null)
  const rows = bands.data
  const copyHomes = homes(version, rows, 'copy')
  const moveHomes = homes(version, rows, 'move')
  const options = place === 'copy' ? copyHomes : moveHomes
  const selected = options.some((home) => home.id === choice)
    ? choice
    : (options[0]?.id ?? null)
  const showEdit = includeEdit && version.canEdit
  const showOwned = version.canEdit
  if (!showEdit && !showOwned && copyHomes.length === 0) return null

  const open = (mode: 'copy' | 'move', list: Array<Home>) => {
    setChoice(list[0]?.id ?? null)
    setPlace(mode)
  }

  const confirmLink = async () => {
    const action = linkAction
    setLinkAction(null)
    if (action === 'rotate') await actions.rotateShare(version._id)
    if (action === 'revoke') await actions.revokeShare(version._id)
  }

  const confirm = async () => {
    const home = options.find((item) => item.id === selected)
    if (!home || !place) return
    setPlace(null)
    if (place === 'copy') {
      if (home.bandId) await actions.copyToBand(version._id, home.bandId)
      else await actions.copyToLibrary(version._id)
      return
    }
    if (home.bandId) await actions.moveToBand(version._id, home.bandId)
    else await actions.moveToLibrary(version._id)
  }

  return (
    <>
      <DropdownMenuTrigger>
        {trigger}
        <DropdownMenu placement="bottom end" className="w-56">
          {showEdit ? (
            <DropdownMenuItem
              textValue={m.edit()}
              onAction={() =>
                void navigate({
                  to: '/versions/$versionId/edit',
                  params: { versionId: version._id },
                })
              }
            >
              <PencilIcon />
              {m.edit()}
            </DropdownMenuItem>
          ) : null}
          {showOwned ? (
            <DropdownMenuSub>
              <DropdownMenuSubTrigger textValue={m.shareMenu()}>
                <Share2Icon />
                {m.shareMenu()}
              </DropdownMenuSubTrigger>
              <DropdownMenuSubContent>
                <DropdownMenuItem
                  textValue={m.share()}
                  onAction={() => void actions.share(version._id)}
                >
                  <Share2Icon />
                  {m.share()}
                </DropdownMenuItem>
                {version.shared ? (
                  <DropdownMenuItem
                    textValue={m.newShareLink()}
                    onAction={() => setLinkAction('rotate')}
                  >
                    <RefreshCwIcon />
                    {m.newShareLink()}
                  </DropdownMenuItem>
                ) : null}
                {version.shared ? (
                  <DropdownMenuItem
                    variant="destructive"
                    textValue={m.stopSharing()}
                    onAction={() => setLinkAction('revoke')}
                  >
                    <Link2OffIcon />
                    {m.stopSharing()}
                  </DropdownMenuItem>
                ) : null}
              </DropdownMenuSubContent>
            </DropdownMenuSub>
          ) : null}
          {showOwned ? (
            <DropdownMenuItem
              textValue={m.duplicate()}
              onAction={() =>
                void actions.copy(version).then((copyId) => {
                  if (!copyId) return
                  return navigate({
                    to: '/versions/$versionId/edit',
                    params: { versionId: copyId },
                  })
                })
              }
            >
              <CopyIcon />
              {m.duplicate()}
            </DropdownMenuItem>
          ) : null}
          {copyHomes.length > 0 ? (
            <DropdownMenuItem
              textValue={m.copyVerb()}
              onAction={() => open('copy', copyHomes)}
            >
              {m.copyVerb()}
            </DropdownMenuItem>
          ) : null}
          {moveHomes.length > 0 ? (
            <DropdownMenuItem
              textValue={m.moveVerb()}
              onAction={() => open('move', moveHomes)}
            >
              {m.moveVerb()}
            </DropdownMenuItem>
          ) : null}
          {showOwned ? <DropdownMenuSeparator /> : null}
          {showOwned ? (
            <DropdownMenuItem
              variant="destructive"
              textValue={m.deleteVersion()}
              onAction={() => setConfirmDelete(true)}
            >
              <Trash2Icon />
              {m.deleteVersion()}
            </DropdownMenuItem>
          ) : null}
        </DropdownMenu>
      </DropdownMenuTrigger>
      <Dialog
        isOpen={place !== null}
        onOpenChange={(isOpen) => {
          if (!isOpen) setPlace(null)
        }}
      >
        <DialogHeader>
          <DialogTitle>
            {place === 'move' ? m.moveVerb() : m.copyVerb()}
          </DialogTitle>
          <DialogDescription>
            {place === 'move' ? m.moveWhere() : m.copyWhere()}
          </DialogDescription>
        </DialogHeader>
        <ul className="max-h-64 space-y-1 overflow-y-auto">
          {options.map((home) => (
            <li key={home.id}>
              <button
                type="button"
                aria-pressed={home.id === selected}
                className={cn(
                  'flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left hover:bg-muted',
                  home.id === selected && 'bg-muted',
                )}
                onClick={() => setChoice(home.id)}
              >
                <ContextMark
                  bandId={home.bandId}
                  name={home.bandId ? home.label : null}
                />
                <span className="truncate">{home.label}</span>
              </button>
            </li>
          ))}
        </ul>
        <DialogFooter>
          <Button variant="outline" onPress={() => setPlace(null)}>
            {m.cancel()}
          </Button>
          <Button isDisabled={!selected} onPress={() => void confirm()}>
            {place === 'move' ? m.moveVerb() : m.copyVerb()}
          </Button>
        </DialogFooter>
      </Dialog>
      <Dialog
        isOpen={linkAction !== null}
        onOpenChange={(isOpen) => {
          if (!isOpen) setLinkAction(null)
        }}
      >
        <DialogHeader>
          <DialogTitle>
            {linkAction === 'revoke'
              ? m.stopSharingTitle()
              : m.newShareLinkTitle()}
          </DialogTitle>
          <DialogDescription>
            {linkAction === 'revoke'
              ? m.stopSharingHint()
              : m.newShareLinkHint()}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onPress={() => setLinkAction(null)}>
            {m.cancel()}
          </Button>
          <Button
            variant={linkAction === 'revoke' ? 'destructive' : 'default'}
            onPress={() => void confirmLink()}
          >
            {linkAction === 'revoke' ? m.stopSharing() : m.newShareLink()}
          </Button>
        </DialogFooter>
      </Dialog>
      <DeleteVersionDialog
        isOpen={confirmDelete}
        onOpenChange={setConfirmDelete}
        versionId={version._id}
        versionName={version.name}
        songTitle={songTitle}
        isOnlyVersion={isOnlyVersion}
        redirectToSong={redirectToSong}
        bandId={version.ownerBandId}
      />
    </>
  )
}

function homes(
  version: VersionTarget,
  bands: Array<{
    band: { _id: Id<'bands'>; name: string }
    membership: { role: string }
  }>,
  mode: 'copy' | 'move',
): Array<Home> {
  const others = bands.filter(
    (row) =>
      row.membership.role !== 'viewer' && row.band._id !== version.ownerBandId,
  )
  const library =
    mode === 'copy'
      ? Boolean(version.ownerBandId) || !version.canEdit
      : Boolean(version.ownerBandId) && version.canEdit
  const bandHomes = version.canEdit ? others : []
  return [
    ...(library ? [{ id: 'library', label: m.myLibrary() }] : []),
    ...bandHomes.map((row) => ({
      id: row.band._id,
      bandId: row.band._id,
      label: row.band.name,
    })),
  ]
}
