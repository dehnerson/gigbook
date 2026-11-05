import { auth } from '@clerk/tanstack-react-start/server'
import { createServerFn } from '@tanstack/react-start'

export const fetchClerkAuth = createServerFn({ method: 'GET' }).handler(
  async () => {
    const { userId, getToken } = await auth()
    const token = (await getToken()) ?? null
    return { userId, token }
  },
)
