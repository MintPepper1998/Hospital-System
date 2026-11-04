import { notFound } from "next/navigation"
import { getChallanById } from "@/app/actions/challan"
import { CreateChallanClient } from "@/components/pharmacy/create-challan-client"
import { prisma } from "@/lib/prisma"
import { getSuppliers } from "@/app/actions/purchase"

export const dynamic = "force-dynamic"

interface PageProps {
  params: Promise<{ id: string }>
}

export default async function EditChallanPage({ params }: PageProps) {
  const { id } = await params
  const result = await getChallanById(id)

  if (!result.success || !result.data) {
    notFound()
  }

  // Cannot edit converted challans
  if (result.data.status === "CONVERTED") {
    notFound()
  }

  const suppliers = await getSuppliers()

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
        existingChallan={result.data}
      />
    </div>
  )
}
