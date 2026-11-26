import { z } from 'zod'
import { m } from '@/paraglide/messages'

export const nameSchema = z.object({
  name: z.string().max(80, { error: () => m.errorInvalid() }),
})
