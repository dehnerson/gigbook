import { Select } from '@/components/ui/select'
import { useWorkspace } from '@/lib/workspace'
import { m } from '@/paraglide/messages'

export function HomeSelect({
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
      : [{ id: item.key, label: item.label ?? m.personal() }],
  )
  return (
    <Select
      label={m.chooseHome()}
      value={value}
      onChange={onChange}
      options={options}
    />
  )
}
