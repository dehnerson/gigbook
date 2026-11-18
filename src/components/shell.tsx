import { UserButton } from '@clerk/tanstack-react-start'
import { Link, useRouterState } from '@tanstack/react-router'
import { cn } from 'cn'
import {
  GuitarIcon,
  LibraryBigIcon,
  ListMusicIcon,
  MusicIcon,
  RadioTowerIcon,
  SettingsIcon,
} from 'lucide-react'
import { WorkspaceSwitcher } from '@/components/app/workspace-switcher'
import { built } from '@/lib/built'
import { path, workspaceTrail } from '@/lib/space'
import { useTrail } from '@/lib/use-trail'
import { useWorkspace } from '@/lib/workspace'
import { m } from '@/paraglide/messages'

const hasClerk = Boolean(import.meta.env.VITE_CLERK_PUBLISHABLE_KEY)

export function isBarePath(pathname: string) {
  return (
    pathname.endsWith('/play') ||
    /\/jam\/[^/]+$/.test(pathname) ||
    pathname.startsWith('/share/')
  )
}

function Logo({ compact = false }: { compact?: boolean }) {
  return (
    <Link to="/" className="flex items-center gap-2.5 outline-none">
      <span className="grid size-9 place-items-center rounded-xl bg-primary text-primary-foreground shadow-[0_0_24px_-4px_var(--primary)]">
        <GuitarIcon className="size-5" />
      </span>
      {compact ? null : (
        <span className="text-lg font-semibold tracking-tight">
          {m.appName()}
        </span>
      )}
    </Link>
  )
}

function navActive(pathname: string, href: string, exact: boolean) {
  if (exact) return pathname === href
  return pathname === href || pathname.startsWith(`${href}/`)
}

const navItem =
  'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground transition-colors outline-none hover:bg-sidebar-accent hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring data-[status=active]:bg-sidebar-accent data-[status=active]:text-foreground [&[data-status=active]>svg]:text-primary'

export function Shell({ children }: { children: React.ReactNode }) {
  const pathname = useRouterState({
    select: (state) => state.location.pathname,
  })
  const trail = useTrail()
  const session = useWorkspace()
  const nav =
    trail.kind === 'workspace'
      ? trail
      : workspaceTrail(session.sessionWorkspace)
  const links = [
    {
      href: path(nav, { page: 'songs' }),
      label: m.songs(),
      icon: MusicIcon,
      exact: true,
    },
    {
      href: path(nav, { page: 'setlists' }),
      label: m.setlists(),
      icon: ListMusicIcon,
      exact: false,
    },
    {
      href: path(nav, { page: 'jam' }),
      label: m.jam(),
      icon: RadioTowerIcon,
      exact: false,
    },
  ]
  if (isBarePath(pathname)) return children
  return (
    <div className="min-h-screen bg-background text-foreground">
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 flex-col border-r border-sidebar-border bg-sidebar px-4 py-5 lg:flex">
        <div className="px-1">
          <Logo />
        </div>
        <nav className="mt-8 flex flex-col gap-1">
          <Link
            to="/"
            activeOptions={{ exact: true }}
            className={navItem}
            data-status={pathname === '/' ? 'active' : undefined}
          >
            <LibraryBigIcon className="size-4.5" />
            {m.allSongs()}
          </Link>
          {hasClerk ? <WorkspaceSwitcher /> : null}
          {links.map((link) => (
            <Link
              key={link.href}
              {...built(link.href)}
              className={navItem}
              data-status={
                navActive(pathname, link.href, link.exact) ? 'active' : undefined
              }
            >
              <link.icon className="size-4.5" />
              {link.label}
            </Link>
          ))}
        </nav>
        <div className="mt-auto flex flex-col gap-1 border-t border-sidebar-border pt-4">
          <Link to="/settings" className={navItem}>
            <SettingsIcon className="size-4.5" />
            {m.settings()}
          </Link>
          {hasClerk ? (
            <div className="flex items-center gap-3 px-3 py-2">
              <UserButton showName />
            </div>
          ) : null}
        </div>
      </aside>

      <header className="sticky top-0 z-9000 flex items-center justify-between border-b bg-background/80 px-4 py-3 backdrop-blur-lg lg:hidden">
        <Logo />
        <div className="flex items-center gap-2">
          {hasClerk ? <WorkspaceSwitcher compact /> : null}
          <Link
            to="/settings"
            aria-label={m.settings()}
            className="grid size-9 place-items-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground data-[status=active]:text-primary"
          >
            <SettingsIcon className="size-5" />
          </Link>
          {hasClerk ? <UserButton /> : null}
        </div>
      </header>

      <div className="stage-glow min-h-screen lg:pl-64">
        <main className="mx-auto w-full min-w-0 max-w-6xl px-4 pt-6 pb-28 sm:px-8 lg:pt-10 lg:pb-16">
          {children}
        </main>
      </div>

      <nav className="fixed inset-x-0 bottom-0 z-9000 flex min-w-0 justify-around border-t bg-background/90 pb-[env(safe-area-inset-bottom)] backdrop-blur-lg lg:hidden">
        <Link
          to="/"
          activeOptions={{ exact: true }}
          className={cn(
            'flex min-w-0 flex-1 flex-col items-center gap-1 px-1 py-2.5 text-center text-[0.7rem] font-medium text-muted-foreground transition-colors data-[status=active]:text-primary',
          )}
          data-status={pathname === '/' ? 'active' : undefined}
        >
          <LibraryBigIcon className="size-5 shrink-0" />
          <span className="max-w-full truncate">{m.allSongs()}</span>
        </Link>
        {links.map((link) => (
          <Link
            key={link.href}
            {...built(link.href)}
            className={cn(
              'flex min-w-0 flex-1 flex-col items-center gap-1 px-1 py-2.5 text-center text-[0.7rem] font-medium text-muted-foreground transition-colors data-[status=active]:text-primary',
            )}
            data-status={
              navActive(pathname, link.href, link.exact) ? 'active' : undefined
            }
          >
            <link.icon className="size-5 shrink-0" />
            <span className="max-w-full truncate">{link.label}</span>
          </Link>
        ))}
      </nav>
    </div>
  )
}
