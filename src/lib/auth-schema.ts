import { z } from 'zod'
import { m } from '@/paraglide/messages'

export const MIN_PASSWORD = 10

const email = z.email({ error: () => m.authInvalidEmail() })

const newPassword = z.string().min(MIN_PASSWORD, {
  error: () => m.authPasswordShort({ length: MIN_PASSWORD }),
})

const currentPassword = z
  .string()
  .min(1, { error: () => m.authInvalidCredentials() })

export const signInSchema = z.object({
  email,
  password: currentPassword,
})

const signUpName = z
  .string()
  .trim()
  .min(1, { error: () => m.nameRequired() })
  .max(80, { error: () => m.errorInvalid() })

export const signUpSchema = z.object({
  name: signUpName,
  email,
  password: newPassword,
})

export const emailOnlySchema = z.object({ email })

export const newPasswordSchema = z.object({ password: newPassword })

export const nameSchema = z.object({
  name: z.string().max(80, { error: () => m.errorInvalid() }),
})

export const changePasswordSchema = z.object({
  currentPassword,
  newPassword,
})

export const changeEmailSchema = z.object({
  currentPassword,
  newEmail: email,
})

export const addPasswordSchema = z.object({
  email,
  password: newPassword,
})
