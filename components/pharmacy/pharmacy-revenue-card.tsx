"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { DollarSign, X, Banknote, Smartphone, CreditCard, Building2, ShieldCheck, Heart, Layers } from "lucide-react"

interface PaymentBreakdown {
  method: string
  total: number
  count: number
  splitCash: number
  splitUpi: number
  splitCard: number
}

interface RevenueCardProps {
  totalRevenue: number
  breakdown: PaymentBreakdown[]
}

const methodConfig: Record<string, { label: string; icon: typeof DollarSign; color: string; bg: string }> = {
  CASH:          { label: "Cash",          icon: Banknote,     color: "text-green-700",  bg: "bg-green-50 dark:bg-green-950/30" },
  UPI:           { label: "UPI",           icon: Smartphone,   color: "text-purple-700", bg: "bg-purple-50 dark:bg-purple-950/30" },
  CARD:          { label: "Card",          icon: CreditCard,   color: "text-blue-700",   bg: "bg-blue-50 dark:bg-blue-950/30" },
  BANK_TRANSFER: { label: "Bank Transfer", icon: Building2,    color: "text-cyan-700",   bg: "bg-cyan-50 dark:bg-cyan-950/30" },
  INSURANCE:     { label: "Insurance",     icon: ShieldCheck,  color: "text-amber-700",  bg: "bg-amber-50 dark:bg-amber-950/30" },
  BSKY:          { label: "BSKY",          icon: Heart,        color: "text-pink-700",   bg: "bg-pink-50 dark:bg-pink-950/30" },
  PMJAY:         { label: "PM-JAY",        icon: ShieldCheck,  color: "text-orange-700", bg: "bg-orange-50 dark:bg-orange-950/30" },
  SPLIT:         { label: "Split Payment", icon: Layers,       color: "text-indigo-700", bg: "bg-indigo-50 dark:bg-indigo-950/30" },
}

function formatCurrency(amount: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(amount)
}

export function PharmacyRevenueCard({ totalRevenue, breakdown }: RevenueCardProps) {
  const [open, setOpen] = useState(false)

  return (
    <div className="relative">
      <Card
        className="border-t-4 border-t-blue-500 cursor-pointer hover:shadow-md transition-shadow"
        onClick={() => setOpen(!open)}
      >
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Today&apos;s Revenue</CardTitle>
          <DollarSign className="h-5 w-5 text-blue-600" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-blue-600">
            {formatCurrency(totalRevenue)}
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Click to see breakdown
          </p>
        </CardContent>
      </Card>

      {/* Payment Breakdown Popup */}
      {open && (
        <>
          {/* Backdrop */}
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />

          {/* Popup */}
          <div className="absolute top-full left-0 right-0 mt-2 z-50 bg-white dark:bg-zinc-900 rounded-xl border shadow-xl p-4 min-w-[280px] animate-in fade-in slide-in-from-top-2 duration-200">
            {/* Header */}
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-sm text-zinc-800 dark:text-zinc-200">
                💰 Payment Breakdown
              </h3>
              <button
                onClick={(e) => { e.stopPropagation(); setOpen(false) }}
                className="p-1 rounded-md hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
              >
                <X className="h-4 w-4 text-muted-foreground" />
              </button>
            </div>

            {/* Breakdown List */}
            {breakdown.length === 0 ? (
              <div className="text-center py-4 text-sm text-muted-foreground">
                No payments recorded today
              </div>
            ) : (
              <div className="space-y-2">
                {breakdown.map((item) => {
                  const config = methodConfig[item.method] || {
                    label: item.method,
                    icon: DollarSign,
                    color: "text-gray-700",
                    bg: "bg-gray-50 dark:bg-gray-950/30",
                  }
                  const Icon = config.icon
                  const percentage = totalRevenue > 0 ? ((item.total / totalRevenue) * 100).toFixed(0) : "0"

                  return (
                    <div key={item.method}>
                      <div
                        className={`flex items-center justify-between p-2.5 rounded-lg ${config.bg}`}
                      >
                        <div className="flex items-center gap-2.5">
                          <div className={`p-1.5 rounded-md bg-white dark:bg-zinc-800 shadow-sm`}>
                            <Icon className={`h-4 w-4 ${config.color}`} />
                          </div>
                          <div>
                            <p className={`text-sm font-medium ${config.color}`}>{config.label}</p>
                            <p className="text-[10px] text-muted-foreground">
                              {item.count} transaction{item.count !== 1 ? "s" : ""} • {percentage}%
                            </p>
                          </div>
                        </div>
                        <p className={`text-sm font-bold ${config.color}`}>
                          {formatCurrency(item.total)}
                        </p>
                      </div>

                      {/* Split sub-breakdown */}
                      {item.method === "SPLIT" && (item.splitCash > 0 || item.splitUpi > 0 || item.splitCard > 0) && (
                        <div className="ml-10 mt-1 space-y-0.5 mb-1">
                          {item.splitCash > 0 && (
                            <div className="flex items-center justify-between text-[10px] px-2 py-1 rounded bg-green-50/70">
                              <span className="flex items-center gap-1.5 text-green-700">
                                <Banknote className="h-3 w-3" />
                                Cash
                              </span>
                              <span className="font-semibold text-green-700">{formatCurrency(item.splitCash)}</span>
                            </div>
                          )}
                          {item.splitUpi > 0 && (
                            <div className="flex items-center justify-between text-[10px] px-2 py-1 rounded bg-purple-50/70">
                              <span className="flex items-center gap-1.5 text-purple-700">
                                <Smartphone className="h-3 w-3" />
                                UPI
                              </span>
                              <span className="font-semibold text-purple-700">{formatCurrency(item.splitUpi)}</span>
                            </div>
                          )}
                          {item.splitCard > 0 && (
                            <div className="flex items-center justify-between text-[10px] px-2 py-1 rounded bg-blue-50/70">
                              <span className="flex items-center gap-1.5 text-blue-700">
                                <CreditCard className="h-3 w-3" />
                                Card
                              </span>
                              <span className="font-semibold text-blue-700">{formatCurrency(item.splitCard)}</span>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            )}

            {/* Total Footer */}
            <div className="mt-3 pt-3 border-t flex items-center justify-between">
              <span className="text-xs font-medium text-muted-foreground">TOTAL</span>
              <span className="text-sm font-bold text-blue-600">
                {formatCurrency(totalRevenue)}
              </span>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
