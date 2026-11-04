import { Metadata } from "next"
import { requireAuthSafe } from "@/lib/auth-guard"
import { redirect } from "next/navigation"
import { getAccountGroups } from "@/app/actions/account-groups"
import { PharmacyChartOfAccountsClient } from "./chart-of-accounts-client"

export const metadata: Metadata = {
  title: "Chart of Accounts | Pharmacy Finance",
  description: "Manage dedicated pharmacy accounts, revenue, expenses, and inventory ledgers",
}

export default async function PharmacyChartOfAccountsPage() {
  const auth = await requireAuthSafe(["SUPER_ADMIN", "ADMIN", "ACCOUNTANT", "PHARMACIST"])
  if (!auth.ok) redirect("/login")

  const result = await getAccountGroups({ scope: "PHARMACY" })
  const groups = result.success ? result.data : []

  return (
    <PharmacyChartOfAccountsClient groups={JSON.parse(JSON.stringify(groups || []))} />
  )
}

