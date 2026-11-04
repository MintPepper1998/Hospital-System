import Link from "next/link"
import { requireAuthSafe } from "@/lib/auth-guard"
import { redirect } from "next/navigation"
import { getBillingCounterStats } from "@/lib/actions/billing-counter"
import {
  Stethoscope,
  Bed,
  Bandage,
  Siren,
  Scissors,
  Microscope,
  Truck,
  Plus,
  Receipt,
  IndianRupee,
  Clock,
  Banknote,
  ArrowRight,
  ShieldCheck,
  RefreshCw,
  Zap,
} from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"

export default async function BillingCounterPage() {
  const authResult = await requireAuthSafe(["SUPER_ADMIN", "ACCOUNTANT", "RECEPTIONIST"])
  if (!authResult.ok) redirect("/dashboard")

  const statsResult = await getBillingCounterStats()
  const stats = statsResult.data || {
    totalRevenue: 0,
    billCount: 0,
    pendingCount: 0,
    cashCollected: 0,
    unbilledAppointments: 0,
    unbilledCasualty: 0,
    unbilledEmergency: 0,
    unbilledSurgeries: 0,
  }

  const categories = [
    {
      label: "OPD Billing",
      description: "Bill consultation fees, hospital fees for OPD visits",
      href: "/dashboard/billing-counter/opd",
      icon: Stethoscope,
      color: "text-blue-600",
      bg: "bg-blue-50",
      border: "border-l-blue-500",
      badge: stats.unbilledAppointments,
    },
    {
      label: "IPD Billing",
      description: "Bill room charges, procedures, services for admitted patients",
      href: "/dashboard/billing-counter/ipd",
      icon: Bed,
      color: "text-indigo-600",
      bg: "bg-indigo-50",
      border: "border-l-indigo-500",
      badge: 0,
    },
    {
      label: "Casualty Billing",
      description: "Bill procedures and services for casualty visits",
      href: "/dashboard/billing-counter/casualty",
      icon: Bandage,
      color: "text-orange-600",
      bg: "bg-orange-50",
      border: "border-l-orange-500",
      badge: stats.unbilledCasualty,
    },
    {
      label: "Emergency (ER) Billing",
      description: "Bill ER treatment, procedures, bed charges",
      href: "/dashboard/billing-counter/emergency",
      icon: Siren,
      color: "text-red-600",
      bg: "bg-red-50",
      border: "border-l-red-500",
      badge: stats.unbilledEmergency,
    },
    {
      label: "Surgery / OT Billing",
      description: "Bill surgical procedures, OT charges, consumables",
      href: "/dashboard/billing-counter/surgery",
      icon: Scissors,
      color: "text-purple-600",
      bg: "bg-purple-50",
      border: "border-l-purple-500",
      badge: stats.unbilledSurgeries,
    },
    {
      label: "Lab / Diagnostics",
      description: "Bill pathology tests and radiology investigations",
      href: "/dashboard/billing-counter/diagnostics",
      icon: Microscope,
      color: "text-teal-600",
      bg: "bg-teal-50",
      border: "border-l-teal-500",
      badge: 0,
    },
    {
      label: "Ambulance",
      description: "Bill ambulance trip charges",
      href: "/dashboard/billing-counter/ambulance",
      icon: Truck,
      color: "text-amber-600",
      bg: "bg-amber-50",
      border: "border-l-amber-500",
      badge: 0,
    },
    {
      label: "Custom Service",
      description: "Bill any custom hospital service or procedure",
      href: "/dashboard/billing-counter/custom",
      icon: Plus,
      color: "text-gray-600",
      bg: "bg-gray-50",
      border: "border-l-gray-400",
      badge: 0,
    },
  ]

  const statCards = [
    {
      label: "Today's Revenue",
      value: `₹${stats.totalRevenue.toLocaleString("en-IN")}`,
      icon: IndianRupee,
      color: "text-green-600",
      bg: "bg-green-50",
      border: "border-green-200",
    },
    {
      label: "Bills Today",
      value: stats.billCount.toString(),
      icon: Receipt,
      color: "text-blue-600",
      bg: "bg-blue-50",
      border: "border-blue-200",
    },
    {
      label: "Pending",
      value: stats.pendingCount.toString(),
      icon: Clock,
      color: "text-amber-600",
      bg: "bg-amber-50",
      border: "border-amber-200",
    },
    {
      label: "Cash Collected",
      value: `₹${stats.cashCollected.toLocaleString("en-IN")}`,
      icon: Banknote,
      color: "text-emerald-600",
      bg: "bg-emerald-50",
      border: "border-emerald-200",
    },
  ]

  return (
    <div className="flex-1 space-y-6 bg-slate-50/70 p-4 md:p-8 pt-6 min-h-full">
      {/* Header */}
      <div className="relative overflow-hidden rounded-2xl bg-[#081b33] px-6 py-7 text-white shadow-xl shadow-slate-200 md:px-8">
        <div className="absolute -right-20 -top-24 h-72 w-72 rounded-full bg-cyan-400/15 blur-3xl" />
        <div className="absolute bottom-0 right-1/4 h-24 w-64 bg-blue-500/10 blur-2xl" />
        <div className="relative flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
          <div>
            <div className="mb-2 flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.22em] text-cyan-300">
              <span className="h-2 w-2 rounded-full bg-emerald-400 shadow-[0_0_12px_#34d399]" /> Live counter workspace
            </div>
            <h2 className="text-3xl font-semibold tracking-tight md:text-4xl">Billing Counter</h2>
            <p className="mt-2 max-w-2xl text-sm text-slate-300">
              One secure workspace for every patient-facing bill — OPD, IPD, emergency, diagnostics, OT and more.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link href="/dashboard/billing-counter/custom" className="inline-flex items-center gap-2 rounded-lg bg-cyan-300 px-4 py-2.5 text-sm font-bold text-[#081b33] transition hover:bg-cyan-200">
              <Zap className="h-4 w-4" /> New service bill
            </Link>
            <Link href="/dashboard/billing-counter/history" className="inline-flex items-center gap-2 rounded-lg border border-white/20 bg-white/10 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-white/15">
              <Receipt className="h-4 w-4" /> History
            </Link>
          </div>
        </div>
        <div className="relative mt-6 flex flex-wrap items-center gap-x-6 gap-y-2 border-t border-white/10 pt-4 text-xs text-slate-300">
          <span className="flex items-center gap-1.5"><ShieldCheck className="h-4 w-4 text-emerald-300" /> Role-scoped access</span>
          <span className="flex items-center gap-1.5"><RefreshCw className="h-4 w-4 text-cyan-300" /> Patient queues stay reconciled</span>
          <span className="text-slate-400">Operator: {authResult.session.name || authResult.session.email}</span>
        </div>
      </div>
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold tracking-tight text-slate-900">Choose a billing lane</h3>
          <p className="text-sm text-slate-500 mt-1">Start from a pending queue or create a service bill directly.</p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
        {statCards.map((c) => (
          <Card key={c.label} className={`${c.border} ${c.bg}`}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-xs font-medium text-gray-600">
                {c.label}
              </CardTitle>
              <c.icon className={`h-4 w-4 ${c.color}`} />
            </CardHeader>
            <CardContent>
              <div className={`text-2xl font-bold ${c.color}`}>{c.value}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Category Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {categories.map((cat) => (
          <Link key={cat.label} href={cat.href}>
            <Card
              className={`border-l-4 ${cat.border} group h-full border-y-0 border-r-0 bg-white shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-lg`}
            >
              <CardContent className="p-5">
                <div className="flex items-start gap-3">
                  <div
                    className={`w-10 h-10 rounded-lg ${cat.bg} flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform`}
                  >
                    <cat.icon className={`h-5 w-5 ${cat.color}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold text-sm text-gray-900 group-hover:text-blue-700 transition-colors">
                        {cat.label}
                      </h3>
                      {cat.badge > 0 && (
                        <Badge className="bg-red-100 text-red-700 text-[10px] px-1.5 py-0 font-semibold">
                          {cat.badge}
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs text-gray-500 mt-1 line-clamp-2">
                      {cat.description}
                    </p>
                  </div>
                  <ArrowRight className="h-4 w-4 text-gray-300 group-hover:text-blue-500 transition-colors flex-shrink-0 mt-1" />
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  )
}
