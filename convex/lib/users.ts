import type { QueryCtx } from '../_generated/server'

export async function withNames<T extends { userId: string; name?: string }>(
  ctx: QueryCtx,
  rows: Array<T>,
): Promise<Array<T & { name: string }>> {
  const ids = [...new Set(rows.map((row) => row.userId))]
  const users = await Promise.all(
    ids.map((clerkUserId) =>
      ctx.db
        .query('users')
        .withIndex('by_clerk', (q) => q.eq('clerkUserId', clerkUserId))
        .unique(),
    ),
  )
  const names = new Map(
    users.flatMap((user) => (user ? [[user.clerkUserId, user.name]] : [])),
  )
  return rows.map((row) => ({
    ...row,
    name: names.get(row.userId) ?? row.name ?? '',
  }))
}
