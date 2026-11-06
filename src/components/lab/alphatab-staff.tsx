import type { AlphaTabApi } from '@coderline/alphatab'
import { PauseIcon, PlayIcon } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import {
  applyTheme,
  hiddenElements,
  useThemeKey,
} from '@/components/sheet/alphatab-theme'
import type { AlphaTabModule } from '@/components/sheet/alphatab-theme'
import { Button } from '@/components/ui/button'

export type AlphaTabTiming = { load: number; render: number }

export function AlphaTabStaff({
  tex,
  scale,
  onTiming,
}: {
  tex: string
  scale: number
  onTiming?: (timing: AlphaTabTiming) => void
}) {
  const host = useRef<HTMLDivElement>(null)
  const api = useRef<AlphaTabApi | null>(null)
  const module = useRef<AlphaTabModule | null>(null)
  const timing = useRef(onTiming)
  timing.current = onTiming
  const [ready, setReady] = useState(false)
  const [playerReady, setPlayerReady] = useState(false)
  const [playing, setPlaying] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const theme = useThemeKey()
  const applied = useRef({ scale, theme })

  useEffect(() => {
    let cancelled = false
    let instance: AlphaTabApi | null = null
    const started = performance.now()
    void import('@coderline/alphatab').then((alphaTab) => {
      const element = host.current
      if (cancelled || !element) return
      const loaded = performance.now()
      const base = import.meta.env.BASE_URL
      instance = new alphaTab.AlphaTabApi(element, {
        core: { fontDirectory: `${base}font/` },
        display: {
          scale,
          layoutMode: alphaTab.LayoutMode.Page,
          padding: [0, 6],
        },
        notation: { elements: hiddenElements(alphaTab) },
        player: {
          enablePlayer: true,
          enableCursor: true,
          soundFont: `${base}soundfont/sonivox.sf2`,
          scrollMode: alphaTab.ScrollMode.Off,
        },
      })
      applyTheme(alphaTab, instance)
      let first = true
      instance.renderFinished.on(() => {
        if (!first) return
        first = false
        timing.current?.({
          load: loaded - started,
          render: performance.now() - loaded,
        })
      })
      instance.playerReady.on(() => setPlayerReady(true))
      instance.playerStateChanged.on((event) =>
        setPlaying(event.state === alphaTab.synth.PlayerState.Playing),
      )
      instance.error.on((event) => setError(event.message))
      module.current = alphaTab
      api.current = instance
      setReady(true)
    })
    return () => {
      cancelled = true
      instance?.destroy()
      api.current = null
      setReady(false)
      setPlayerReady(false)
      setPlaying(false)
    }
  }, [])

  useEffect(() => {
    if (!ready) return
    setError(null)
    api.current?.tex(tex)
  }, [tex, ready])

  useEffect(() => {
    const instance = api.current
    const alphaTab = module.current
    if (!ready || !instance || !alphaTab) return
    if (applied.current.scale === scale && applied.current.theme === theme)
      return
    applied.current = { scale, theme }
    instance.settings.display.scale = scale
    applyTheme(alphaTab, instance)
    instance.updateSettings()
    instance.render()
  }, [scale, theme, ready])

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          isDisabled={!playerReady}
          onPress={() => api.current?.playPause()}
        >
          {playing ? <PauseIcon /> : <PlayIcon />}
          {playing ? 'Pause' : playerReady ? 'Play' : 'Loading player…'}
        </Button>
        {error ? (
          <span className="text-xs text-destructive">{error}</span>
        ) : null}
      </div>
      <div ref={host} className="min-h-24 w-full overflow-x-auto" />
    </div>
  )
}
