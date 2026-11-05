import { useEffect, useState } from 'react'
import type { DisplayMode } from './types'

export const SCALES = [0.85, 1, 1.15, 1.3, 1.5, 1.75, 2] as const

export function useSheetPrefs(
  scope: 'read' | 'play' | 'jam',
  defaultScale = 1,
) {
  const modeKey = `sheet:${scope}:mode`
  const scaleKey = `sheet:${scope}:scale`
  const [mode, setModeState] = useState<DisplayMode>('both')
  const [scale, setScaleState] = useState(defaultScale)

  useEffect(() => {
    const storedMode = localStorage.getItem(modeKey)
    if (storedMode === 'lyrics' || storedMode === 'chords')
      setModeState(storedMode)
    const storedScale = Number(localStorage.getItem(scaleKey))
    if (storedScale > 0) setScaleState(storedScale)
  }, [modeKey, scaleKey])

  return {
    mode,
    scale,
    setMode: (next: DisplayMode) => {
      setModeState(next)
      localStorage.setItem(modeKey, next)
    },
    setScale: (next: number) => {
      setScaleState(next)
      localStorage.setItem(scaleKey, String(next))
    },
  }
}

export function stepScale(scale: number, direction: 1 | -1) {
  const index = SCALES.findIndex((value) => value >= scale - 0.001)
  const current = index === -1 ? SCALES.length - 1 : index
  const next = Math.min(SCALES.length - 1, Math.max(0, current + direction))
  return SCALES[next] ?? 1
}
