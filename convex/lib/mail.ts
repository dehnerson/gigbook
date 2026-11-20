import { Resend } from '@convex-dev/resend'
import { components } from '../_generated/api'
import { fail } from './errors'

const resend = new Resend(components.resend, { testMode: false })

export function siteUrl() {
  return (process.env.SITE_URL ?? 'http://localhost:3000').replace(/\/$/, '')
}

export function redirectOrigins() {
  return [...new Set(['http://localhost:3000', siteUrl()])]
}

export function mailFrom() {
  const email = process.env.SENDER_EMAIL
  if (!email) return null
  return `${process.env.SENDER_NAME ?? 'Gigbook'} <${email}>`
}

export async function sendInvite(
  ctx: Parameters<typeof resend.sendEmail>[0],
  invite: {
    to: string
    band: string
    token: string
    inviter: string
  },
) {
  const from = mailFrom()
  if (!from || !process.env.RESEND_API_KEY) fail('INVALID')
  const url = `${siteUrl()}/invite/${invite.token}`
  await resend.sendEmail(ctx, {
    from,
    to: invite.to,
    subject: `Join ${invite.band} on Gigbook`,
    text: `${invite.inviter} invited you to ${invite.band}.\n\nOpen this link to join:\n${url}`,
    idempotencyKey: invite.token,
  })
}
