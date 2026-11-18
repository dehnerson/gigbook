import { convexQuery } from '@convex-dev/react-query'
import { api } from '../../../convex/_generated/api'
import { Select } from '@/components/ui/select'
import { useLiveQuery } from '@/lib/live'
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
  const bands = useLiveQuery(convexQuery(api.bands.list, {}))
  const options = [
    { id: PERSONAL, label: m.personal() },
    ...bands.data.flatMap((row) =>
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
