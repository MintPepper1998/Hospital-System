import { getSupplierProfile, getPharmacyAccounts } from "@/app/actions/supplier-profile"
import { SupplierProfileClient } from "@/components/pharmacy/suppliers/supplier-profile-client"
import { notFound } from "next/navigation"

export default async function SupplierProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const [result, accounts] = await Promise.all([
    getSupplierProfile(id),
    getPharmacyAccounts(),
  ])

  if (!result.success || !result.data) {
    notFound()
  }

  return (
    <div className="space-y-6">
      <SupplierProfileClient supplier={result.data} accounts={accounts} />
    </div>
  )
}
