import { createFileRoute } from '@tanstack/react-router'
import { SignInScreen } from '@/components/sign-in-screen'

export const Route = createFileRoute('/sign-in/$')({
  component: SignInScreen,
})
