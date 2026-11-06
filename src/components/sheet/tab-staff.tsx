import type { AlphaTabApi } from '@coderline/alphatab'
import { cn } from 'cn'
import { LoaderCircleIcon, PauseIcon, PlayIcon } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { Button } from '@/components/ui/button'
import { displayChord } from '@/lib/music/chords'
import { STANDARD_TUNING } from '@/lib/music/diagrams'
import { previewTabShift, toAlphaTex } from '@/lib/music/tab'
import type { TabMeasure } from '@/lib/music/tab'
import { m } from '@/paraglide/messages'
import {
  applyTheme,
  hiddenElements,
  themeColor,
  useThemeKey,
} from './alphatab-theme'
import type { AlphaTabModule } from './alphatab-theme'
import type { SheetSettings } from './types'

type Flags = { keys: Set<string>; strings: number }

function markUnplayable(
  alphaTab: AlphaTabModule,
  score: InstanceType<AlphaTabModule['model']['Score']>,
  flags: Flags,
) {
  if (flags.keys.size === 0) return
  const color = themeColor(alphaTab, '--destructive')
  score.tracks[0]?.staves[0]?.bars.forEach((bar, barIndex) => {
    bar.voices[0]?.beats.forEach((beat, beatIndex) => {
      for (const note of beat.notes) {
        const string = flags.strings - note.string + 1
        if (!flags.keys.has(`${barIndex}:${beatIndex}:${string}`)) continue
        const style = new alphaTab.model.NoteStyle()
        style.colors.set(
          alphaTab.model.NoteSubElement.GuitarTabFretNumber,
          color,
        )
        note.style = style
      }
    })
  })
}

export function TabStaff({
  measures,
  tuning,
  timeSignature,
  bpm,
  settings,
}: {
  measures: Array<TabMeasure>
  tuning: Array<string>
  timeSignature: string
  bpm?: number
  settings: SheetSettings
}) {
  const strings = tuning.length > 0 ? tuning : [...STANDARD_TUNING]
  const tuningKey = strings.join(' ')
  const { capo, transpose, notation } = settings
  const { tab, notes, chords } = settings.layers
  const shifted = useMemo(
    () => previewTabShift(measures, transpose).measures,
    [measures, transpose],
  )
  const tex = useMemo(
    () =>
      toAlphaTex(shifted, {
        tuning: tuningKey.split(' '),
        timeSignature,
        tempo: bpm,
        score: notes,
        tabs: tab,
        chords,
        chordLabel: (symbol) => displayChord(symbol, capo, transpose, notation),
      }),
    [
      shifted,
      tuningKey,
      timeSignature,
      bpm,
      notes,
      tab,
      chords,
      capo,
      transpose,
      notation,
    ],
  )
  const flags = useMemo<Flags>(
    () => ({
      strings: tuningKey.split(' ').length,
      keys: new Set(
        shifted.flatMap((measure, bar) =>
          measure.beats.flatMap((beat, index) =>
            beat.notes.flatMap((note) =>
              note.unplayable ? [`${bar}:${index}:${note.s}`] : [],
            ),
          ),
        ),
      ),
    }),
    [shifted, tuningKey],
  )
  return <AlphaTabView tex={tex} flags={flags} scale={settings.scale} />
}

type PlayerState = 'off' | 'loading' | 'ready'

function AlphaTabView({
  tex,
  flags,
  scale,
}: {
  tex: string
  flags: Flags
  scale: number
}) {
  const host = useRef<HTMLDivElement>(null)
  const api = useRef<AlphaTabApi | null>(null)
  const library = useRef<AlphaTabModule | null>(null)
  const latestFlags = useRef(flags)
  latestFlags.current = flags
  const startWhenReady = useRef(false)
  const [ready, setReady] = useState(false)
  const [rendered, setRendered] = useState(false)
  const [failed, setFailed] = useState(false)
  const [player, setPlayer] = useState<PlayerState>('off')
  const [playing, setPlaying] = useState(false)
  const theme = useThemeKey()
  const applied = useRef({ scale, theme })

  useEffect(() => {
    let cancelled = false
    let instance: AlphaTabApi | null = null
    void import('@coderline/alphatab').then((alphaTab) => {
      const element = host.current
      if (cancelled || !element) return
      const base = import.meta.env.BASE_URL
      const created = new alphaTab.AlphaTabApi(element, {
        core: { fontDirectory: `${base}font/` },
        display: {
          scale,
          layoutMode: alphaTab.LayoutMode.Page,
          padding: [0, 0],
        },
        notation: { elements: hiddenElements(alphaTab) },
        player: {
          playerMode: alphaTab.PlayerMode.Disabled,
          enableCursor: true,
          scrollMode: alphaTab.ScrollMode.Off,
          soundFont: `${base}soundfont/sonivox.sf2`,
        },
      })
      instance = created
      applyTheme(alphaTab, created)
      created.scoreLoaded.on((score) =>
        markUnplayable(alphaTab, score, latestFlags.current),
      )
      created.renderFinished.on(() => setRendered(true))
      created.error.on(() => setFailed(true))
      created.playerReady.on(() => {
        setPlayer('ready')
        if (!startWhenReady.current) return
        startWhenReady.current = false
        created.playPause()
      })
      created.playerStateChanged.on((event) =>
        setPlaying(event.state === alphaTab.synth.PlayerState.Playing),
      )
      library.current = alphaTab
      api.current = created
      setReady(true)
    })
    return () => {
      cancelled = true
      instance?.destroy()
      api.current = null
      setReady(false)
    }
  }, [])

  useEffect(() => {
    if (!ready) return
    setFailed(false)
    api.current?.tex(tex)
  }, [tex, flags, ready])

  useEffect(() => {
    const instance = api.current
    const alphaTab = library.current
    if (!ready || !instance || !alphaTab) return
    if (applied.current.scale === scale && applied.current.theme === theme)
      return
    applied.current = { scale, theme }
    instance.settings.display.scale = scale
    applyTheme(alphaTab, instance)
    instance.updateSettings()
    instance.render()
  }, [scale, theme, ready])

  const toggle = () => {
    const instance = api.current
    const alphaTab = library.current
    if (!instance || !alphaTab || player === 'loading') return
    if (player === 'ready') {
      instance.playPause()
      return
    }
    setPlayer('loading')
    startWhenReady.current = true
    instance.settings.player.playerMode = alphaTab.PlayerMode.EnabledSynthesizer
    instance.updateSettings()
  }

  return (
    <div className="relative">
      {failed ? (
        <p className="text-[0.85em] text-destructive">{m.tabLoadFailed()}</p>
      ) : null}
      {rendered && !failed ? (
        <Button
          variant="ghost"
          size="xs"
          className="absolute -top-7 right-0 text-muted-foreground"
          isDisabled={player === 'loading'}
          onPress={toggle}
        >
          {player === 'loading' ? (
            <LoaderCircleIcon className="animate-spin" />
          ) : playing ? (
            <PauseIcon />
          ) : (
            <PlayIcon />
          )}
          {player === 'loading'
            ? m.loadingSound()
            : playing
              ? m.pauseTab()
              : m.playTab()}
        </Button>
      ) : null}
      <div
        ref={host}
        className={cn(
          'w-full overflow-x-auto',
          !rendered && 'min-h-28 animate-pulse rounded-xl bg-muted/30',
        )}
      />
    </div>
  )
}
