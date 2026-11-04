"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import {
    BookOpen,
    IndianRupee,
    Wallet,
    TrendingDown,
    Building2,
    Activity,
    HeartPulse,
    FileSpreadsheet,
    Pill,
    Layers
} from "lucide-react"

const REPORT_CATEGORIES = [
    {
        title: "Revenue",
        links: [
            { name: "Day Book", href: "/dashboard/reports/day-book", icon: BookOpen },
            { name: "OPD/IPD Revenue", href: "/dashboard/reports/opd-ipd-revenue", icon: IndianRupee },
            { name: "BSKY Claims", href: "/dashboard/reports/bsky-claims", icon: Wallet },
        ]
    },
    {
        title: "Expenses",
        links: [
            { name: "Operational Expenses", href: "/dashboard/reports/operational-expenses", icon: TrendingDown },
        ]
    },
    {
        title: "Clinical",
        links: [
            { name: "OT Logs", href: "/dashboard/reports/ot-logs", icon: Activity },
            { name: "Doctor Payouts", href: "/dashboard/reports/doctor-payouts", icon: HeartPulse },
        ]
    },
    {
        title: "Profit & Loss",
        links: [
            { name: "Medicine P&L", href: "/dashboard/reports/medicine-pnl", icon: Pill },
            { name: "Hospital P&L", href: "/dashboard/reports/hospital-pnl", icon: Building2 },
            { name: "Combined P&L", href: "/dashboard/reports/combined-pnl", icon: Layers },
        ]
    },
    {
        title: "GST Returns",
        links: [
            { name: "GSTR-1", href: "/dashboard/reports/gstr-1", icon: FileSpreadsheet },
            { name: "GSTR-1A", href: "/dashboard/reports/gstr-1a", icon: FileSpreadsheet },
            { name: "GSTR-2B", href: "/dashboard/reports/gstr-2b", icon: FileSpreadsheet },
            { name: "GSTR-3B", href: "/dashboard/reports/gstr-3b", icon: FileSpreadsheet },
            { name: "GSTR-9", href: "/dashboard/reports/gstr-9", icon: FileSpreadsheet },
        ]
    }
]

export function ReportsSidebar() {
    const pathname = usePathname()

    return (
        <div className="w-64 bg-white border-r border-slate-200 flex flex-col h-full overflow-y-auto shrink-0 shadow-sm">
            <div className="p-5 border-b border-slate-100">
                <h2 className="text-lg font-bold text-slate-800 tracking-tight">Report Explorer</h2>
                <p className="text-xs text-slate-500 mt-1">Financial & Operational Analytics</p>
            </div>

            <nav className="flex-1 p-4 space-y-8">
                {REPORT_CATEGORIES.map((category) => (
                    <div key={category.title}>
                        <h3 className="px-3 text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">
                            {category.title}
                        </h3>
                        <div className="space-y-1">
                            {category.links.map((link) => {
                                const isActive = pathname === link.href || pathname.startsWith(`${link.href}/`)
                                return (
                                    <Link
                                        key={link.name}
                                        href={link.href}
                                        className={`flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors ${isActive
                                            ? "bg-blue-50 text-blue-700 font-medium border border-blue-100"
                                            : "text-slate-600 hover:bg-slate-50 hover:text-slate-900 border border-transparent"
                                            }`}
                                    >
                                        <link.icon className={`w-4 h-4 ${isActive ? "text-blue-600" : "text-slate-400"}`} />
                                        {link.name}
                                    </Link>
                                )
                            })}
                        </div>
                    </div>
                ))}
            </nav>
        </div>
    )
}
