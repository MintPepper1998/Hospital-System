import { getSuppliers } from "@/app/actions/purchase"
import { getFinancialAccounts } from "@/app/actions/finance"
import { PurchaseEntryForm } from "@/components/finance/purchase-entry-form"

export default async function NewPurchasePage() {
  const [suppliers, accounts] = await Promise.all([
    getSuppliers(),
    getFinancialAccounts(),
  ])

  return (
    <div className="space-y-6">
      <PurchaseEntryForm
        suppliers={suppliers.map((s) => ({ id: s.id, name: s.name }))}
        accounts={accounts}
      />
    </div>
  )
}
