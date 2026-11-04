import { getSuppliers } from "@/app/actions/purchase"
import { CreateChallanClient } from "@/components/pharmacy/create-challan-client"
import { prisma } from "@/lib/prisma"

export const dynamic = "force-dynamic"

export default async function CreateChallanPage() {
  const suppliers = await getSuppliers()

  // Get medicines for search
  const medicines = await prisma.medicine.findMany({
    where: { isActive: true },
    select: { id: true, name: true, strength: true, type: true, hsnCode: true, unitPrice: true },
    orderBy: { name: "asc" },
  })

  return (
    <div className="p-6 lg:p-8 max-w-[1440px] mx-auto">
      <CreateChallanClient
        suppliers={suppliers.map((s) => ({ id: s.id, name: s.name }))}
        medicines={medicines.map((m) => ({
          id: m.id,
          name: m.name,
          strength: m.strength,
          type: m.type,
          hsnCode: m.hsnCode || "",
          unitPrice: m.unitPrice,
        }))}
      />
    </div>
  )
}
