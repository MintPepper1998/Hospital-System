import { getIPDSettlements } from "@/app/actions/pharmacy-finance"
import { IpdSettlementsClient } from "@/components/pharmacy-finance/ipd-settlements-client"

export const metadata = { title: "IPD Settlements" }

export default async function IpdSettlementsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const sp = await searchParams
  const filter = (typeof sp.filter === "string" ? sp.filter : "ALL") as "ALL" | "PENDING" | "SETTLED"
  
  const settlements = await getIPDSettlements(filter)
  
  // Calculate KPIs
  const allSettlements = await getIPDSettlements("ALL")
  const pending = allSettlements.filter(s => s.settlementStatus === "PENDING")
  const pendingAmount = pending.reduce((sum, s) => sum + s.netAmount, 0)
  
  const now = new Date()
  const thisMonthSettled = allSettlements.filter(s => {
    if (s.settlementStatus !== "SETTLED" || !s.settledAt) return false
    const d = new Date(s.settledAt)
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()
  })
  
  let daysToSettleSum = 0
  thisMonthSettled.forEach(s => {
    const diffTime = Math.abs(new Date(s.settledAt!).getTime() - new Date(s.billDate).getTime())
    daysToSettleSum += Math.ceil(diffTime / (1000 * 60 * 60 * 24))
  })
  
  const kpis = {
    pendingCount: pending.length,
    pendingAmount,
    settledThisMonthAmount: thisMonthSettled.reduce((sum, s) => sum + s.netAmount, 0),
    avgDaysToSettle: thisMonthSettled.length ? (daysToSettleSum / thisMonthSettled.length).toFixed(1) : 0
  }

  return <IpdSettlementsClient data={settlements} kpis={kpis} searchParams={sp} />
}
