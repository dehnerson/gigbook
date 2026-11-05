import { ConvexError } from 'convex/values'

export function fail(code: string): never {
  throw new ConvexError(code)
}
