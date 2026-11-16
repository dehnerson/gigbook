export const PERSONAL_HOME = 'personal' as const

export type SongSearch = {
  band?: string
}

export function songSearch(home?: string | null): SongSearch {
  if (home === undefined) return {}
  return { band: home ?? PERSONAL_HOME }
}

export function songHome(band?: string): string | null | undefined {
  if (!band) return undefined
  if (band === PERSONAL_HOME) return null
  return band
}
