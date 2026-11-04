import { getSuppliersWithBalances } from "@/app/actions/supplier-profile"
import { SupplierListClient } from "@/components/pharmacy/suppliers/supplier-list-client"

export default async function SuppliersPage() {
  const suppliers = await getSuppliersWithBalances()

  return (
    <div className="space-y-6">
      <SupplierListClient suppliers={suppliers} />
    </div>
  )
}
