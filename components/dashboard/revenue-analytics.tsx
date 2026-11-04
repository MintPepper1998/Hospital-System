"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { TrendingUp, IndianRupee } from "lucide-react"
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts"

interface RevenueData {
  date: string
  fullDate: string
  revenue: number
}

interface RevenueAnalyticsProps {
  data: RevenueData[]
  monthRevenue: number
}

// Custom tooltip for the chart
function CustomTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean
  payload?: { value: number; payload: RevenueData }[]
  label?: string
}) {
  if (active && payload && payload.length) {
    const item = payload[0]
    return (
      <div className="bg-white border border-gray-200 rounded-lg shadow-lg p-3 text-sm">
        <p className="text-gray-500 text-xs mb-1">{item.payload.fullDate}</p>
        <div className="flex items-center gap-1.5">
          <IndianRupee className="h-3.5 w-3.5 text-teal-600" />
          <span className="font-bold text-gray-900">
            {item.value.toLocaleString("en-IN", {
              minimumFractionDigits: 0,
              maximumFractionDigits: 0,
            })}
          </span>
        </div>
      </div>
    )
  }
  return null
}

export function RevenueAnalytics({ data, monthRevenue }: RevenueAnalyticsProps) {
  // Calculate 7-day total for display
  const weekTotal = data.reduce((sum, d) => sum + d.revenue, 0)
  const avgDaily = weekTotal / 7

  return (
    <Card className="bg-[#e0e5ec] neo-flat !rounded-[2rem] border-none">
      <CardHeader className="pb-2 flex flex-row items-center justify-between">
        <div>
          <CardTitle className="text-sm font-semibold text-gray-900 flex items-center gap-1.5">
            <TrendingUp className="h-4 w-4 text-teal-600" />
            Hospital Revenue Trends
          </CardTitle>
          <p className="text-[10px] text-gray-400 mt-0.5">Last 7 days collection</p>
        </div>
        <div className="text-right">
          <p className="text-[10px] text-gray-400 uppercase tracking-wide">7-day Total</p>
          <p className="text-base font-bold text-gray-900">
            ₹{weekTotal.toLocaleString("en-IN", { maximumFractionDigits: 0 })}
          </p>
        </div>
      </CardHeader>
      <CardContent className="pt-0 pb-4">
        {/* Summary chips */}
        <div className="flex gap-3 mb-3">
          <div className="flex items-center gap-1.5 bg-teal-50 rounded-md px-2.5 py-1">
            <div className="h-2 w-2 rounded-full bg-teal-500" />
            <span className="text-[10px] text-gray-600">
              Avg: ₹{avgDaily.toLocaleString("en-IN", { maximumFractionDigits: 0 })}/day
            </span>
          </div>
          <div className="flex items-center gap-1.5 bg-gray-50 rounded-md px-2.5 py-1">
            <div className="h-2 w-2 rounded-full bg-gray-400" />
            <span className="text-[10px] text-gray-600">
              Month: ₹{monthRevenue.toLocaleString("en-IN", { maximumFractionDigits: 0 })}
            </span>
          </div>
        </div>

        {/* Chart */}
        <div className="h-[220px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart
              data={data}
              margin={{ top: 5, right: 5, left: -15, bottom: 0 }}
            >
              <defs>
                <linearGradient id="tealGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#14b8a6" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#14b8a6" stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <CartesianGrid
                strokeDasharray="3 3"
                vertical={false}
                stroke="#f3f4f6"
              />
              <XAxis
                dataKey="date"
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 11, fill: "#9ca3af" }}
                dy={8}
              />
              <YAxis
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 10, fill: "#9ca3af" }}
                tickFormatter={(value: number) =>
                  value >= 1000 ? `${(value / 1000).toFixed(0)}K` : `${value}`
                }
              />
              <Tooltip content={<CustomTooltip />} />
              <Area
                type="monotone"
                dataKey="revenue"
                stroke="#14b8a6"
                strokeWidth={2.5}
                fill="url(#tealGradient)"
                dot={{
                  r: 4,
                  fill: "#ffffff",
                  stroke: "#14b8a6",
                  strokeWidth: 2,
                }}
                activeDot={{
                  r: 6,
                  fill: "#14b8a6",
                  stroke: "#ffffff",
                  strokeWidth: 2,
                }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  )
}
