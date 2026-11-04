import { Badge } from "@/components/ui/badge"
import { AlertCircle, CheckCircle2, Clock, XCircle } from "lucide-react"

export function PACStatusBadge({ status }: { status: string }) {
  const config = {
    PENDING: {
      label: "PAC Pending",
      variant: "outline" as const,
      icon: Clock,
      className: "border-yellow-500 text-yellow-700"
    },
    FIT: {
      label: "PAC: Fit",
      variant: "outline" as const,
      icon: CheckCircle2,
      className: "border-green-500 text-green-700"
    },
    UNFIT: {
      label: "PAC: Unfit",
      variant: "destructive" as const,
      icon: XCircle,
      className: ""
    },
    CONDITIONAL: {
      label: "PAC: Conditional",
      variant: "outline" as const,
      icon: AlertCircle,
      className: "border-orange-500 text-orange-700"
    }
  }

  const statusConfig = config[status as keyof typeof config] || config.PENDING
  const Icon = statusConfig.icon

  return (
    <Badge variant={statusConfig.variant} className={`flex items-center gap-1 ${statusConfig.className}`}>
      <Icon className="h-3 w-3" />
      {statusConfig.label}
    </Badge>
  )
}
