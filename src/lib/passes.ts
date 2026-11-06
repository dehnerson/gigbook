export type Pass<T> = {
  id: string
  entry: T
  pass: number
  total: number
}

const SEPARATOR = '~'

export function timelinePasses<T extends { entryId: string; repeat?: number }>(
  timeline: Array<T>,
): Array<Pass<T>> {
  return timeline.flatMap((entry) => {
    const total = Math.max(1, entry.repeat ?? 1)
    return Array.from({ length: total }, (_, index) => ({
      id:
        total === 1
          ? entry.entryId
          : `${entry.entryId}${SEPARATOR}${index + 1}`,
      entry,
      pass: index + 1,
      total,
    }))
  })
}

export function passOf(id: string) {
  const [, pass] = id.split(SEPARATOR)
  return pass ? Number(pass) : 1
}

export function entryOfPass(id: string) {
  return id.split(SEPARATOR)[0] ?? id
}
