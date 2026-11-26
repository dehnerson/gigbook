import type { Doc } from '../_generated/dataModel'
import type { MutationCtx, QueryCtx } from '../_generated/server'

type Ctx = QueryCtx | MutationCtx

const MAX_NAME = 80

export function nameWithinLimit(value: string) {
  let length = 0
  for (const _segment of new Intl.Segmenter().segment(value)) length += 1
  return length <= MAX_NAME
}

export async function sessionAddresses(ctx: Ctx, userId: string) {
  const id = ctx.db.normalizeId('users', userId)
  if (!id) return []
  const user = await ctx.db.get(id)
  const email = user?.email?.toLowerCase()
  return email ? [email] : []
}

function labelFor(user: Doc<'users'>) {
  if (user.name) return user.name
  return user.email ?? ''
}

export async function displayName(ctx: Ctx, userId: string) {
  const id = ctx.db.normalizeId('users', userId)
  if (!id) return ''
  const user = await ctx.db.get(id)
  return user ? labelFor(user) : ''
}

export async function withNames<T extends { userId: string; name?: string }>(
  ctx: QueryCtx,
  rows: Array<T>,
): Promise<Array<T & { name: string }>> {
  const ids = [...new Set(rows.map((row) => row.userId))]
  const users = await Promise.all(
    ids.map(async (id) => {
      const userId = ctx.db.normalizeId('users', id)
      return userId ? ctx.db.get(userId) : null
    }),
  )
  const names = new Map(
    users.flatMap((user) =>
      user ? [[user._id as string, labelFor(user)] as const] : [],
    ),
  )
  return rows.map((row) => ({
    ...row,
    name: names.get(row.userId) ?? row.name ?? '',
  }))
}
