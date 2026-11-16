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
