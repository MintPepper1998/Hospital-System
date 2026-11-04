"use client"

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts"

interface SpecializationChartProps {
  data: Array<{
    department: string
    count: number
  }>
}

const SPEC_COLORS = [
  "#14b8a6", // teal
  "#3b82f6", // blue
  "#ef4444", // red
  "#f59e0b", // amber
  "#8b5cf6", // purple
  "#ec4899", // pink
  "#6b7280", // gray
]

// Fallback specializations when no data
const sampleSpecializations = [
  "Pediatrician",
  "Orthopaedics",
  "Ophthalmology",
  "Neurologist",
  "Dermatologist",
  "Cardiologist",
  "Others",
]

export function SpecializationChart({ data }: SpecializationChartProps) {
  const chartData =
    data.length > 0
      ? data.slice(0, 7).map((item) => ({
          name: item.department.length > 3 ? item.department.substring(0, 3) : item.department,
          fullName: item.department,
          inPatients: Math.floor(item.count * 0.4),
          outPatients: Math.floor(item.count * 0.6),
          total: item.count,
        }))
      : []

  if (chartData.length === 0) {
    return (
      <div className="flex items-center justify-center h-40 text-gray-500">
        <p className="text-xs">No data available</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col">
      {/* Chart */}
      <div className="h-[180px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={chartData}
            margin={{ top: 5, right: 5, left: -25, bottom: 0 }}
            barCategoryGap="25%"
          >
            <XAxis
              dataKey="name"
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: 10, fill: "#9ca3af" }}
            />
            <YAxis
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: 10, fill: "#9ca3af" }}
              domain={[0, "auto"]}
            />
            <Tooltip
              content={({ active, payload }) => {
                if (active && payload && payload.length) {
                  const item = payload[0].payload
                  return (
                    <div className="bg-white p-2 rounded-lg shadow-lg border border-gray-100 text-xs">
                      <p className="font-medium text-gray-900">{item.fullName}</p>
                      <p className="text-teal-600">In: {item.inPatients}</p>
                      <p className="text-gray-400">Out: {item.outPatients}</p>
                    </div>
                  )
                }
                return null
              }}
            />
            <Bar
              dataKey="inPatients"
              fill="#14b8a6"
              radius={[3, 3, 0, 0]}
              barSize={16}
              name="In Patients"
            />
            <Bar
              dataKey="outPatients"
              fill="#d1d5db"
              radius={[3, 3, 0, 0]}
              barSize={16}
              name="Out Patients"
            />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Compact Legend — In/Out + Specialization dots in one row area */}
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 mt-2">
        <div className="flex items-center gap-1.5">
          <div className="h-2.5 w-2.5 rounded-full bg-teal-500" />
          <span className="text-[10px] text-gray-500">In Patients</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="h-2.5 w-2.5 rounded-full bg-gray-300" />
          <span className="text-[10px] text-gray-500">Out Patients</span>
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-2">
        {chartData.map((item, idx) => (
          <div key={idx} className="flex items-center gap-1.5">
            <div
              className="h-2 w-2 rounded-full flex-shrink-0"
              style={{ backgroundColor: SPEC_COLORS[idx % SPEC_COLORS.length] }}
            />
            <span className="text-[10px] text-gray-500">{item.fullName}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
