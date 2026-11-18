import { useNavigate } from '@tanstack/react-router'
import { Button } from '@/components/ui/button'
import { useHome } from '@/lib/home'
import { homeKey, path, workspaceTrail } from '@/lib/space'
import type { Dest } from '@/lib/space'
import { useTrail } from '@/lib/use-trail'
import { m } from '@/paraglide/messages'

export function WorkspaceNotice({
  homeBandId,
  homeName,
  dest,
}: {
  homeBandId?: string | null
  homeName?: string | null
  dest: Dest
}) {
  const trail = useTrail()
  const routeHome = useHome()
  const navigate = useNavigate()
  const owner = homeBandId ?? null
  const here = trail.kind === 'workspace' ? (routeHome?.bandId ?? null) : null
  if (trail.kind === 'workspace' && here === owner) return null
  return (
    <p className="mb-6 flex flex-wrap items-center gap-x-3 gap-y-2 text-sm text-muted-foreground">
      <span>{m.homeNotice({ name: homeName ?? m.personal() })}</span>
      <Button
        variant="outline"
        size="sm"
        onPress={() =>
          void navigate({
            href: path(workspaceTrail(homeKey(owner)), dest),
          })
        }
      >
        {m.switchWorkspace()}
      </Button>
    </p>
  )
}
