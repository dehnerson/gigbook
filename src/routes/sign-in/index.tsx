import { createFileRoute } from '@tanstack/react-router'
import { SignInScreen } from '@/components/sign-in-screen'
import { authSearch } from '@/lib/return-path'

export const Route = createFileRoute('/sign-in/')({
  validateSearch: authSearch,
  component: SignInScreen,
})
