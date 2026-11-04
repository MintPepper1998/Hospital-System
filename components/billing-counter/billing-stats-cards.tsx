"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { IndianRupee, Receipt, Clock, Banknote } from "lucide-react"

interface StatsData {
  totalRevenue: number
  billCount: number
  pendingCount: number
  cashCollected: number
}

export function BillingStatsCards({ stats }: { stats: StatsData }) {
  const cards = [
    {
      label: "Today's Revenue",
      value: `₹${stats.totalRevenue.toLocaleString("en-IN")}`,
      icon: IndianRupee,
      color: "text-green-600",
      bg: "bg-green-50",
      border: "border-green-200",
    },
    {
      label: "Bills Today",
      value: stats.billCount.toString(),
      icon: Receipt,
      color: "text-blue-600",
      bg: "bg-blue-50",
      border: "border-blue-200",
    },
    {
      label: "Pending Bills",
      value: stats.pendingCount.toString(),
      icon: Clock,
      color: "text-amber-600",
      bg: "bg-amber-50",
      border: "border-amber-200",
    },
    {
      label: "Cash Collected",
      value: `₹${stats.cashCollected.toLocaleString("en-IN")}`,
      icon: Banknote,
      color: "text-emerald-600",
      bg: "bg-emerald-50",
      border: "border-emerald-200",
    },
  ]

  return (
    <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
      {cards.map((c) => (
        <Card key={c.label} className={`${c.border} ${c.bg}`}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs font-medium text-gray-600">
              {c.label}
            </CardTitle>
            <c.icon className={`h-4 w-4 ${c.color}`} />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${c.color}`}>{c.value}</div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
