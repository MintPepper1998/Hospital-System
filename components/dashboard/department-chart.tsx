"use client"

import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

const data = [
  { name: "Doctors", value: 45, color: "#3b82f6" },
  { name: "Nurses", value: 120, color: "#8b5cf6" },
  { name: "Admin Staff", value: 28, color: "#ec4899" },
  { name: "Technicians", value: 35, color: "#f59e0b" },
  { name: "Support", value: 42, color: "#10b981" },
]

export function DepartmentChart() {
  return (
    <Card className="rounded-2xl border-white/5 shadow-lg bg-white dark:bg-gradient-to-br dark:from-slate-900 dark:to-slate-800">
      <CardHeader>
        <CardTitle className="text-lg font-semibold">Staff Distribution</CardTitle>
        <CardDescription className="text-xs">
          Total staff by department
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col items-center">
        <ResponsiveContainer width="100%" height={200}>
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius={60}
              outerRadius={80}
              paddingAngle={2}
              dataKey="value"
            >
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip
              content={({ active, payload }) => {
                if (active && payload && payload.length) {
                  return (
                    <div className="rounded-lg border border-white/10 bg-slate-900/95 backdrop-blur-sm p-2 shadow-xl">
                      <p className="text-xs text-slate-400">{payload[0].name}</p>
                      <p className="text-sm font-bold text-white">
                        {payload[0].value} staff
                      </p>
                    </div>
                  )
                }
                return null
              }}
            />
          </PieChart>
        </ResponsiveContainer>
        
        {/* Legend */}
        <div className="grid grid-cols-2 gap-3 w-full mt-4">
          {data.map((item) => (
            <div key={item.name} className="flex items-center gap-2">
              <div 
                className="w-3 h-3 rounded-full" 
                style={{ backgroundColor: item.color }}
              />
              <div className="flex flex-col">
                <span className="text-xs font-medium text-foreground">{item.name}</span>
                <span className="text-xs text-muted-foreground">{item.value}</span>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
