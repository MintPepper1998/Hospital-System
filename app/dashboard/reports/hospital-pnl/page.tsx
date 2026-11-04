import { requireAuth } from "@/lib/auth-guard"
import { HospitalPnlClient } from "./hospital-pnl-client"
import { generatePnlReport } from "@/app/actions/financial-reports"
import { format } from "date-fns"

function fmt(n: number) {
    return "₹" + n.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

export default async function HospitalPnlPage({
    searchParams,
}: {
    searchParams: Promise<{ from?: string; to?: string }>
}) {
    await requireAuth(["SUPER_ADMIN", "ACCOUNTANT"])

    const params = await searchParams
    const todayIst = new Date(new Date().toLocaleString("en-US", { timeZone: "Asia/Kolkata" }))
    const firstDayIst = new Date(todayIst.getFullYear(), todayIst.getMonth(), 1)
    const fromStr = params.from || format(firstDayIst, "yyyy-MM-dd")
    const toStr = params.to || format(todayIst, "yyyy-MM-dd")

    // Use the new P&L engine
    const result = await generatePnlReport({ from: fromStr, to: toStr, scope: "HOSPITAL" })
    const report = result.data

    // Fallback values if report generation failed
    const totalRevenue = report?.revenue.total ?? 0
    const totalDirectExp = report?.directExpenses.total ?? 0
    const totalIndirectExp = report?.indirectExpenses.total ?? 0
    const grossProfit = report?.grossProfit ?? 0
    const netPnl = report?.netProfit ?? 0
    const isProfit = netPnl >= 0
    const profitMargin = report?.ratios.netMargin ?? 0
    const grossMargin = report?.ratios.grossMargin ?? 0
    const salaryRatio = report?.ratios.salaryToRevenue ?? 0

    // Build department revenue bars
    const departments = (report?.departmentBreakdown ?? [])
        .filter(d => d.revenue > 0 && d.department !== "PHARMACY")
        .map((d, i) => {
            const colors = ["#3b82f6", "#6366f1", "#8b5cf6", "#a855f7", "#f59e0b", "#f97316", "#64748b", "#10b981"]
            return { label: formatDeptLabel(d.department), amount: d.revenue, color: colors[i % colors.length] }
        })

    // Revenue line items
    const revenueItems = report?.revenue.items ?? []
    // Expense line items (combined direct + indirect)
    const directExpItems = report?.directExpenses.items ?? []
    const indirectExpItems = report?.indirectExpenses.items ?? []

    const totalExpenses = totalDirectExp + totalIndirectExp

    return (
        <div className="p-6 md:p-8 max-w-6xl mx-auto space-y-6 min-h-screen bg-gray-50">

            {/* Header */}
            <div>
                <h1 className="text-2xl font-bold text-gray-900">Hospital Profit & Loss</h1>
                <p className="text-gray-500 text-sm mt-1">
                    Complete financial summary across all departments
                </p>
            </div>

            {/* Date Filter */}
            <HospitalPnlClient initialFrom={new Date(fromStr)} initialTo={new Date(toStr)} />

            <p className="text-xs text-gray-400">
                Period: {report?.period.label ?? `${fromStr} — ${toStr}`}
            </p>

            {!result.success && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-sm text-red-700">
                    Report generation failed: {result.message}
                </div>
            )}

            {/* ── TOP 3 KPI CARDS ─────────────────────────────────────── */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
                    <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Total Revenue</p>
                    <p className="text-3xl font-bold text-blue-600">{fmt(totalRevenue)}</p>
                    <p className="text-xs text-gray-400 mt-2">Gross Margin: {grossMargin.toFixed(1)}%</p>
                </div>
                <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
                    <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Total Expenses</p>
                    <p className="text-3xl font-bold text-orange-500">{fmt(totalExpenses)}</p>
                    <p className="text-xs text-gray-400 mt-2">Salary ratio: {salaryRatio.toFixed(1)}%</p>
                </div>
                <div className={`rounded-xl border p-6 shadow-sm ${isProfit ? "bg-emerald-600 border-emerald-500" : "bg-red-600 border-red-500"}`}>
                    <p className="text-xs font-semibold text-white/70 uppercase tracking-wider mb-2">Net {isProfit ? "Profit" : "Loss"}</p>
                    <p className="text-3xl font-bold text-white">{fmt(Math.abs(netPnl))}</p>
                    <p className="text-xs text-white/70 mt-2">Margin: {profitMargin.toFixed(1)}%</p>
                </div>
            </div>

            {/* ── INCOME STATEMENT TABLE ────────────────────────────────── */}
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-100 bg-gray-50">
                    <h2 className="font-semibold text-gray-800">Income Statement</h2>
                </div>
                <div className="p-6">

                    {/* REVENUE */}
                    <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">Revenue</p>
                    <div className="space-y-1 mb-4">
                        {revenueItems.length === 0 && (
                            <p className="text-sm text-gray-400 pl-4 py-2">No revenue recorded in this period</p>
                        )}
                        {revenueItems.map(item => (
                            <div key={item.code}>
                                <div className="flex justify-between items-center py-2 px-4 rounded hover:bg-gray-50">
                                    <div className="flex items-center gap-3">
                                        <span className="text-[10px] font-mono text-gray-400 w-10">{item.code}</span>
                                        <span className="text-sm text-gray-700">{item.name}</span>
                                    </div>
                                    <span className="text-sm font-semibold text-gray-800 tabular-nums">{fmt(item.amount)}</span>
                                </div>
                                {/* Children */}
                                {item.children.map(child => (
                                    <div key={child.code} className="flex justify-between items-center py-1.5 px-4 pl-14 text-xs text-gray-500">
                                        <div className="flex items-center gap-2">
                                            <span className="font-mono text-gray-300 w-10">{child.code}</span>
                                            <span>{child.name}</span>
                                        </div>
                                        <span className="font-semibold tabular-nums">{fmt(child.amount)}</span>
                                    </div>
                                ))}
                            </div>
                        ))}
                    </div>
                    <div className="flex justify-between py-3 px-4 bg-blue-50 rounded-lg border border-blue-100 mb-6">
                        <span className="text-sm font-bold text-blue-800">TOTAL REVENUE</span>
                        <span className="text-sm font-bold text-blue-800 tabular-nums">{fmt(totalRevenue)}</span>
                    </div>

                    {/* DIRECT EXPENSES (COGS) */}
                    {directExpItems.length > 0 && (
                        <>
                            <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">Cost of Revenue</p>
                            <div className="space-y-1 mb-4">
                                {directExpItems.map(item => (
                                    <div key={item.code} className="flex justify-between items-center py-2 px-4 rounded hover:bg-gray-50">
                                        <div className="flex items-center gap-3">
                                            <span className="text-[10px] font-mono text-gray-400 w-10">{item.code}</span>
                                            <span className="text-sm text-gray-700">{item.name}</span>
                                        </div>
                                        <span className="text-sm font-semibold text-gray-800 tabular-nums">{fmt(item.amount)}</span>
                                    </div>
                                ))}
                            </div>
                            <div className="flex justify-between py-3 px-4 bg-amber-50 rounded-lg border border-amber-100 mb-2">
                                <span className="text-sm font-bold text-amber-800">COST OF REVENUE</span>
                                <span className="text-sm font-bold text-amber-800 tabular-nums">{fmt(totalDirectExp)}</span>
                            </div>
                            <div className="flex justify-between py-3 px-4 bg-emerald-50/50 rounded-lg border border-emerald-100 mb-6">
                                <span className="text-sm font-bold text-emerald-800">GROSS PROFIT</span>
                                <span className="text-sm font-bold text-emerald-800 tabular-nums">{fmt(grossProfit)}</span>
                            </div>
                        </>
                    )}

                    {/* INDIRECT / OPERATING EXPENSES */}
                    <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">Operating Expenses</p>
                    <div className="space-y-1 mb-4">
                        {indirectExpItems.length === 0 && (
                            <p className="text-sm text-gray-400 pl-4 py-2">No operating expenses in this period</p>
                        )}
                        {indirectExpItems.map(item => (
                            <div key={item.code}>
                                <div className="flex justify-between items-center py-2 px-4 rounded hover:bg-gray-50">
                                    <div className="flex items-center gap-3">
                                        <span className="text-[10px] font-mono text-gray-400 w-10">{item.code}</span>
                                        <span className="text-sm text-gray-700">{item.name}</span>
                                    </div>
                                    <span className="text-sm font-semibold text-gray-800 tabular-nums">{fmt(item.amount)}</span>
                                </div>
                                {item.children.map(child => (
                                    <div key={child.code} className="flex justify-between items-center py-1.5 px-4 pl-14 text-xs text-gray-500">
                                        <div className="flex items-center gap-2">
                                            <span className="font-mono text-gray-300 w-10">{child.code}</span>
                                            <span>{child.name}</span>
                                        </div>
                                        <span className="font-semibold tabular-nums">{fmt(child.amount)}</span>
                                    </div>
                                ))}
                            </div>
                        ))}
                    </div>
                    <div className="flex justify-between py-3 px-4 bg-orange-50 rounded-lg border border-orange-100 mb-4">
                        <span className="text-sm font-bold text-orange-800">TOTAL OPERATING EXPENSES</span>
                        <span className="text-sm font-bold text-orange-800 tabular-nums">{fmt(totalIndirectExp)}</span>
                    </div>

                    {/* NET P&L */}
                    <div className={`flex justify-between py-4 px-4 rounded-lg border-2 ${isProfit ? "bg-emerald-50 border-emerald-200" : "bg-red-50 border-red-200"}`}>
                        <span className={`font-bold text-base ${isProfit ? "text-emerald-800" : "text-red-800"}`}>
                            NET {isProfit ? "PROFIT" : "LOSS"}
                        </span>
                        <span className={`font-bold text-base tabular-nums ${isProfit ? "text-emerald-800" : "text-red-800"}`}>
                            {netPnl < 0 ? "(" : ""}{fmt(Math.abs(netPnl))}{netPnl < 0 ? ")" : ""}
                        </span>
                    </div>
                </div>
            </div>

            {/* ── REVENUE BY DEPARTMENT (bars) ─────────────────────────── */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
                    <h2 className="font-semibold text-gray-800 mb-4">Revenue by Department</h2>
                    {departments.length === 0 ? (
                        <p className="text-sm text-gray-400 text-center py-8">No data</p>
                    ) : (
                        <div className="space-y-4">
                            {departments.map(d => {
                                const pct = totalRevenue > 0 ? (d.amount / totalRevenue) * 100 : 0
                                return (
                                    <div key={d.label}>
                                        <div className="flex justify-between text-sm mb-1">
                                            <span className="text-gray-700">{d.label}</span>
                                            <span className="font-semibold text-gray-800 tabular-nums">
                                                {fmt(d.amount)} <span className="text-gray-400 font-normal">({pct.toFixed(1)}%)</span>
                                            </span>
                                        </div>
                                        <div className="w-full bg-gray-100 h-2 rounded-full overflow-hidden">
                                            <div className="h-full rounded-full transition-all duration-500"
                                                style={{ width: `${pct}%`, backgroundColor: d.color }} />
                                        </div>
                                    </div>
                                )
                            })}
                        </div>
                    )}
                </div>

                <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
                    <h2 className="font-semibold text-gray-800 mb-4">Department Profitability</h2>
                    {(report?.departmentBreakdown ?? []).filter(d => d.department !== "PHARMACY").length === 0 ? (
                        <p className="text-sm text-gray-400 text-center py-8">No data</p>
                    ) : (
                        <div className="space-y-3">
                            {(report?.departmentBreakdown ?? [])
                                .filter(d => d.department !== "PHARMACY")
                                .map(d => (
                                    <div key={d.department} className="flex justify-between items-center py-2 px-3 rounded-lg bg-gray-50">
                                        <span className="text-sm text-gray-700 font-medium">{formatDeptLabel(d.department)}</span>
                                        <div className="flex items-center gap-4">
                                            <span className="text-xs text-gray-400">R: {fmt(d.revenue)}</span>
                                            <span className="text-xs text-gray-400">E: {fmt(d.expense)}</span>
                                            <span className={`text-sm font-bold tabular-nums ${d.profit >= 0 ? "text-emerald-600" : "text-red-600"}`}>
                                                {fmt(d.profit)}
                                            </span>
                                        </div>
                                    </div>
                                ))}
                        </div>
                    )}
                </div>
            </div>

            {/* ── QUICK RATIOS ─────────────────────────────────────────── */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm text-center">
                    <p className="text-xs text-gray-400 uppercase tracking-wider font-medium mb-1">Net Margin</p>
                    <p className={`text-2xl font-bold ${isProfit ? "text-emerald-600" : "text-red-600"}`}>
                        {profitMargin.toFixed(1)}%
                    </p>
                </div>
                <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm text-center">
                    <p className="text-xs text-gray-400 uppercase tracking-wider font-medium mb-1">Gross Margin</p>
                    <p className="text-2xl font-bold text-blue-600">
                        {grossMargin.toFixed(1)}%
                    </p>
                </div>
                <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm text-center">
                    <p className="text-xs text-gray-400 uppercase tracking-wider font-medium mb-1">Salary Ratio</p>
                    <p className="text-2xl font-bold text-gray-700">
                        {salaryRatio.toFixed(1)}%
                    </p>
                </div>
                <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm text-center">
                    <p className="text-xs text-gray-400 uppercase tracking-wider font-medium mb-1">OpEx Ratio</p>
                    <p className="text-2xl font-bold text-gray-700">
                        {(report?.ratios.operatingExpenseRatio ?? 0).toFixed(1)}%
                    </p>
                </div>
            </div>

        </div>
    )
}

function formatDeptLabel(dept: string): string {
    const labels: Record<string, string> = {
        OPD: "OPD Consultations",
        IPD: "IPD & Bed Charges",
        LABORATORY: "Laboratory & Diagnostics",
        OT: "Surgery / OT",
        CANTEEN: "Canteen",
        AMBULANCE: "Ambulance",
        CASUALTY: "Casualty / Emergency",
        EMERGENCY: "Emergency",
        PHARMACY: "Pharmacy",
    }
    return labels[dept] || dept
}
