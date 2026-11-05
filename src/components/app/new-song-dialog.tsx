import { useNavigate } from '@tanstack/react-router'
import { useMutation } from 'convex/react'
import { useState } from 'react'
import { toast } from 'sonner'
import { api } from '../../../convex/_generated/api'
import type { Id } from '../../../convex/_generated/dataModel'
import { Field } from '@/components/app/field'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { useNotation } from '@/components/use-notation'
import { messageFor } from '@/lib/errors'
import { keyOptions } from '@/lib/music/keys'
import { m } from '@/paraglide/messages'

export function NewSongDialog({
  isOpen,
  onOpenChange,
  bandId,
}: {
  isOpen: boolean
  onOpenChange: (open: boolean) => void
  bandId?: Id<'bands'>
}) {
  const create = useMutation(api.songs.create)
  const navigate = useNavigate()
  const notation = useNotation()
  const [title, setTitle] = useState('')
  const [artist, setArtist] = useState('')
  const [concertKey, setConcertKey] = useState('C')
  const [busy, setBusy] = useState(false)

  const reset = () => {
    setTitle('')
    setArtist('')
    setConcertKey('C')
  }

  return (
    <Dialog
      isOpen={isOpen}
      onOpenChange={(open) => {
        onOpenChange(open)
        if (!open) reset()
      }}
      className="sm:max-w-md"
    >
      <DialogHeader>
        <DialogTitle>{m.newSong()}</DialogTitle>
        <DialogDescription>{m.newSongHint()}</DialogDescription>
      </DialogHeader>
      <form
        className="grid gap-4"
        onSubmit={(event) => {
          event.preventDefault()
          if (!title.trim()) return
          setBusy(true)
          create({
            title,
            artist,
            bandId,
            versionName: m.defaultVersionName(),
            concertKey,
          })
            .then((created) => {
              onOpenChange(false)
              reset()
              return navigate({
                to: '/versions/$versionId/edit',
                params: { versionId: created.versionId },
              })
            })
            .catch((error: unknown) => toast.error(messageFor(error)))
            .finally(() => setBusy(false))
        }}
      >
        <Field label={m.title()}>
          <Input
            autoFocus
            required
            value={title}
            placeholder={m.titlePlaceholder()}
            onChange={(event) => setTitle(event.target.value)}
          />
        </Field>
        <Field label={m.artist()}>
          <Input
            value={artist}
            placeholder={m.artistPlaceholder()}
            onChange={(event) => setArtist(event.target.value)}
          />
        </Field>
        <Select
          label={m.concertKey()}
          value={concertKey}
          options={keyOptions(notation)}
          onChange={setConcertKey}
        />
        <DialogFooter>
          <Button variant="outline" onPress={() => onOpenChange(false)}>
            {m.cancel()}
          </Button>
          <Button type="submit" isDisabled={busy || !title.trim()}>
            {m.createAndEdit()}
          </Button>
        </DialogFooter>
      </form>
    </Dialog>
  )
}
