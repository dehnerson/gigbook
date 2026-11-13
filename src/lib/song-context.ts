export type SongSearch = {
  band?: string
}

export function songSearch(bandId?: string | null): SongSearch {
  return bandId ? { band: bandId } : {}
}
