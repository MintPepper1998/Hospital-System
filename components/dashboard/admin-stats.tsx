"use client"

import { Card, CardContent } from "@/components/ui/card"
import {
  IndianRupee,
  Clock,
  BedDouble,
  ArrowUpRight,
  ArrowDownRight,
  TrendingUp,
  TrendingDown,
} from "lucide-react"
import type { AdminStats } from "@/app/actions/admin-dashboard"
import { cn } from "@/lib/utils"

interface AdminStatsProps {
  stats: AdminStats
}

export function AdminStatsCards({ stats }: AdminStatsProps) {
  const { financials, occupancy, flow } = stats

  // Helper to format Indian rupees
  const formatINR = (amount: number) => {
    if (amount >= 100000) {
      return `${(amount / 100000).toFixed(1)}L`
    }
    if (amount >= 1000) {
      return `${(amount / 1000).toFixed(1)}K`
    }
    return amount.toLocaleString("en-IN")
  }

  // Occupancy color logic
  const getOccupancyColor = (rate: number) => {
    if (rate >= 90) return { ring: "text-red-500", bg: "bg-red-50", text: "text-red-700" }
    if (rate >= 70) return { ring: "text-amber-500", bg: "bg-amber-50", text: "text-amber-700" }
    return { ring: "text-teal-500", bg: "bg-teal-50", text: "text-teal-700" }
  }

  const occColor = getOccupancyColor(occupancy.occupancyRate)

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3 md:gap-4">
      {/* ── Card 1: Today's Revenue (Indigo) ── */}
      <Card className="bg-[#e0e5ec] neo-flat transition-all duration-300 hover:scale-[1.02] rounded-2xl border-none">
        <CardContent className="px-3.5 py-2.5 lg:px-4 lg:py-3">
          <div className="flex items-start justify-between">
            <div className="space-y-0 text-left w-full">
              <p className="text-[9px] md:text-[10px] text-indigo-500 uppercase tracking-wider font-bold mb-0.5">
                Today&apos;s Revenue
              </p>
              <div className="flex items-baseline gap-1">
                <span className="text-base text-indigo-400 font-medium">₹</span>
                <span className="text-xl md:text-2xl font-extrabold text-indigo-600 tracking-tight">
                  {formatINR(financials.todayRevenue)}
                </span>
              </div>
              <p className="text-[9px] text-indigo-500 font-medium mt-0">
                Month: ₹{formatINR(financials.monthRevenue)}
              </p>
            </div>
            <div className="h-8 w-8 rounded-[10px] neo-pressed flex items-center justify-center flex-shrink-0 ml-2">
              <IndianRupee className="h-4 w-4 text-indigo-500 stroke-[2.5]" />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ── Card 2: Pending Collections (Orange) ── */}
      <Card className="bg-[#e0e5ec] neo-flat transition-all duration-300 hover:scale-[1.02] rounded-2xl border-none">
        <CardContent className="px-3.5 py-2.5 lg:px-4 lg:py-3">
          <div className="flex items-start justify-between">
            <div className="space-y-0 text-left w-full">
              <p className="text-[9px] md:text-[10px] text-[#b35e22] uppercase tracking-wider font-bold mb-0.5">
                Pending Collections
              </p>
              <div className="flex items-baseline gap-1">
                <span className="text-base text-[#b35e22] font-medium">₹</span>
                <span className="text-xl md:text-2xl font-extrabold text-[#964a17] tracking-tight">
                  {formatINR(financials.pendingBills)}
                </span>
              </div>
              <p className="text-[9px] text-[#964a17] font-bold neo-pressed inline-block px-1.5 py-0.5 rounded-full mt-0.5 text-[8.5px]">
                {financials.pendingCount} unpaid bill{financials.pendingCount !== 1 ? "s" : ""}
              </p>
            </div>
            <div className="h-8 w-8 rounded-[10px] neo-pressed flex items-center justify-center flex-shrink-0 ml-2">
              <Clock className="h-4 w-4 text-[#964a17] stroke-[2.5]" />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ── Card 3: Bed Occupancy (Green) ── */}
      <Card className="bg-[#e0e5ec] neo-flat transition-all duration-300 hover:scale-[1.02] rounded-2xl border-none">
        <CardContent className="px-3.5 py-2.5 lg:px-4 lg:py-3">
          <div className="flex flex-col w-full text-left gap-1">
            <div className="flex justify-between items-start w-full">
              <div className="space-y-0 text-left">
                <p className="text-[9px] md:text-[10px] text-emerald-600 uppercase tracking-wider font-bold mb-0.5">
                  Bed Occupancy
                </p>
                <div className="flex items-baseline gap-1.5">
                  <span className="text-xl md:text-2xl font-extrabold text-emerald-700 tracking-tight">
                    {occupancy.occupancyRate}%
                  </span>
                  <span className="text-[8px] font-bold px-1.5 py-[1px] rounded-sm neo-pressed text-emerald-600 uppercase">
                    {occupancy.occupiedBeds}/{occupancy.totalBeds} filled
                  </span>
                </div>
              </div>
              <div className="h-8 w-8 rounded-[10px] neo-pressed flex items-center justify-center flex-shrink-0 ml-2">
                <BedDouble className="h-4 w-4 text-emerald-600 stroke-[2.5]" />
              </div>
            </div>
            
            <div className="mt-1">
              {/* Mini progress bar */}
              <div className="w-full h-1 neo-pressed rounded-full overflow-hidden mb-1">
                <div
                  className={cn("h-full rounded-full transition-all", 
                    occupancy.occupancyRate >= 90 ? "bg-red-500" :
                    occupancy.occupancyRate >= 70 ? "bg-orange-500" : "bg-emerald-500"
                  )}
                  style={{ width: `${Math.min(100, occupancy.occupancyRate)}%` }}
                />
              </div>
              <p className="text-[9px] text-emerald-600/90 font-medium">
                {occupancy.availableBeds} beds available
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ── Card 4: Patient Flow (White) ── */}
      <Card className="bg-[#e0e5ec] neo-flat transition-all duration-300 hover:scale-[1.02] rounded-2xl border-none">
        <CardContent className="px-3.5 py-2.5 lg:px-4 lg:py-3">
          <div className="flex flex-col w-full text-left">
            <p className="text-[9px] md:text-[10px] text-slate-500 dark:text-slate-400 uppercase tracking-wider font-bold mb-1">
              Patient Flow (Today)
            </p>
            <div className="grid grid-cols-2 gap-2 mb-1.5">
              {/* Admissions */}
              <div className="flex flex-col gap-0.5">
                <div className="flex items-center gap-1">
                  <div className="h-3.5 w-3.5 rounded bg-green-100 dark:bg-green-900/40 flex items-center justify-center flex-shrink-0">
                    <ArrowUpRight className="h-2 w-2 text-green-600 dark:text-green-400 stroke-[3]" />
                  </div>
                  <p className="text-[8px] md:text-[9px] font-semibold text-slate-500 dark:text-slate-400 uppercase">Admitted</p>
                </div>
                <p className="text-lg md:text-xl font-extrabold text-slate-900 dark:text-white leading-tight">
                  {flow.todayAdmissions}
                </p>
              </div>
              {/* Discharges */}
              <div className="flex flex-col gap-0.5">
               <div className="flex items-center gap-1">
                  <div className="h-3.5 w-3.5 rounded bg-purple-100 dark:bg-purple-900/40 flex items-center justify-center flex-shrink-0">
                    <ArrowDownRight className="h-2 w-2 text-purple-600 dark:text-purple-400 stroke-[3]" />
                  </div>
                  <p className="text-[8px] md:text-[9px] font-semibold text-slate-500 dark:text-slate-400 uppercase">Discharged</p>
                </div>
                <p className="text-lg md:text-xl font-extrabold text-slate-900 dark:text-white leading-tight">
                  {flow.todayDischarges}
                </p>
              </div>
            </div>
            {/* Comparison with yesterday */}
            <div className="flex items-center gap-1.5 pt-1 border-t border-slate-100 dark:border-slate-800">
              {flow.todayAdmissions >= flow.yesterdayAdmissions ? (
                <TrendingUp className="h-3 w-3 text-emerald-500 dark:text-emerald-400" />
              ) : (
                <TrendingDown className="h-3 w-3 text-amber-500 dark:text-amber-400" />
              )}
              <p className="text-[8.5px] font-semibold text-slate-500 dark:text-slate-400">
                vs yesterday: {flow.yesterdayAdmissions} in / {flow.yesterdayDischarges} out
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
