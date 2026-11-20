import { components } from '../_generated/api'
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
  const [rows, user] = await Promise.all([
    ctx.runQuery(components.authEmail.verifiedEmails.getEmails, { userId: id }),
    ctx.db.get(id),
  ])
  const addresses = rows.map((row) => row.email.toLowerCase())
  if (user?.oauthEmail) addresses.push(user.oauthEmail.toLowerCase())
  return addresses
}

async function labelFor(ctx: Ctx, user: Doc<'users'>) {
  if (user.name) return user.name
  const email = await ctx.runQuery(
    components.authEmail.verifiedEmails.getPrimaryEmail,
    { userId: user._id },
  )
  return email ?? user.oauthEmail ?? ''
}

export async function displayName(ctx: Ctx, userId: string) {
  const id = ctx.db.normalizeId('users', userId)
  if (!id) return ''
  const user = await ctx.db.get(id)
  return user ? labelFor(ctx, user) : ''
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
    await Promise.all(
      users.flatMap((user) =>
        user
          ? [
              labelFor(ctx, user).then(
                (name) => [user._id as string, name] as const,
              ),
            ]
          : [],
      ),
    ),
  )
  return rows.map((row) => ({
    ...row,
    name: names.get(row.userId) ?? row.name ?? '',
  }))
}
