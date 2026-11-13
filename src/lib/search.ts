export type Scope = 'all' | 'personal' | 'band'

export function matchesScope(
  scope: Scope,
  flags: { personal: boolean; band: boolean },
) {
  if (scope === 'personal') return flags.personal
  if (scope === 'band') return flags.band
  return true
}

export function matchesSearch(
  query: string,
  parts: Array<string | null | undefined>,
) {
  const needle = fold(query.trim())
  if (!needle) return true
  const haystack = fold(
    parts
      .flatMap((part) => {
        const text = part?.trim()
        return text ? [text] : []
      })
      .join(' '),
  )
  return haystack.includes(needle)
}

function fold(text: string) {
  return text
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
}
