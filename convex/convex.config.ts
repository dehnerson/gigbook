import { defineApp } from 'convex/server'
import { v } from 'convex/values'
import auth from '@convex-dev/auth/convex.config.js'
import authEmail from '@convex-dev/auth/components/email/convex.config.js'
import authGoogle from '@convex-dev/auth/components/google/convex.config.js'
import authPassword from '@convex-dev/auth/components/password/convex.config.js'
import resend from '@convex-dev/resend/convex.config.js'

const app = defineApp({
  env: {
    RESEND_API_KEY: v.string(),
    SENDER_EMAIL: v.string(),
    SENDER_NAME: v.optional(v.string()),
    SITE_URL: v.optional(v.string()),
    AUTH_GOOGLE_CLIENT_ID: v.string(),
    AUTH_GOOGLE_CLIENT_SECRET: v.string(),
  },
})

app.use(auth)
app.use(authPassword)
app.use(authEmail)
app.use(resend)
app.use(authGoogle, {
  httpPrefix: '/oauth/google',
  env: {
    CLIENT_ID: app.env.AUTH_GOOGLE_CLIENT_ID,
    CLIENT_SECRET: app.env.AUTH_GOOGLE_CLIENT_SECRET,
  },
})

export default app
