import { getPharmacyExpenses } from "@/app/actions/pharmacy-fin/expenses"
import { ExpensesClient } from "@/components/pharmacy-finance/expenses-client"
import { parseRangeParams } from "@/lib/pharmacy-finance/dates"

export const metadata = { title: "Expenses" }

export default async function ExpensesPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const sp = await searchParams
  const range = parseRangeParams(sp, "mtd")
  
  const head = typeof sp.head === "string" ? sp.head : undefined
  const accountId = typeof sp.accountId === "string" ? sp.accountId : undefined
  const page = typeof sp.page === "string" ? parseInt(sp.page, 10) : 1

  const data = await getPharmacyExpenses({ range, head, accountId, page })

  return <ExpensesClient range={range} data={data} searchParams={sp} />
}
