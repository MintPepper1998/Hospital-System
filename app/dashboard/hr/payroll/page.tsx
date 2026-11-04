import { getEmployees } from "@/app/actions/payroll"
import { getFinancialAccounts } from "@/app/actions/finance"
import { PayrollClient } from "@/components/hr/payroll-client"

export default async function PayrollPage() {
  const [employees, accounts] = await Promise.all([
    getEmployees(),
    getFinancialAccounts(),
  ])

  return (
    <div className="space-y-6">
      <PayrollClient employees={employees} accounts={accounts} />
    </div>
  )
}

