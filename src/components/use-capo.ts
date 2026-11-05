import { useEffect, useState } from 'react'

export function usePersonalCapo(versionId: string, suggested: number) {
  const [capo, setCapo] = useState(suggested)
  useEffect(() => {
    const stored = localStorage.getItem(`capo:${versionId}`)
    if (stored !== null && stored !== '') setCapo(Number(stored))
  }, [versionId])
  return [
    capo,
    (next: number) => {
      setCapo(next)
      localStorage.setItem(`capo:${versionId}`, String(next))
    },
  ] as const
}
