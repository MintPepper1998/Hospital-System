import { LucideIcon } from "lucide-react"
import { cn } from "@/lib/utils"

interface StatCardProps {
  title: string
  value: string | number
  icon: LucideIcon
  badge?: string
  trend?: {
    value: string
    isPositive: boolean
  }
  variant?: "indigo" | "orange" | "green" | "white" | "neumorphic"
  // Keep these for backward compatibility during transition if needed
  gradient?: string
  iconColor?: string
}

export function StatCard({
  title,
  value,
  icon: Icon,
  badge,
  trend,
  variant = "white"
}: StatCardProps) {
  const styles = {
    indigo: {
      bg: "bg-[#5A59FF] dark:bg-[#4338CA]",
      text: "text-indigo-100",
      value: "text-white",
      badge: "bg-white/20 text-white",
      icon: "text-white"
    },
    orange: {
      bg: "bg-[#FFC993] dark:bg-[#d97706]", 
      text: "text-[#8E5224] dark:text-[#fef3c7]",
      value: "text-[#7B3E0B] dark:text-white",
      badge: "bg-white/50 text-[#8E5224] dark:bg-black/20 dark:text-white",
      icon: "text-[#7B3E0B] dark:text-white"
    },
    green: {
      bg: "bg-[#098356] dark:bg-[#059669]",
      text: "text-emerald-100",
      value: "text-white",
      badge: "bg-white/20 text-white",
      icon: "text-white"
    },
    white: {
      bg: "bg-white dark:bg-[#1E2330] shadow-[0_8px_30px_rgb(0,0,0,0.04)]",
      text: "text-slate-500 dark:text-slate-400",
      value: "text-slate-900 dark:text-white",
      badge: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300",
      icon: "text-indigo-600 dark:text-indigo-400"
    },
    neumorphic: {
      bg: "bg-[#e0e5ec] neo-flat",
      text: "text-zinc-500",
      value: "text-zinc-800",
      badge: "bg-[#e0e5ec] neo-pressed text-zinc-600",
      icon: "text-zinc-600"
    }
  }

  const v = styles[variant]

  return (
    <div className={cn(
      "rounded-[1.5rem] p-6 relative overflow-hidden transition-transform duration-300 hover:scale-[1.02]",
      v.bg
    )}>
      {/* Top Row: Icon and Badge/Trend */}
      <div className="flex justify-between items-start mb-6">
        <Icon className={cn("h-6 w-6 stroke-[2.5]", v.icon)} />
        
        {badge ? (
          <span className={cn("px-3 py-1 rounded-full text-[10px] font-bold tracking-wider uppercase", v.badge)}>
            {badge}
          </span>
        ) : trend ? (
          <div className={cn(
            "inline-flex items-center gap-0.5 text-xs font-bold",
            variant === "white" 
              ? trend.isPositive ? "text-emerald-600 dark:text-emerald-400" : "text-red-500 dark:text-red-400"
              : v.text
          )}>
            <span className="text-base leading-none">{trend.isPositive ? "↗" : "↘"}</span>
            <span>{trend.value}</span>
          </div>
        ) : null}
      </div>

      {/* Bottom Row: Value and Title */}
      <div className="flex flex-col gap-1">
        <h3 className={cn("text-4xl font-extrabold tracking-tight", v.value)}>
          {value}
        </h3>
        <p className={cn("text-[13px] font-semibold", v.text)}>
          {title}
        </p>
      </div>
    </div>
  )
}
