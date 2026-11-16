import { Button } from '@/components/ui/button'
import { useWorkspace } from '@/lib/workspace'
import { m } from '@/paraglide/messages'

export function WorkspaceNotice({
  homeBandId,
  homeName,
}: {
  homeBandId?: string | null
  homeName?: string | null
}) {
  const workspace = useWorkspace()
  if (!workspace.ready) return null
  const home = homeBandId ?? null
  if (home === (workspace.bandId ?? null)) return null
  return (
    <p className="mb-6 flex flex-wrap items-center gap-x-3 gap-y-2 text-sm text-muted-foreground">
      <span>{m.homeNotice({ name: homeName ?? m.personal() })}</span>
      <Button
        variant="outline"
        size="sm"
        onPress={() => void workspace.switchTo(home)}
      >
        {m.switchWorkspace()}
      </Button>
    </p>
  )
}
