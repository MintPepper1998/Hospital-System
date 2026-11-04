import { Badge } from "@/components/ui/badge"
import { CheckCircle2, Clock, AlertCircle, XCircle, Activity } from "lucide-react"

export function SurgeryStatusBadge({ status }: { status: string }) {
  const config = {
    SCHEDULED: {
      label: "Scheduled",
      variant: "secondary" as const,
      icon: Clock
    },
    IN_PROGRESS: {
      label: "In Progress",
      variant: "default" as const,
      icon: Activity
    },
    COMPLETED: {
      label: "Completed",
      variant: "outline" as const,
      icon: CheckCircle2
    },
    CANCELLED: {
      label: "Cancelled",
      variant: "destructive" as const,
      icon: XCircle
    },
    POSTPONED: {
      label: "Postponed",
      variant: "outline" as const,
      icon: AlertCircle
    }
  }

  const statusConfig = config[status as keyof typeof config] || config.SCHEDULED
  const Icon = statusConfig.icon

  return (
    <Badge variant={statusConfig.variant} className="flex items-center gap-1">
      <Icon className="h-3 w-3" />
      {statusConfig.label}
    </Badge>
  )
}
