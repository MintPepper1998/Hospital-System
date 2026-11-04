import { getPurchaseInvoices, getSuppliers } from "@/app/actions/purchase"
import { PurchasesListClient } from "@/components/finance/purchases-list-client"

export default async function PurchasesPage() {
  const [invoicesResult, suppliers] = await Promise.all([
    getPurchaseInvoices(),
    getSuppliers(),
  ])

  return (
    <div className="space-y-6">
      <PurchasesListClient invoices={invoicesResult.data} suppliers={suppliers} />
    </div>
  )
}
