import { requireAuthSafe } from "@/lib/auth-guard"
import { redirect } from "next/navigation"
import { prisma } from "@/lib/prisma"
import { NewPurchaseOrderPage } from "@/components/pharmacy/new-purchase-order-page"
import { getLowStockMedicines } from "@/app/actions/purchase-order"

export default async function NewPurchaseOrderRoute({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}) {
  const resolvedSearchParams = await searchParams
  const authResult = await requireAuthSafe(["SUPER_ADMIN", "PHARMACIST"])
  if (!authResult.ok) redirect("/login")

  const suppliers = await prisma.supplier.findMany({
    where: { isActive: true },
    orderBy: { name: "asc" }
  })

  const medicines = await prisma.medicine.findMany({
    where: { isActive: true },
    orderBy: { name: "asc" }
  })

  let autoItems = null
  if (resolvedSearchParams.auto === "true") {
    const res = await getLowStockMedicines()
    if (res.success && res.data) {
      autoItems = res.data.map((item: any) => ({
        medicineId: item.id,
        quantity: Math.max(item.minStockLevel * 2, 50),
        unitCost: item.costPerUnit || 0
      }))
    }
  }

  return (
    <div className="p-6">
      <NewPurchaseOrderPage 
        suppliers={suppliers} 
        medicines={medicines} 
        autoItems={autoItems} 
      />
    </div>
  )
}
