import { getPharmacyAccountsOverview } from "@/app/actions/pharmacy-fin/accounts"
import { AccountsClient } from "@/components/pharmacy-finance/accounts-client"

export const metadata = { title: "Cash & Bank" }

export default async function AccountsPage() {
  const data = await getPharmacyAccountsOverview()
  return <AccountsClient data={data} />
}
