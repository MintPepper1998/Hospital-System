import { Badge } from "@/components/ui/badge"

const statusMap: Record<string, { label: string, color: string }> = {
  PAID: { label: "Paid", color: "bg-emerald-100 text-emerald-800 hover:bg-emerald-100" },
  PARTIAL: { label: "Partial", color: "bg-amber-100 text-amber-800 hover:bg-amber-100" },
  PARTIALLY_PAID: { label: "Partially Paid", color: "bg-amber-100 text-amber-800 hover:bg-amber-100" },
  PENDING: { label: "Pending", color: "bg-red-100 text-red-800 hover:bg-red-100" },
  UNPAID: { label: "Unpaid", color: "bg-red-100 text-red-800 hover:bg-red-100" },
  PENDING_GOVERNMENT_PAYMENT: { label: "Govt Pending", color: "bg-orange-100 text-orange-800 hover:bg-orange-100" },
  SETTLED: { label: "Settled", color: "bg-teal-100 text-teal-800 hover:bg-teal-100" },
  OVERDUE: { label: "Overdue", color: "bg-rose-100 text-rose-800 hover:bg-rose-100" },
}

export function StatusBadge({ status, className }: { status: string, className?: string }) {
  const s = statusMap[status] || { label: status, color: "bg-slate-100 text-slate-800 hover:bg-slate-100" }
  return <Badge className={`${s.color} border-transparent shadow-none font-medium ${className || ""}`}>{s.label}</Badge>
}
