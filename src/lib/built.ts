import type { LinkProps } from '@tanstack/react-router'

/** A fully built path. TanStack still requires `to`; `href` is what gets followed. */
export function built(href: string): { href: string; to: LinkProps['to'] } {
  return { href, to: href as LinkProps['to'] }
}
