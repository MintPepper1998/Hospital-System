import { getAccountLedger } from "@/app/actions/pharmacy-fin/accounts"
import { LedgerClient } from "@/components/pharmacy-finance/ledger-client"
import { parseRangeParams } from "@/lib/pharmacy-finance/dates"

export const metadata = { title: "Account Ledger" }

export default async function AccountLedgerPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const p = await params
  const sp = await searchParams
  const range = parseRangeParams(sp, "mtd")
  const page = typeof sp.page === "string" ? parseInt(sp.page, 10) : 1

  const data = await getAccountLedger(p.id, range, page)

  return <LedgerClient data={data} searchParams={sp} />
}
