import { VouchersClient } from "./vouchers-client"
import { getAccountGroups } from "@/app/actions/account-groups"
import { getHospitalBankAccounts } from "@/app/actions/master-finance"

export default async function VouchersPage() {
  const [result, bankAccountsResult] = await Promise.all([
    getAccountGroups({ scope: "HOSPITAL" }),
    getHospitalBankAccounts(),
  ])
  const groups = result.data?.map((g) => ({ code: g.code, name: g.name, nature: g.nature })) || []
  return (
    <VouchersClient
      accountGroups={JSON.parse(JSON.stringify(groups))}
      bankAccounts={JSON.parse(JSON.stringify(bankAccountsResult.data || []))}
    />
  )
}
