import { Select } from '@/components/ui/select'
import { useWorkspace } from '@/lib/workspace'
import { m } from '@/paraglide/messages'

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
