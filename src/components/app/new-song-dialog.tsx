import { useNavigate } from '@tanstack/react-router'
import { useMutation, useQuery } from 'convex/react'
import { useEffect, useState } from 'react'
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
  const addVersion = useMutation(api.songs.addVersion)
  const navigate = useNavigate()
  const notation = useNotation()
  const [title, setTitle] = useState('')
  const [artist, setArtist] = useState('')
  const [concertKey, setConcertKey] = useState('C')
  const [busy, setBusy] = useState(false)
  const [search, setSearch] = useState({ title: '', artist: '' })
  const [duplicate, setDuplicate] = useState<{
    existing: Id<'songs'>
    title: string
  } | null>(null)

  useEffect(() => {
    const timer = window.setTimeout(() => setSearch({ title, artist }), 300)
    return () => window.clearTimeout(timer)
  }, [title, artist])

  const similar =
    useQuery(
      api.songs.similar,
      isOpen && search.title.trim().length >= 2
        ? { ...search, bandId }
        : 'skip',
    ) ?? []
  const matches =
    similar.length === 0 && duplicate
      ? [
          {
            _id: duplicate.existing,
            title: duplicate.title,
            artist: '',
            exact: true,
          },
        ]
      : similar
  const exact = matches.find((song) => song.exact)

  const reset = () => {
    setTitle('')
    setArtist('')
    setConcertKey('C')
    setDuplicate(null)
  }

  const finish = (versionId: Id<'versions'>) => {
    onOpenChange(false)
    reset()
    return navigate({
      to: '/versions/$versionId/edit',
      params: { versionId },
    })
  }

  const run = (action: () => Promise<unknown>) => {
    setBusy(true)
    action()
      .catch((error: unknown) => toast.error(messageFor(error)))
      .finally(() => setBusy(false))
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
          run(async () => {
            const created = await create({
              title,
              artist,
              bandId,
              versionName: m.defaultVersionName(),
              concertKey,
            })
            if (created.versionId) await finish(created.versionId)
            else if (created.existing)
              setDuplicate({ existing: created.existing, title: created.title })
          })
        }}
      >
        <Field label={m.title()}>
          <Input
            autoFocus
            required
            value={title}
            placeholder={m.titlePlaceholder()}
            onChange={(event) => {
              setTitle(event.target.value)
              setDuplicate(null)
            }}
          />
        </Field>
        <Field label={m.artist()}>
          <Input
            value={artist}
            placeholder={m.artistPlaceholder()}
            onChange={(event) => {
              setArtist(event.target.value)
              setDuplicate(null)
            }}
          />
        </Field>
        {matches.length > 0 ? (
          <div className="rounded-xl border bg-muted/40 p-3">
            <p className="text-sm font-medium">
              {exact
                ? m.duplicateSong({ title: exact.title })
                : m.similarSongs()}
            </p>
            {exact ? (
              <p className="text-xs text-muted-foreground">
                {m.duplicateSongHint()}
              </p>
            ) : null}
            <ul className="mt-2 space-y-1">
              {matches.map((song) => (
                <li key={song._id} className="flex items-center gap-2">
                  <p className="min-w-0 flex-1 truncate text-sm">
                    <span className="font-medium">{song.title}</span>
                    {song.artist ? (
                      <span className="text-muted-foreground">
                        {' '}
                        · {song.artist}
                      </span>
                    ) : null}
                  </p>
                  <Button
                    size="sm"
                    variant="ghost"
                    isDisabled={busy}
                    onPress={() => {
                      onOpenChange(false)
                      reset()
                      void navigate({
                        to: '/songs/$songId',
                        params: { songId: song._id },
                      })
                    }}
                  >
                    {m.open()}
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    isDisabled={busy}
                    onPress={() =>
                      run(async () => {
                        const added = await addVersion({
                          songId: song._id,
                          versionName: m.newVersionName(),
                          concertKey,
                        })
                        await finish(added.versionId)
                      })
                    }
                  >
                    {m.addVersion()}
                  </Button>
                </li>
              ))}
            </ul>
          </div>
        ) : null}
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
          <Button
            type="submit"
            isDisabled={busy || !title.trim() || Boolean(exact)}
          >
            {m.createAndEdit()}
          </Button>
        </DialogFooter>
      </form>
    </Dialog>
  )
}
