import { getSupplierStatement, getSupplierPayables } from "@/app/actions/pharmacy-fin/payables"
import { StatementClient } from "@/components/pharmacy-finance/statement-client"
import { parseRangeParams } from "@/lib/pharmacy-finance/dates"

export const metadata = { title: "Supplier Statement" }

export default async function SupplierStatementPage({
  params,
  searchParams,
}: {
  params: Promise<{ supplierId: string }>
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const { supplierId } = await params
  const sp = await searchParams
  
  const hasRange = !!(sp.from && sp.to) || !!sp.preset
  const range = hasRange ? parseRangeParams(sp) : undefined
  
  const statement = await getSupplierStatement(supplierId, range)
  const payables = await getSupplierPayables({ search: "" })
  const supplierInfo = payables.rows.find(r => r.id === supplierId)

  return <StatementClient data={statement} supplier={supplierInfo} range={range} searchParams={sp} />
}
