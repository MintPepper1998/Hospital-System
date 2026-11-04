import { getMedicines, getSuppliers } from "@/lib/actions"
import { AddStockEntryForm } from "@/components/pharmacy/add-stock-entry-form"

export default async function AddStockPage() {
  const [medicinesResult, suppliersResult] = await Promise.all([
    getMedicines(),
    getSuppliers(),
  ])

  const medicines = medicinesResult.success ? medicinesResult.data : []
  const suppliers = suppliersResult.success ? suppliersResult.data : []

  return (
    <div className="p-6">
      <AddStockEntryForm
        medicines={medicines || []}
        suppliers={suppliers || []}
      />
    </div>
  )
}
