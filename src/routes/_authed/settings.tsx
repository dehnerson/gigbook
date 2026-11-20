import { createFileRoute } from '@tanstack/react-router'
import { SettingsPage } from '@/screens/settings'

export const Route = createFileRoute('/_authed/settings')({
  component: SettingsPage,
})
