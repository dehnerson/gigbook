import { useNavigate } from '@tanstack/react-router'
import { Button } from '@/components/ui/button'
import type { PlaceHref } from '@/lib/space'
import { useWorkspace } from '@/lib/workspace'
import { m } from '@/paraglide/messages'

export function WorkspaceNotice({
  homeBandId,
  homeName,
  href,
}: {
  homeBandId?: string | null
  homeName?: string | null
  href: PlaceHref
}) {
  const navigate = useNavigate()
  const { current, inWorkspace } = useWorkspace()
  const owner = homeBandId ?? null
  if (inWorkspace && current.bandId === owner) return null
  return (
    <p className="mb-6 flex flex-wrap items-center gap-x-3 gap-y-2 text-sm text-muted-foreground">
      <span>{m.homeNotice({ name: homeName ?? m.personal() })}</span>
      <Button variant="outline" size="sm" onPress={() => void navigate(href)}>
        {m.switchWorkspace()}
      </Button>
    </p>
  )
}
