import { httpRouter } from 'convex/server'
import { Webhook } from 'svix'
import { internal } from './_generated/api'
import { httpAction } from './_generated/server'

type ClerkUser = {
  id: string
  first_name?: string | null
  last_name?: string | null
  username?: string | null
  image_url?: string | null
  primary_email_address_id?: string | null
  email_addresses?: Array<{ id: string; email_address: string }>
}

type ClerkEvent =
  | { type: 'user.created' | 'user.updated'; data: ClerkUser }
  | { type: 'user.deleted'; data: { id?: string } }
  | { type: string; data: unknown }

function profileOf(user: ClerkUser) {
  const email =
    user.email_addresses?.find(
      (address) => address.id === user.primary_email_address_id,
    )?.email_address ?? user.email_addresses?.at(0)?.email_address
  const fullName = [user.first_name, user.last_name]
    .filter(Boolean)
    .join(' ')
    .trim()
  return {
    clerkUserId: user.id,
    name: fullName || user.username || email || 'Player',
    email: email ?? undefined,
    imageUrl: user.image_url ?? undefined,
  }
}

const http = httpRouter()

http.route({
  path: '/clerk-users-webhook',
  method: 'POST',
  handler: httpAction(async (ctx, request) => {
    const secret = process.env.CLERK_WEBHOOK_SECRET
    if (!secret) return new Response('Webhook secret missing', { status: 500 })
    const payload = await request.text()
    try {
      new Webhook(secret).verify(payload, {
        'svix-id': request.headers.get('svix-id') ?? '',
        'svix-timestamp': request.headers.get('svix-timestamp') ?? '',
        'svix-signature': request.headers.get('svix-signature') ?? '',
      })
    } catch {
      return new Response('Invalid signature', { status: 400 })
    }
    const event = JSON.parse(payload) as ClerkEvent

    if (event.type === 'user.created' || event.type === 'user.updated') {
      await ctx.runMutation(
        internal.users.upsertFromClerk,
        profileOf(event.data as ClerkUser),
      )
    } else if (event.type === 'user.deleted') {
      const id = (event.data as { id?: string }).id
      if (id)
        await ctx.runMutation(internal.users.deleteFromClerk, {
          clerkUserId: id,
        })
    }
    return new Response(null, { status: 200 })
  }),
})

export default http
