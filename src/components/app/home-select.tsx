import { convexQuery } from '@convex-dev/react-query'
import { useQuery } from '@tanstack/react-query'
import { api } from '../../../convex/_generated/api'
import { Select } from '@/components/ui/select'
import { PERSONAL } from '@/lib/space'
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
  const { data: bands } = useQuery(convexQuery(api.bands.list, {}))
  const options = [
    { id: PERSONAL, label: m.personal() },
    ...(bands ?? []).flatMap((row) =>
      writable && row.membership.role === 'viewer'
        ? []
        : [
            {
              id: row.band._id,
              label: row.band.name,
            },
          ],
    ),
  ]
  return (
    <Select
      label={m.chooseHome()}
      value={value}
      onChange={onChange}
      options={options}
    />
  )
}
