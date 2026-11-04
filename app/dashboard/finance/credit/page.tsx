import { getCreditDashboard } from "@/app/actions/credit"
import { CreditClient } from "@/components/finance/credit-client"

export default async function CreditPage() {
  const data = await getCreditDashboard()

  return (
    <div className="space-y-6">
      <CreditClient data={data} />
    </div>
  )
}
