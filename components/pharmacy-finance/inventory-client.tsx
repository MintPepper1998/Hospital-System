"use client"

import * as React from "react"
import { PageHeader } from "./page-header"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { DataTable } from "./data-table"
import { Money } from "./money"
import { DateRangeFilter } from "./date-range-filter"
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip as RechartsTooltip, Legend } from "recharts"

const COLORS = ["#f43f5e", "#f59e0b", "#3b82f6", "#10b981", "#64748b"]

export function InventoryValueClient({ valuation, writeOffs, range }: { valuation: any; writeOffs: any; range: any }) {
  const { totals, expiry, top20 } = valuation

  const expiryData = [
    { name: "Expired", value: expiry.expired },
    { name: "≤ 30 Days", value: expiry.d30 },
    { name: "31-90 Days", value: expiry.d90 },
    { name: "91-180 Days", value: expiry.d180 },
    { name: "Safe (>180 Days)", value: expiry.safe },
  ].filter(d => d.value > 0)

  const top20Columns = [
    { header: "Medicine", accessor: (r: any) => r.name },
    { header: "Type", accessor: (r: any) => r.type },
    { header: "Stock Value", accessor: (r: any) => <Money value={r.totalValue} />, className: "text-right" }
  ]

  const writeOffColumns = [
    { header: "Reason", accessor: (r: any) => r.reason },
    { header: "Loss (Write-off)", accessor: (r: any) => r.loss > 0 ? <Money value={r.loss} /> : "-", className: "text-right text-rose-600" },
    { header: "Gain (Found)", accessor: (r: any) => r.gain > 0 ? <Money value={r.gain} /> : "-", className: "text-right text-emerald-600" }
  ]

  return (
    <div className="space-y-6">
      <PageHeader 
        title="Inventory Valuation" 
        subtitle="Current stock value, expiry risk, and write-offs"
      />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="bg-slate-900 text-slate-50 border-0">
          <CardHeader>
            <CardTitle className="text-slate-300">Stock at Cost</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">₹{totals.stockAtCost.toLocaleString("en-IN", { maximumFractionDigits: 0 })}</div>
            <div className="text-sm text-slate-400 mt-2">Capital locked in inventory</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-muted-foreground">Stock at MRP</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">₹{totals.stockAtMrp.toLocaleString("en-IN", { maximumFractionDigits: 0 })}</div>
            <div className="text-sm text-emerald-600 mt-2 font-medium">Potential Value</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-muted-foreground">Potential Margin</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">₹{totals.potentialMargin.toLocaleString("en-IN", { maximumFractionDigits: 0 })}</div>
            <div className="text-sm text-muted-foreground mt-2">If 100% stock is sold at MRP</div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Expiry Risk Profile (by Cost)</CardTitle>
          </CardHeader>
          <CardContent>
            {expiryData.length > 0 ? (
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={expiryData} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={60} outerRadius={90} label>
                      {expiryData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    {/* @ts-ignore */}
                    <RechartsTooltip formatter={(val: number) => `₹${val.toLocaleString("en-IN")}`} />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="h-[300px] flex items-center justify-center text-muted-foreground border border-dashed rounded-lg">
                No inventory batches found
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle>Stock Adjustments / Write-offs</CardTitle>
            <DateRangeFilter />
          </CardHeader>
          <CardContent>
            <div className="flex gap-4 mb-4 mt-2">
              <div className="px-3 py-1 bg-rose-50 text-rose-700 rounded-md text-sm border border-rose-100">
                Total Loss: <strong>₹{writeOffs.totalLoss.toLocaleString("en-IN")}</strong>
              </div>
              <div className="px-3 py-1 bg-emerald-50 text-emerald-700 rounded-md text-sm border border-emerald-100">
                Total Gain: <strong>₹{writeOffs.totalGain.toLocaleString("en-IN")}</strong>
              </div>
            </div>
            <DataTable data={writeOffs.rows} columns={writeOffColumns} keyExtractor={(r: any) => r.reason} emptyState="No adjustments in this period" />
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Top 20 Medicines by Value</CardTitle>
        </CardHeader>
        <CardContent>
          <DataTable data={top20} columns={top20Columns} keyExtractor={(r: any) => r.id} emptyState="No stock data" />
        </CardContent>
      </Card>

    </div>
  )
}
