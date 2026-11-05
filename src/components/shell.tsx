import { UserButton } from '@clerk/tanstack-react-start'
import { Link, useRouterState } from '@tanstack/react-router'
import { cn } from 'cn'
import {
  GuitarIcon,
  LibraryBigIcon,
  ListMusicIcon,
  RadioTowerIcon,
  SettingsIcon,
  SparklesIcon,
  UsersIcon,
} from 'lucide-react'
import { m } from '@/paraglide/messages'

const links = [
  { to: '/', label: () => m.library(), icon: LibraryBigIcon, exact: true },
  { to: '/setlists', label: () => m.setlists(), icon: ListMusicIcon },
  { to: '/bands', label: () => m.bands(), icon: UsersIcon },
  { to: '/jam', label: () => m.jam(), icon: RadioTowerIcon },
  { to: '/import', label: () => m.importLabel(), icon: SparklesIcon },
] as const

const hasClerk = Boolean(import.meta.env.VITE_CLERK_PUBLISHABLE_KEY)

export function isBarePath(path: string) {
  return (
    path.endsWith('/play') ||
    /\/jam\/[^/]+$/.test(path) ||
    path.startsWith('/share/')
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

const navItem =
  'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground transition-colors outline-none hover:bg-sidebar-accent hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring data-[status=active]:bg-sidebar-accent data-[status=active]:text-foreground [&[data-status=active]>svg]:text-primary'

export function Shell({ children }: { children: React.ReactNode }) {
  const path = useRouterState({ select: (state) => state.location.pathname })
  if (isBarePath(path)) return children
  return (
    <div className="min-h-screen bg-background text-foreground">
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 flex-col border-r border-sidebar-border bg-sidebar px-4 py-5 lg:flex">
        <div className="px-1">
          <Logo />
        </div>
        <nav className="mt-8 flex flex-col gap-1">
          {links.map((link) => (
            <Link
              key={link.to}
              to={link.to}
              activeOptions={{ exact: 'exact' in link }}
              className={navItem}
            >
              <link.icon className="size-4.5" />
              {link.label()}
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

      <header className="sticky top-0 z-30 flex items-center justify-between border-b bg-background/80 px-4 py-3 backdrop-blur-lg lg:hidden">
        <Logo />
        <div className="flex items-center gap-2">
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
        <main className="mx-auto w-full max-w-6xl px-4 pt-6 pb-28 sm:px-8 lg:pt-10 lg:pb-16">
          {children}
        </main>
      </div>

      <nav className="fixed inset-x-0 bottom-0 z-30 grid grid-cols-5 border-t bg-background/90 pb-[env(safe-area-inset-bottom)] backdrop-blur-lg lg:hidden">
        {links.map((link) => (
          <Link
            key={link.to}
            to={link.to}
            activeOptions={{ exact: 'exact' in link }}
            className={cn(
              'flex flex-col items-center gap-1 py-2.5 text-[0.7rem] font-medium text-muted-foreground transition-colors data-[status=active]:text-primary',
            )}
          >
            <link.icon className="size-5" />
            {link.label()}
          </Link>
        ))}
      </nav>
    </div>
  )
}
