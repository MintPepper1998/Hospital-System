"use client"

import * as React from "react"
import { PageHeader } from "./page-header"
import { Card, CardContent } from "@/components/ui/card"
import { Money } from "./money"
import { DateRangeFilter } from "./date-range-filter"
import { ArrowUpRight, ArrowDownRight, Printer } from "lucide-react"
import { Button } from "@/components/ui/button"

export function PnLClient({ current, previous, range }: { current: any; previous: any; range: any }) {
  
  const Trend = ({ cur, prev, reverseGood = false }: { cur: number, prev: number, reverseGood?: boolean }) => {
    if (prev === 0) return null
    const pct = ((cur - prev) / prev) * 100
    if (pct === 0) return <span className="text-xs text-muted-foreground ml-2">0%</span>
    const isUp = pct > 0
    const isGood = isUp !== reverseGood
    const color = isGood ? "text-emerald-600" : "text-rose-600"
    const Icon = isUp ? ArrowUpRight : ArrowDownRight
    
    return (
      <span className={`text-xs ml-2 flex items-center ${color}`}>
        <Icon className="h-3 w-3 mr-0.5" />
        {Math.abs(pct).toFixed(1)}% vs prev
      </span>
    )
  }

  const SectionHeader = ({ title }: { title: string }) => (
    <div className="bg-slate-100 px-4 py-2 font-bold text-slate-800 uppercase text-xs tracking-wider border-y">
      {title}
    </div>
  )

  const Row = ({ label, value, indent = false, isTotal = false, prevValue = null, reverseGood = false }: any) => (
    <div className={`flex justify-between items-center px-4 py-3 ${indent ? "pl-8" : ""} ${isTotal ? "font-bold text-base" : "text-sm"} border-b last:border-b-0 hover:bg-slate-50`}>
      <span className={isTotal ? "" : "text-slate-600"}>{label}</span>
      <div className="flex items-center text-right">
        <span><Money value={value} /></span>
        {prevValue !== null && <Trend cur={value} prev={prevValue} reverseGood={reverseGood} />}
      </div>
    </div>
  )

  return (
    <div className="space-y-6">
      <PageHeader 
        title="Profit & Loss Statement" 
        subtitle="Financial performance for the selected period"
        action={
          <div className="flex items-center gap-3">
            <DateRangeFilter />
            <Button variant="outline" onClick={() => window.print()}>
              <Printer className="h-4 w-4 mr-2" /> Print
            </Button>
          </div>
        }
      />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8 print:hidden">
        <Card className="bg-slate-900 text-slate-50 border-0">
          <CardContent className="pt-6">
            <div className="text-sm text-slate-400">Net Revenue</div>
            <div className="text-3xl font-bold mt-1">₹{current.revenue.netRevenue.toLocaleString("en-IN", { maximumFractionDigits: 0 })}</div>
            <div className="mt-2"><Trend cur={current.revenue.netRevenue} prev={previous.revenue.netRevenue} /></div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-sm text-muted-foreground">Gross Profit</div>
            <div className="text-3xl font-bold mt-1 text-emerald-600">₹{current.grossProfit.toLocaleString("en-IN", { maximumFractionDigits: 0 })}</div>
            <div className="mt-2"><Trend cur={current.grossProfit} prev={previous.grossProfit} /></div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-sm text-muted-foreground">Net Profit</div>
            <div className="text-3xl font-bold mt-1 text-indigo-600">₹{current.netProfit.toLocaleString("en-IN", { maximumFractionDigits: 0 })}</div>
            <div className="mt-2"><Trend cur={current.netProfit} prev={previous.netProfit} /></div>
          </CardContent>
        </Card>
      </div>

      <Card className="max-w-4xl mx-auto shadow-sm print:shadow-none print:border-none print:p-0">
        <div className="hidden print:block text-center mb-8">
          <h1 className="text-2xl font-bold">Profit & Loss Statement</h1>
          <p className="text-muted-foreground">{new Date(range.from).toLocaleDateString("en-IN")} to {new Date(range.to.getTime() - 1).toLocaleDateString("en-IN")}</p>
        </div>

        <SectionHeader title="Revenue" />
        <Row label="Gross Sales (incl. GST)" value={current.revenue.grossSales} prevValue={previous.revenue.grossSales} />
        <Row label="Less: Output GST" value={-current.revenue.outputGst} reverseGood />
        <Row label="Sales (ex-GST)" value={current.revenue.salesExGst} prevValue={previous.revenue.salesExGst} />
        <Row label="Less: Sales Returns (ex-GST)" value={-current.revenue.salesReturnsExGst} reverseGood />
        <div className="bg-slate-50">
          <Row label="NET REVENUE" value={current.revenue.netRevenue} isTotal prevValue={previous.revenue.netRevenue} />
        </div>

        <SectionHeader title="Cost of Goods Sold (COGS)" />
        <Row label="COGS on Sales" value={current.cogs.cogsOnSales} prevValue={previous.cogs.cogsOnSales} reverseGood />
        <Row label="Less: Cost Recovered on Returns" value={-current.cogs.costRecoveredOnReturns} />
        <div className="bg-slate-50">
          <Row label="NET COGS" value={current.cogs.netCogs} isTotal prevValue={previous.cogs.netCogs} reverseGood />
        </div>

        <div className="bg-emerald-50 border-y-2 border-emerald-100">
          <Row label="GROSS PROFIT" value={current.grossProfit} isTotal prevValue={previous.grossProfit} />
        </div>

        <SectionHeader title="Operating Expenses (OPEX)" />
        {Object.entries(current.opex).map(([cat, amt]: any) => (
          <Row key={cat} label={cat.replace(/_/g, " ")} value={amt} prevValue={previous.opex[cat] || 0} reverseGood indent />
        ))}
        {Object.keys(current.opex).length === 0 && <Row label="No operating expenses recorded" value={0} indent />}
        <div className="bg-slate-50">
          <Row label="TOTAL OPERATING EXPENSES" value={current.totalOpex} isTotal prevValue={previous.totalOpex} reverseGood />
        </div>

        {(current.totalOtherIncome > 0 || previous.totalOtherIncome > 0) && (
          <>
            <SectionHeader title="Other Income" />
            {Object.entries(current.otherIncome).map(([cat, amt]: any) => (
              <Row key={cat} label={cat.replace(/_/g, " ")} value={amt} prevValue={previous.otherIncome[cat] || 0} indent />
            ))}
            <div className="bg-slate-50">
              <Row label="TOTAL OTHER INCOME" value={current.totalOtherIncome} isTotal prevValue={previous.totalOtherIncome} />
            </div>
          </>
        )}

        <div className="bg-slate-900 text-white rounded-b-lg print:rounded-none print:text-black print:bg-white print:border-y-4 print:border-black">
          <Row label="NET PROFIT / (LOSS)" value={current.netProfit} isTotal prevValue={previous.netProfit} />
        </div>
      </Card>
    </div>
  )
}
