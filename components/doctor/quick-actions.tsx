import Link from "next/link"
import {
  FolderOpen,
  Pill,
  FlaskConical,
  Activity,
} from "lucide-react"

const actions = [
  {
    label: "Patient Records",
    href: "/dashboard/clinical/emr",
    icon: FolderOpen,
    color: "bg-blue-50 text-blue-600 group-hover:bg-blue-100",
  },
  {
    label: "Prescriptions",
    href: "/dashboard/clinical/opd",
    icon: Pill,
    color: "bg-violet-50 text-violet-600 group-hover:bg-violet-100",
  },
  {
    label: "Lab Orders",
    href: "/dashboard/lab/reports",
    icon: FlaskConical,
    color: "bg-emerald-50 text-emerald-600 group-hover:bg-emerald-100",
  },
  {
    label: "Radiology",
    href: "/dashboard/radiology",
    icon: Activity,
    color: "bg-amber-50 text-amber-600 group-hover:bg-amber-100",
  },
]

export function QuickActions() {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 md:gap-4">
      {actions.map((action) => (
        <Link
          key={action.label}
          href={action.href}
          className="group rounded-2xl border border-gray-100 bg-white p-4 flex flex-col items-center justify-center gap-3 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-300"
        >
          <div className={`h-12 w-12 rounded-xl ${action.color} flex items-center justify-center transition-colors shadow-inner`}>
            <action.icon className="h-5 w-5" />
          </div>
          <span className="text-[12px] font-semibold text-gray-700 text-center uppercase tracking-wide">
            {action.label}
          </span>
        </Link>
      ))}
    </div>
  )
}
