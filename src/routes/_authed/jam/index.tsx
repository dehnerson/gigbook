import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useMutation } from 'convex/react'
import { LogInIcon, RadioIcon } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'
import { api } from '../../../../convex/_generated/api'
import { PageHeader } from '@/components/app/page-header'
import { Button } from '@/components/ui/button'
import { messageFor } from '@/lib/errors'
import { m } from '@/paraglide/messages'

export const Route = createFileRoute('/_authed/jam/')({
  component: JamLobby,
})

const CODE_LENGTH = 6

function JamLobby() {
  const create = useMutation(api.jam.create)
  const join = useMutation(api.jam.join)
  const navigate = useNavigate()
  const [code, setCode] = useState('')
  const [busy, setBusy] = useState<'start' | 'join' | null>(null)

  const enter = (room: { code: string }) =>
    navigate({ to: '/jam/$code', params: { code: room.code } })
  const fail = (error: unknown) => toast.error(messageFor(error))

  return (
    <div>
      <PageHeader title={m.jam()} subtitle={m.jamHint()} />
      <div className="grid gap-5 md:grid-cols-2">
        <section className="stage-glow relative flex flex-col gap-6 overflow-hidden rounded-3xl border bg-card p-7 sm:p-9">
          <div className="grid size-14 place-items-center rounded-2xl bg-primary text-primary-foreground shadow-lg shadow-primary/30">
            <RadioIcon className="size-7" />
          </div>
          <div className="space-y-2">
            <h2 className="text-2xl font-semibold tracking-tight">
              {m.startJam()}
            </h2>
            <p className="text-muted-foreground">{m.startJamHint()}</p>
          </div>
          <Button
            size="lg"
            className="mt-auto w-full sm:w-fit"
            isDisabled={busy !== null}
            onPress={() => {
              setBusy('start')
              create({})
                .then(enter)
                .catch(fail)
                .finally(() => setBusy(null))
            }}
          >
            <RadioIcon />
            {m.startJam()}
          </Button>
        </section>

        <section className="flex flex-col gap-6 rounded-3xl border bg-card p-7 sm:p-9">
          <div className="grid size-14 place-items-center rounded-2xl bg-muted text-foreground ring-1 ring-border">
            <LogInIcon className="size-7" />
          </div>
          <div className="space-y-2">
            <h2 className="text-2xl font-semibold tracking-tight">
              {m.joinJam()}
            </h2>
            <p className="text-muted-foreground">{m.joinJamHint()}</p>
          </div>
          <form
            className="mt-auto flex flex-col gap-3 sm:flex-row"
            onSubmit={(event) => {
              event.preventDefault()
              if (code.length < CODE_LENGTH) return
              setBusy('join')
              join({ code })
                .then(enter)
                .catch(fail)
                .finally(() => setBusy(null))
            }}
          >
            <input
              aria-label={m.code()}
              value={code}
              placeholder="ABC123"
              maxLength={CODE_LENGTH}
              autoComplete="off"
              autoCapitalize="characters"
              spellCheck={false}
              onChange={(event) =>
                setCode(
                  event.target.value
                    .toUpperCase()
                    .replace(/[^A-Z0-9]/g, '')
                    .slice(0, CODE_LENGTH),
                )
              }
              className="h-14 min-w-0 flex-1 rounded-xl border border-input bg-input/30 px-4 text-center font-mono text-2xl font-semibold tracking-[0.4em] uppercase outline-none placeholder:text-muted-foreground/40 focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
            />
            <Button
              type="submit"
              size="lg"
              variant="secondary"
              className="h-14"
              isDisabled={busy !== null || code.length < CODE_LENGTH}
            >
              {m.join()}
            </Button>
          </form>
        </section>
      </div>
    </div>
  )
}
