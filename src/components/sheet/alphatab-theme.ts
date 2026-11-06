import type * as AlphaTab from '@coderline/alphatab'
import type { AlphaTabApi } from '@coderline/alphatab'
import { useEffect, useState } from 'react'

export type AlphaTabModule = typeof AlphaTab

export function cssColor(variable: string) {
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

export function themeColor(alphaTab: AlphaTabModule, variable: string) {
  return alphaTab.model.Color.fromJson(cssColor(variable))
}

export function applyTheme(alphaTab: AlphaTabModule, api: AlphaTabApi) {
  const resources = api.settings.display.resources
  const color = (variable: string) =>
    themeColor(alphaTab, variable) ?? resources.mainGlyphColor
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

export function hiddenElements(alphaTab: AlphaTabModule) {
  return new Map([
    [alphaTab.NotationElement.ScoreTitle, false],
    [alphaTab.NotationElement.ScoreSubTitle, false],
    [alphaTab.NotationElement.ScoreArtist, false],
    [alphaTab.NotationElement.ScoreWordsAndMusic, false],
    [alphaTab.NotationElement.TrackNames, false],
    [alphaTab.NotationElement.GuitarTuning, false],
    [alphaTab.NotationElement.ChordDiagrams, false],
    [alphaTab.NotationElement.EffectTempo, false],
    [alphaTab.NotationElement.EffectDynamics, false],
  ])
}

export function useThemeKey() {
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
