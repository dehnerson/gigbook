import {
  createServerEntry,
  createStartHandler,
  defaultStreamHandler,
} from '@tanstack/react-start/server'
import { paraglideMiddleware } from '@/paraglide/server'

const handler = createStartHandler(defaultStreamHandler)

export default createServerEntry({
  fetch(request) {
    return paraglideMiddleware(
      request,
      ({ request: localized }: { request: Request }) => handler(localized),
    )
  },
})
