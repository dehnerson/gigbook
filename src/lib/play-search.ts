export type PlaySearch = { setlist?: string; index?: number }

export function playSearch(search: Record<string, unknown>): PlaySearch {
  return {
    setlist: typeof search.setlist === 'string' ? search.setlist : undefined,
    index:
      search.index !== undefined && Number.isFinite(Number(search.index))
        ? Number(search.index)
        : undefined,
  }
}
