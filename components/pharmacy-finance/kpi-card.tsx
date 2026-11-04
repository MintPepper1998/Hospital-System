import { Card, CardContent } from "@/components/ui/card"
import { LucideIcon } from "lucide-react"
import { cn } from "@/lib/utils"

interface KpiCardProps {
  label: string
  value: React.ReactNode
  icon: LucideIcon
  trend?: {
    value: number
    label: string
    isPositive?: boolean
  }
}

export function KpiCard({ label, value, icon: Icon, trend }: KpiCardProps) {
  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-center justify-between space-y-0 pb-2">
          <p className="text-sm font-medium text-slate-500">{label}</p>
          <Icon className="h-4 w-4 text-slate-400" />
        </div>
        <div className="text-2xl font-bold text-slate-900">{value}</div>
        {trend && (
          <p className={cn(
            "text-xs mt-1 font-medium",
            trend.isPositive === undefined ? "text-slate-500" :
            trend.isPositive ? "text-emerald-600" : "text-rose-600"
          )}>
            {trend.value > 0 ? "+" : ""}{trend.value}%
            <span className="text-slate-500 font-normal ml-1">{trend.label}</span>
          </p>
        )}
      </CardContent>
    </Card>
  )
}
