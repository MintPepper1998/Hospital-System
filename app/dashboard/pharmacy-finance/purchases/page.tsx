import { getPurchaseRegister } from "@/app/actions/pharmacy-fin/purchases"
import { PurchasesClient } from "@/components/pharmacy-finance/purchases-client"
import { parseRangeParams } from "@/lib/pharmacy-finance/dates"
import { prisma } from "@/lib/prisma"

export const metadata = { title: "Purchase Register" }

export default async function PurchasesPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const sp = await searchParams
  const range = parseRangeParams(sp, "mtd")
  
  const supplierId = typeof sp.supplier === "string" ? sp.supplier : undefined
  const status = typeof sp.status === "string" ? sp.status : undefined
  const page = typeof sp.page === "string" ? parseInt(sp.page, 10) : 1

  const data = await getPurchaseRegister({ range, supplierId, status, page })
  
  // Need supplier list for the filter
  const suppliers = await prisma.supplier.findMany({ select: { id: true, name: true }, orderBy: { name: "asc" } })

  return <PurchasesClient range={range} data={data} suppliers={suppliers} searchParams={sp} />
}
