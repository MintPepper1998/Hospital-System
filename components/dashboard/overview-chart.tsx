"use client"

import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

const data = [
  { month: "Jan", revenue: 180000, appointments: 245 },
  { month: "Feb", revenue: 220000, appointments: 298 },
  { month: "Mar", revenue: 195000, appointments: 267 },
  { month: "Apr", revenue: 285000, appointments: 342 },
  { month: "May", revenue: 310000, appointments: 389 },
  { month: "Jun", revenue: 340000, appointments: 421 },
  { month: "Jul", revenue: 420000, appointments: 478 },
]

export function OverviewChart() {
  return (
    <Card className="rounded-2xl border-white/5 shadow-lg bg-white dark:bg-gradient-to-br dark:from-slate-900 dark:to-slate-800">
      <CardHeader>
        <CardTitle className="text-lg font-semibold">Revenue Analysis</CardTitle>
        <CardDescription className="text-xs">
          Monthly revenue trends for the last 7 months
        </CardDescription>
      </CardHeader>
      <CardContent className="pt-0">
        <ResponsiveContainer width="100%" height={300}>
          <AreaChart data={data}>
            <defs>
              <linearGradient id="revenueGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
              </linearGradient>
            </defs>
            <XAxis 
              dataKey="month" 
              stroke="#888888"
              fontSize={12}
              tickLine={false}
              axisLine={false}
            />
            <YAxis
              stroke="#888888"
              fontSize={12}
              tickLine={false}
              axisLine={false}
              tickFormatter={(value) => `₹${(value / 1000).toFixed(0)}K`}
            />
            <Tooltip
              content={({ active, payload }) => {
                if (active && payload && payload.length) {
                  return (
                    <div className="rounded-lg border border-white/10 bg-slate-900/95 backdrop-blur-sm p-3 shadow-xl">
                      <div className="grid grid-cols-2 gap-2">
                        <div className="flex flex-col">
                          <span className="text-xs text-slate-400">Revenue</span>
                          <span className="text-sm font-bold text-white">
                            ₹{(payload[0].value as number).toLocaleString('en-IN')}
                          </span>
                        </div>
                        <div className="flex flex-col">
                          <span className="text-xs text-slate-400">Appointments</span>
                          <span className="text-sm font-bold text-white">
                            {payload[0].payload.appointments}
                          </span>
                        </div>
                      </div>
                    </div>
                  )
                }
                return null
              }}
            />
            <Area
              type="monotone"
              dataKey="revenue"
              stroke="#3b82f6"
              strokeWidth={2}
              fillOpacity={1}
              fill="url(#revenueGradient)"
            />
          </AreaChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  )
}
