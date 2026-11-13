import { createFileRoute } from '@tanstack/react-router'
import { SignInScreen } from '@/components/sign-in-screen'
import { signInSearch } from '@/lib/return-path'

export const Route = createFileRoute('/sign-in/')({
  validateSearch: signInSearch,
  component: SignInScreen,
})
