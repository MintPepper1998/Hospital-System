"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import {
    LayoutDashboard,
    BookOpen,
    FileText,
    PenLine,
    Receipt,
    Search,
    CreditCard,
    ShieldCheck,
    Landmark,
    Building2,
    HandCoins,
    Users,
    Wallet,
    BanknoteIcon,
    ArrowLeftRight,
    ClipboardList,
    Calculator,
    BarChart3,
    PieChart,
    TrendingUp,
    Settings,
    CalendarRange,
    BadgeIndianRupee,
    FilePen,
    CalendarCheck2
} from "lucide-react"

const FINANCE_SECTIONS = [
    {
        title: "Overview",
        links: [
            { name: "Dashboard", href: "/dashboard/master-finance", icon: LayoutDashboard },
        ]
    },
    {
        title: "Core Accounting",
        links: [
            { name: "Chart of Accounts", href: "/dashboard/master-finance/chart-of-accounts", icon: BookOpen },
            { name: "General Ledger", href: "/dashboard/master-finance/general-ledger", icon: FileText },
            { name: "Day Book", href: "/dashboard/master-finance/day-book", icon: ClipboardList },
            { name: "Day Close", href: "/dashboard/master-finance/day-close", icon: CalendarCheck2 },
            { name: "Voucher Entry", href: "/dashboard/master-finance/vouchers", icon: PenLine },
        ]
    },
    {
        title: "Revenue & Billing",
        links: [
            { name: "Billing Dashboard", href: "/dashboard/master-finance/billing", icon: Receipt },
            { name: "Invoice Search", href: "/dashboard/master-finance/invoices", icon: Search },
            { name: "Payment Collection", href: "/dashboard/master-finance/collections", icon: HandCoins },
            { name: "Refunds", href: "/dashboard/master-finance/refunds", icon: ArrowLeftRight },
            { name: "Revenue Analysis", href: "/dashboard/master-finance/revenue-analysis", icon: TrendingUp },
        ]
    },
    {
        title: "Credit & Receivables",
        links: [
            { name: "Patient Dues", href: "/dashboard/master-finance/receivables/patient-dues", icon: CreditCard },
            { name: "Insurance Claims", href: "/dashboard/master-finance/receivables/insurance", icon: ShieldCheck },
            { name: "Govt Claims", href: "/dashboard/master-finance/receivables/govt-claims", icon: Landmark },
            { name: "AR Aging", href: "/dashboard/master-finance/receivables/aging", icon: BarChart3 },
        ]
    },
    {
        title: "Purchases & Payables",
        links: [
            { name: "Purchase Invoices", href: "/dashboard/master-finance/payables/invoices", icon: FilePen },
            { name: "Purchase Returns", href: "/dashboard/master-finance/payables/returns", icon: ArrowLeftRight },
            { name: "Supplier Directory", href: "/dashboard/master-finance/payables/suppliers", icon: Building2 },
            { name: "Supplier Payments", href: "/dashboard/master-finance/payables/payments", icon: BanknoteIcon },
            { name: "AP Aging", href: "/dashboard/master-finance/payables/aging", icon: BarChart3 },
        ]
    },
    {
        title: "Cash & Bank",
        links: [
            { name: "Accounts", href: "/dashboard/master-finance/cash-bank/accounts", icon: Landmark },
            { name: "Day Close", href: "/dashboard/master-finance/day-close", icon: CalendarCheck2 },
            { name: "Cash Book", href: "/dashboard/master-finance/cash-bank/cash-book", icon: Wallet },
            { name: "Bank Book", href: "/dashboard/master-finance/cash-bank/bank-book", icon: BanknoteIcon },
            { name: "Bank Reconciliation", href: "/dashboard/master-finance/cash-bank/reconciliation", icon: ArrowLeftRight },
            { name: "Petty Cash", href: "/dashboard/master-finance/cash-bank/petty-cash", icon: BadgeIndianRupee },
        ]
    },
    {
        title: "Payroll",
        links: [
            { name: "Salary Processing", href: "/dashboard/master-finance/payroll", icon: Users },
            { name: "Payroll Journal", href: "/dashboard/master-finance/payroll/journal", icon: FileText },
        ]
    },
    {
        title: "Financial Statements",
        links: [
            { name: "Profit & Loss", href: "/dashboard/master-finance/statements/pnl", icon: TrendingUp },
            { name: "Trial Balance", href: "/dashboard/master-finance/statements/trial-balance", icon: Calculator },
            { name: "Balance Sheet", href: "/dashboard/master-finance/statements/balance-sheet", icon: PieChart },
            { name: "Cash Flow", href: "/dashboard/master-finance/statements/cash-flow", icon: ArrowLeftRight },
        ]
    },
    {
        title: "Budgeting & Cost Centers",
        links: [
            { name: "Cost Centers", href: "/dashboard/master-finance/budgeting/cost-centers", icon: Building2 },
            { name: "Budget Planning", href: "/dashboard/master-finance/budgeting/planning", icon: Calculator },
            { name: "Allocations", href: "/dashboard/master-finance/budgeting/allocations", icon: PieChart },
            { name: "Variance Analysis", href: "/dashboard/master-finance/budgeting/variance", icon: ArrowLeftRight },
            { name: "Dept P&L", href: "/dashboard/master-finance/budgeting/dept-pnl", icon: TrendingUp },
        ]
    },
    {
        title: "Expense Approvals",
        links: [
            { name: "Raise Expense", href: "/dashboard/master-finance/expenses/raise", icon: PenLine },
            { name: "Pending Approvals", href: "/dashboard/master-finance/expenses/approvals", icon: ShieldCheck },
            { name: "Expense Register", href: "/dashboard/master-finance/expenses/register", icon: FileText },
            { name: "Approval Policies", href: "/dashboard/master-finance/expenses/policy", icon: Settings },
        ]
    },
    {
        title: "Financial Analytics",
        links: [
            { name: "Financial KPIs", href: "/dashboard/master-finance/analytics/kpis", icon: BarChart3 },
            { name: "Revenue Leakage", href: "/dashboard/master-finance/analytics/leakage", icon: Search },
            { name: "Doctor Revenue", href: "/dashboard/master-finance/analytics/doctor-revenue", icon: Users },
            { name: "Revenue Trends", href: "/dashboard/master-finance/analytics/trends", icon: TrendingUp },
        ]
    },
    {
        title: "Tax & Compliance",
        links: [
            { name: "GST Dashboard", href: "/dashboard/master-finance/tax/gst", icon: Calculator },
            { name: "Tally Export", href: "/dashboard/master-finance/tax/tally-export", icon: FileText },
        ]
    },
    {
        title: "Settings",
        links: [
            { name: "Fiscal Year", href: "/dashboard/master-finance/settings/fiscal-year", icon: CalendarRange },
            { name: "Opening Balances", href: "/dashboard/master-finance/settings/opening-balances", icon: Settings },
        ]
    },
]

export function MasterFinanceSidebar() {
    const pathname = usePathname()

    return (
        <div className="w-64 bg-white border-r border-slate-200 flex flex-col h-full overflow-y-auto shrink-0 shadow-sm">
            <div className="p-5 border-b border-slate-100">
                <h2 className="text-lg font-bold text-slate-800 tracking-tight">Master Finance</h2>
                <p className="text-xs text-slate-500 mt-1">Complete Financial Management</p>
            </div>

            <nav className="flex-1 p-3 space-y-6">
                {FINANCE_SECTIONS.map((section) => (
                    <div key={section.title}>
                        <h3 className="px-3 text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-2">
                            {section.title}
                        </h3>
                        <div className="space-y-0.5">
                            {section.links.map((link) => {
                                const isActive = pathname === link.href || pathname.startsWith(`${link.href}/`)
                                return (
                                    <Link
                                        key={link.name}
                                        href={link.href}
                                        className={`flex items-center gap-2.5 px-3 py-1.5 rounded-md text-[13px] transition-colors ${isActive
                                            ? "bg-blue-50 text-blue-700 font-medium border border-blue-100"
                                            : "text-slate-600 hover:bg-slate-50 hover:text-slate-900 border border-transparent"
                                            }`}
                                    >
                                        <link.icon className={`w-3.5 h-3.5 ${isActive ? "text-blue-600" : "text-slate-400"}`} />
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
