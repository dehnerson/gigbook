import { createFileRoute } from '@tanstack/react-router'
import { SignInScreen } from '@/screens/auth/sign-in'
import { authSearch } from '@/lib/return-path'

export const Route = createFileRoute('/sign-in/')({
  validateSearch: authSearch,
  component: SignInScreen,
})
