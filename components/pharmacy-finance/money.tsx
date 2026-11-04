import { cn } from "@/lib/utils"
import { inr } from "@/lib/pharmacy-finance/money"

export function Money({ 
  value, 
  className, 
  noColor = false,
  frac = 2,
}: { 
  value: number | null | undefined
  className?: string
  noColor?: boolean 
  frac?: number
}) {
  const val = value ?? 0
  return (
    <span className={cn(
      "tabular-nums whitespace-nowrap",
      !noColor && val < 0 && "text-red-600",
      className
    )}>
      {inr(val, frac)}
    </span>
  )
}
