import { getAccountsDashboard } from "@/app/actions/accounts"
import { AccountsClient } from "@/components/finance/accounts-client"

export default async function AccountsPage() {
  const data = await getAccountsDashboard()

  return (
    <div className="space-y-6">
      <AccountsClient data={data} />
    </div>
  )
}
