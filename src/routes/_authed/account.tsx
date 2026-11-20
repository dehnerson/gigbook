import { convexQuery } from '@convex-dev/react-query'
import { useQuery } from '@tanstack/react-query'
import { createFileRoute } from '@tanstack/react-router'
import { api } from '../../../convex/_generated/api'
import { DetailSkeleton } from '@/components/app/route-states'
import { PageHeader } from '@/components/app/page-header'
import { AccountScreen } from '@/screens/account'
import { m } from '@/paraglide/messages'

export const Route = createFileRoute('/_authed/account')({
  component: AccountPage,
})

function AccountPage() {
  const { data: account, isPending } = useQuery(convexQuery(api.users.me, {}))
  if (!account)
    return (
      <div className="mx-auto max-w-3xl">
        <PageHeader title={m.manageAccount()} />
        {isPending ? <DetailSkeleton /> : null}
      </div>
    )
  return <AccountScreen account={account} />
}
