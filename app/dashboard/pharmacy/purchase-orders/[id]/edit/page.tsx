import { requireAuthSafe } from "@/lib/auth-guard"
import { redirect } from "next/navigation"
import { prisma } from "@/lib/prisma"
import { NewPurchaseOrderPage } from "@/components/pharmacy/new-purchase-order-page"

export default async function EditPurchaseOrderRoute({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const authResult = await requireAuthSafe(["SUPER_ADMIN", "PHARMACIST"])
  if (!authResult.ok) redirect("/login")

  const po = await prisma.purchaseOrder.findUnique({
    where: { id },
    include: {
      supplier: true,
      items: {
        include: { medicine: true }
      }
    }
  })

  if (!po) {
    redirect("/dashboard/pharmacy/purchase-orders")
  }

  const suppliers = await prisma.supplier.findMany({
    where: { isActive: true },
    orderBy: { name: "asc" }
  })

  const medicines = await prisma.medicine.findMany({
    where: { isActive: true },
    orderBy: { name: "asc" }
  })

  return (
    <div className="p-6">
      <NewPurchaseOrderPage 
        suppliers={suppliers} 
        medicines={medicines} 
        poToEdit={po} 
      />
    </div>
  )
}
