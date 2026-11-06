function normalizePart(text: string) {
  return text
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/['’`]/g, '')
    .replace(/[^\p{Letter}\p{Number}]+/gu, ' ')
    .trim()
    .replace(/^the\s+/, '')
}

export function songKey(title: string, artist: string) {
  const performer = normalizePart(artist)
  return `${normalizePart(title)}|${performer === 'unknown' ? '' : performer}`
}
