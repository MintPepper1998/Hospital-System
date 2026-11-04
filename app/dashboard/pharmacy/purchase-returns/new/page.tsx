import { getMedicines, getSuppliers, getInventoryBatches } from "@/lib/actions"
import { PurchaseReturnForm } from "@/components/pharmacy/purchase-return-form"

export default async function NewPurchaseReturnPage() {
  const [medicinesResult, suppliersResult, batchesResult] = await Promise.all([
    getMedicines(),
    getSuppliers(),
    getInventoryBatches(),
  ])

  const medicines = medicinesResult.success ? medicinesResult.data : []
  const suppliers = suppliersResult.success ? suppliersResult.data : []
  const batches = batchesResult.success ? batchesResult.data : []

  return (
    <div className="p-6">
      <PurchaseReturnForm
        medicines={medicines || []}
        suppliers={suppliers || []}
        batches={batches || []}
      />
    </div>
  )
}
