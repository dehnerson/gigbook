import { convexQuery } from '@convex-dev/react-query'
import { createFileRoute, Link } from '@tanstack/react-router'
import { GuitarIcon, LibraryBigIcon, Share2Icon } from 'lucide-react'
import { useState } from 'react'
import { api } from '../../../../convex/_generated/api'
import {
  ControlBar,
  DisplayModeToggle,
  KeyControls,
  TextSizeControl,
} from '@/components/sheet/sheet-controls'
import { SongSheet } from '@/components/sheet/song-sheet'
import type { SheetEntry, SheetSettings } from '@/components/sheet/types'
import { useSheetPrefs } from '@/components/sheet/use-sheet-prefs'
import { Button, ButtonLink } from '@/components/ui/button'
import { useNotation } from '@/components/use-notation'
import { useVersionActions } from '@/components/version-actions'
import { useLiveQuery } from '@/lib/live'
import { loadQuery } from '@/lib/load'
import { m } from '@/paraglide/messages'

export const Route = createFileRoute('/_authed/share/$token')({
  loader: async ({ context, params }) => {
    await loadQuery(
      context.queryClient,
      convexQuery(api.versions.getByShare, { token: params.token }),
    )
  },
  component: SharePage,
})

function SharePage() {
  const { token } = Route.useParams()
  const bundle = useLiveQuery(convexQuery(api.versions.getByShare, { token }))
  const { version, song, shapes, libraryCopy } = bundle.data
  const timeline = bundle.data.timeline as Array<SheetEntry>
  const notation = useNotation()
  const actions = useVersionActions()
  const prefs = useSheetPrefs('read')
  const [capo, setCapo] = useState<number>(version.suggestedCapo)
  const [transpose, setTranspose] = useState(0)
  const [busy, setBusy] = useState(false)

  const settings: SheetSettings = {
    capo,
    transpose,
    notation,
    mode: prefs.mode,
    scale: prefs.scale,
  }

  return (
    <div className="stage-glow min-h-screen bg-background text-foreground">
      <header className="sticky top-0 z-30 border-b bg-background/85 backdrop-blur-xl">
        <div className="mx-auto flex max-w-4xl items-center justify-between gap-3 px-4 py-3">
          <Link to="/" className="flex items-center gap-2.5">
            <span className="grid size-8 place-items-center rounded-lg bg-primary text-primary-foreground">
              <GuitarIcon className="size-4.5" />
            </span>
            <span className="font-semibold">{m.appName()}</span>
          </Link>
          {libraryCopy ? (
            <ButtonLink
              variant="secondary"
              to="/versions/$versionId"
              params={{ versionId: libraryCopy.versionId }}
            >
              <LibraryBigIcon />
              {m.openInLibrary()}
            </ButtonLink>
          ) : (
            <Button
              isDisabled={busy}
              onPress={async () => {
                setBusy(true)
                await actions.fork(version._id)
                setBusy(false)
              }}
            >
              <LibraryBigIcon />
              {m.forkToLibrary()}
            </Button>
          )}
        </div>
      </header>
      <main className="mx-auto max-w-4xl space-y-6 px-4 pt-6 pb-24 sm:px-8">
        <div className="flex items-center gap-3 rounded-2xl border border-primary/25 bg-primary/8 px-4 py-3 text-sm">
          <Share2Icon className="size-4 shrink-0 text-primary" />
          <span>{m.sharedWithYou()}</span>
        </div>
        <ControlBar>
          <KeyControls
            capo={capo}
            onCapo={setCapo}
            transpose={transpose}
            onTranspose={setTranspose}
            concertKey={version.concertKey}
            notation={notation}
          />
          <div className="flex flex-wrap items-center gap-2 sm:ml-auto">
            <DisplayModeToggle mode={prefs.mode} onMode={prefs.setMode} />
            <TextSizeControl scale={prefs.scale} onScale={prefs.setScale} />
          </div>
        </ControlBar>
        <SongSheet
          version={version}
          song={song}
          timeline={timeline}
          shapes={shapes}
          settings={settings}
        />
      </main>
    </div>
  )
}
