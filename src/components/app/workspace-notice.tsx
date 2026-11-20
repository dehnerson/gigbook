import { useNavigate } from '@tanstack/react-router'
import { Button } from '@/components/ui/button'
import type { Workspace } from '@/lib/space'
import { m } from '@/paraglide/messages'

export function WorkspaceNotice({
  workspace,
  homeBandId,
  homeName,
  href,
}: {
  /** The page's workspace. Null on a library page, which always shows the notice. */
  workspace: Workspace | null
  homeBandId?: string | null
  homeName?: string | null
  href: string
}) {
  const navigate = useNavigate()
  const owner = homeBandId ?? null
  if (workspace && workspace.bandId === owner) return null
  return (
    <p className="mb-6 flex flex-wrap items-center gap-x-3 gap-y-2 text-sm text-muted-foreground">
      <span>{m.homeNotice({ name: homeName ?? m.personal() })}</span>
      <Button
        variant="outline"
        size="sm"
        onPress={() => void navigate({ href })}
      >
        {m.switchWorkspace()}
      </Button>
    </p>
  )
}
