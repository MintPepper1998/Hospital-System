import { notFound } from "next/navigation"
import { getChallanById } from "@/app/actions/challan"
import { ChallanDetailClient } from "@/components/pharmacy/challan-detail-client"
import { prisma } from "@/lib/prisma"

export const dynamic = "force-dynamic"

interface PageProps {
  params: Promise<{ id: string }>
}

export default async function ChallanDetailPage({ params }: PageProps) {
  const { id } = await params
  const result = await getChallanById(id)

  if (!result.success || !result.data) {
    notFound()
  }

  // Get financial accounts for payment (needed during conversion)
  const accounts = await prisma.financialAccount.findMany({
    where: { isActive: true },
    select: { id: true, name: true, type: true },
    orderBy: { name: "asc" },
  })

  return (
    <div className="p-6 lg:p-8 max-w-[1200px] mx-auto">
      <ChallanDetailClient
        challan={result.data}
        accounts={accounts}
      />
    </div>
  )
}
