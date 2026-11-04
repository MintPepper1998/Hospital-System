"use client"

import { DateRangeFilter } from "./date-range-filter"
import { PageHeader } from "./page-header"
import { KpiCard } from "./kpi-card"
import { IndianRupee, Banknote, RefreshCcw, TrendingUp, HandCoins, Activity, AlertTriangle } from "lucide-react"
import { pct, inr } from "@/lib/pharmacy-finance/money"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"

export function OverviewClient({ range, data }: { range: any; data: any }) {
  const { metrics, prevMetrics, positions, charts } = data

  const getDelta = (curr: number, prev: number) => {
    if (prev === 0) return { value: 0, label: "vs prev" }
    const pctDiff = ((curr - prev) / prev) * 100
    return {
      value: Math.round(Math.abs(pctDiff)),
      label: "vs prev",
      isPositive: pctDiff >= 0
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader 
        title="Pharmacy Finance" 
        subtitle="Financial performance and current positions."
        action={<DateRangeFilter />} 
      />

      {metrics.linesMissingCost > 0 && (
        <div className="bg-amber-50 text-amber-800 p-3 rounded-md text-sm flex items-center mb-4 border border-amber-200">
          <AlertTriangle className="h-4 w-4 mr-2" />
          {metrics.linesMissingCost} sale lines in this period are missing cost data. Profit margins may be overstated.
        </div>
      )}

      {/* KPI Row 1: Period-based */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <KpiCard 
          label="Gross Sales" 
          value={inr(metrics.grossSales)} 
          icon={Banknote} 
          trend={getDelta(metrics.grossSales, prevMetrics.grossSales)} 
        />
        <KpiCard 
          label="Net Sales" 
          value={inr(metrics.netSales)} 
          icon={TrendingUp} 
          trend={getDelta(metrics.netSales, prevMetrics.netSales)} 
        />
        <KpiCard 
          label="Gross Profit" 
          value={
            <div className="flex items-baseline gap-2">
              {inr(metrics.grossProfit)}
              <span className="text-sm font-medium text-slate-500">
                ({pct(metrics.grossProfit, metrics.netSales)}%)
              </span>
            </div>
          }
          icon={Activity} 
          trend={getDelta(metrics.grossProfit, prevMetrics.grossProfit)} 
        />
        <KpiCard 
          label="Returns" 
          value={inr(metrics.returnsAmt)} 
          icon={RefreshCcw} 
          trend={{ ...getDelta(metrics.returnsAmt, prevMetrics.returnsAmt), isPositive: undefined }} 
        />
        <KpiCard 
          label="Cash Collected" 
          value={inr(metrics.cashIn)} 
          icon={HandCoins} 
          trend={getDelta(metrics.cashIn, prevMetrics.cashIn)} 
        />
        <KpiCard 
          label="Cash Paid Out" 
          value={inr(metrics.cashOut)} 
          icon={IndianRupee} 
          trend={{ ...getDelta(metrics.cashOut, prevMetrics.cashOut), isPositive: undefined }} 
        />
      </div>

      <h2 className="text-lg font-semibold mt-8 mb-4">Current Positions (As of Now)</h2>
      
      {/* KPI Row 2: Position-based */}
      <div className="grid gap-4 md:grid-cols-3">
        <KpiCard 
          label="Cash & Bank Balance" 
          value={inr(positions.cashAndBank)} 
          icon={IndianRupee} 
        />
        <KpiCard 
          label="Receivable (Customers)" 
          value={inr(positions.receivableCust)} 
          icon={IndianRupee} 
        />
        <KpiCard 
          label="Receivable (IPD pending)" 
          value={inr(positions.receivableIpd)} 
          icon={IndianRupee} 
        />
        <KpiCard 
          label="Payable (Suppliers)" 
          value={inr(positions.payableSuppliers)} 
          icon={IndianRupee} 
        />
        <KpiCard 
          label="Stock Value (cost)" 
          value={inr(positions.stockValue)} 
          icon={IndianRupee} 
        />
        <KpiCard 
          label="Expiring ≤ 90 days" 
          value={
            <div className={positions.expiringStockValue > 0 ? "text-rose-600" : ""}>
              {inr(positions.expiringStockValue)}
            </div>
          } 
          icon={AlertTriangle} 
        />
      </div>

      {/* Charts (placeholders/basic tables for now to avoid huge deps if not installed) */}
      <div className="grid gap-4 md:grid-cols-2 mt-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-slate-500">Top Medicines by Profit</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {charts.topMedicines.slice(0, 5).map((m: any, i: number) => (
                <div key={i} className="flex justify-between text-sm items-center border-b pb-2 last:border-0">
                  <span className="truncate max-w-[200px]">{m.name}</span>
                  <div className="text-right">
                    <div className="font-medium">{inr(m.profit)}</div>
                    <div className="text-xs text-slate-500">Rev: {inr(m.revenue)}</div>
                  </div>
                </div>
              ))}
              {charts.topMedicines.length === 0 && <div className="text-sm text-slate-500 py-4 text-center">No data</div>}
            </div>
          </CardContent>
        </Card>
      </div>

    </div>
  )
}
