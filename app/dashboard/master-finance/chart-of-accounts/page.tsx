import { getAccountGroups } from "@/app/actions/account-groups"
import { ChartOfAccountsClient } from "./chart-of-accounts-client"

export default async function ChartOfAccountsPage() {
  const result = await getAccountGroups({ scope: "HOSPITAL" })
  return <ChartOfAccountsClient groups={JSON.parse(JSON.stringify(result.data || []))} />
}
