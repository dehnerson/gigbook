import type * as AlphaTab from '@coderline/alphatab'
import type { AlphaTabApi } from '@coderline/alphatab'
import { PauseIcon, PlayIcon } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { Button } from '@/components/ui/button'

type AlphaTabModule = typeof AlphaTab

export type AlphaTabTiming = { load: number; render: number }

function cssColor(variable: string) {
  const probe = document.createElement('span')
  probe.style.color = `var(${variable})`
  probe.style.display = 'none'
  document.body.append(probe)
  const computed = getComputedStyle(probe).color
  probe.remove()
  const canvas = document.createElement('canvas')
  canvas.width = 1
  canvas.height = 1
  const context = canvas.getContext('2d', { willReadFrequently: true })
  if (!context) return computed
  context.fillStyle = computed
  context.fillRect(0, 0, 1, 1)
  const [r = 0, g = 0, b = 0, a = 255] = context.getImageData(0, 0, 1, 1).data
  return `rgba(${r}, ${g}, ${b}, ${(a / 255).toFixed(3)})`
}

function applyTheme(alphaTab: AlphaTabModule, api: AlphaTabApi) {
  const resources = api.settings.display.resources
  const color = (variable: string) =>
    alphaTab.model.Color.fromJson(cssColor(variable)) ??
    resources.mainGlyphColor
  resources.mainGlyphColor = color('--foreground')
  resources.secondaryGlyphColor = color('--muted-foreground')
  resources.scoreInfoColor = color('--foreground')
  resources.barSeparatorColor = color('--foreground')
  resources.staffLineColor = color('--sheet-line')
  resources.barNumberColor = color('--muted-foreground')
  resources.tablatureFont =
    alphaTab.model.Font.fromJson(
      '600 12px "Geist Mono Variable", ui-monospace, monospace',
    ) ?? resources.tablatureFont
  const chordFont = alphaTab.model.Font.fromJson(
    '700 13px "Geist Variable", ui-sans-serif, sans-serif',
  )
  if (chordFont)
    resources.elementFonts.set(
      alphaTab.NotationElement.EffectChordNames,
      chordFont,
    )
}

function useThemeKey() {
  const [key, setKey] = useState('')
  useEffect(() => {
    const root = document.documentElement
    const update = () => setKey(root.className)
    update()
    const observer = new MutationObserver(update)
    observer.observe(root, { attributes: true, attributeFilter: ['class'] })
    return () => observer.disconnect()
  }, [])
  return key
}

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
        notation: {
          elements: new Map([
            [alphaTab.NotationElement.ScoreTitle, false],
            [alphaTab.NotationElement.ScoreSubTitle, false],
            [alphaTab.NotationElement.ScoreArtist, false],
            [alphaTab.NotationElement.ScoreWordsAndMusic, false],
            [alphaTab.NotationElement.TrackNames, false],
            [alphaTab.NotationElement.GuitarTuning, false],
            [alphaTab.NotationElement.ChordDiagrams, false],
            [alphaTab.NotationElement.EffectTempo, false],
            [alphaTab.NotationElement.EffectDynamics, false],
          ]),
        },
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
