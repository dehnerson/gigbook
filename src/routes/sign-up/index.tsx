import { createFileRoute } from '@tanstack/react-router'
import { SignUpScreen } from '@/screens/auth/sign-up'
import { authSearch } from '@/lib/return-path'

export const Route = createFileRoute('/sign-up/')({
  validateSearch: authSearch,
  component: SignUpScreen,
})
