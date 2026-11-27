import { Select } from '@/components/ui/select'
import { useWorkspace } from '@/lib/workspace'
import type { Workspace } from '@/lib/workspace'
import { m } from '@/paraglide/messages'
import {
  Dialog,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../ui/dialog'
import { Button } from '../ui/button'
import { useCallback, useState } from 'react'

export function WorkspaceSelect({
  value,
  onChange,
  writable = false,
}: {
  value: string
  onChange: (value: string) => void
  writable?: boolean
}) {
  const { all } = useWorkspace()
  const options = all.flatMap((item) =>
    item.bandId && writable && item.role === 'viewer'
      ? []
      : [{ id: item.key, label: item.label }],
  )
  return (
    <Select
      label={m.workspace()}
      value={value}
      onChange={onChange}
      options={options}
    />
  )
}

export function useWorkspaceSelectDialog({
  chooseText,
  hint,
  onWorkspaceSelected,
}: {
  chooseText: string
  hint: string
  onWorkspaceSelected: (value: Workspace) => void
}) {
  const { current, all } = useWorkspace()

  const [open, setOpen] = useState(false)
  const [choice, setChoice] = useState(current.key)

  const selectWorkspace = useCallback(() => {
    if (all.length === 1) onWorkspaceSelected(all[0])
    else setOpen(true)
  }, [onWorkspaceSelected, all])

  const dialog =
    all.length > 1 ? (
      <Dialog isOpen={open} onOpenChange={setOpen}>
        <DialogHeader>
          <DialogTitle>{m.chooseWorkspace()}</DialogTitle>
          <DialogDescription>{hint}</DialogDescription>
        </DialogHeader>
        <WorkspaceSelect value={choice} onChange={setChoice} writable />
        <DialogFooter>
          <Button variant="outline" onPress={() => setOpen(false)}>
            {m.cancel()}
          </Button>
          <Button
            onPress={() => {
              setOpen(false)
              onWorkspaceSelected(
                all.find((item) => item.key === choice) ?? current,
              )
            }}
          >
            {chooseText}
          </Button>
        </DialogFooter>
      </Dialog>
    ) : null

  return { selectWorkspace, workspaceDialog: dialog }
}
