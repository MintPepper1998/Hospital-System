import { requireAuth } from "@/lib/auth-guard"
import { HospitalPnlClient } from "../hospital-pnl/hospital-pnl-client"
import { generatePnlReport } from "@/app/actions/financial-reports"
import { format } from "date-fns"

function fmt(n: number) {
    return "₹" + n.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

export default async function MedicinePnlPage({
    searchParams,
}: {
    searchParams: Promise<{ from?: string; to?: string }>
}) {
    await requireAuth(["SUPER_ADMIN", "ACCOUNTANT", "PHARMACIST"])

    const params = await searchParams
    const todayIst = new Date(new Date().toLocaleString("en-US", { timeZone: "Asia/Kolkata" }))
    const firstDayIst = new Date(todayIst.getFullYear(), todayIst.getMonth(), 1)
    const fromStr = params.from || format(firstDayIst, "yyyy-MM-dd")
    const toStr = params.to || format(todayIst, "yyyy-MM-dd")

    // Use the P&L engine with PHARMACY scope
    const result = await generatePnlReport({ from: fromStr, to: toStr, scope: "PHARMACY" })
    const report = result.data

    const totalRevenue = report?.revenue.total ?? 0
    const totalCOGS = report?.directExpenses.total ?? 0
    const grossProfit = report?.grossProfit ?? 0
    const totalOpEx = report?.indirectExpenses.total ?? 0
    const netPnl = report?.netProfit ?? 0
    const isProfit = netPnl >= 0
    const grossMargin = report?.ratios.grossMargin ?? 0
    const netMargin = report?.ratios.netMargin ?? 0

    const revenueItems = report?.revenue.items ?? []
    const cogsItems = report?.directExpenses.items ?? []
    const opExItems = report?.indirectExpenses.items ?? []

    return (
        <div className="p-6 md:p-8 max-w-6xl mx-auto space-y-6 min-h-screen bg-gray-50">

            {/* Header */}
            <div>
                <h1 className="text-2xl font-bold text-gray-900">Medicine / Pharmacy P&L</h1>
                <p className="text-gray-500 text-sm mt-1">
                    Pharmacy-scoped financial summary — sales, COGS, and operating margins
                </p>
            </div>

            {/* Date Filter — reuse the hospital P&L client component */}
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
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
                    <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Pharmacy Revenue</p>
                    <p className="text-2xl font-bold text-blue-600">{fmt(totalRevenue)}</p>
                </div>
                <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
                    <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Cost of Goods</p>
                    <p className="text-2xl font-bold text-orange-500">{fmt(totalCOGS)}</p>
                </div>
                <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
                    <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Gross Profit</p>
                    <p className={`text-2xl font-bold ${grossProfit >= 0 ? "text-emerald-600" : "text-red-600"}`}>{fmt(grossProfit)}</p>
                    <p className="text-xs text-gray-400 mt-1">Margin: {grossMargin.toFixed(1)}%</p>
                </div>
                <div className={`rounded-xl border p-6 shadow-sm ${isProfit ? "bg-emerald-600 border-emerald-500" : "bg-red-600 border-red-500"}`}>
                    <p className="text-xs font-semibold text-white/70 uppercase tracking-wider mb-2">Net {isProfit ? "Profit" : "Loss"}</p>
                    <p className="text-2xl font-bold text-white">{fmt(Math.abs(netPnl))}</p>
                    <p className="text-xs text-white/70 mt-1">Margin: {netMargin.toFixed(1)}%</p>
                </div>
            </div>

            {/* ── INCOME STATEMENT TABLE ────────────────────────────────── */}
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-100 bg-gray-50">
                    <h2 className="font-semibold text-gray-800">Pharmacy Income Statement</h2>
                </div>
                <div className="p-6">

                    {/* REVENUE */}
                    <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">Revenue</p>
                    <div className="space-y-1 mb-4">
                        {revenueItems.length === 0 && (
                            <p className="text-sm text-gray-400 pl-4 py-2">No revenue recorded in this period</p>
                        )}
                        {revenueItems.map(item => (
                            <div key={item.code} className="flex justify-between items-center py-2 px-4 rounded hover:bg-gray-50">
                                <div className="flex items-center gap-3">
                                    <span className="text-[10px] font-mono text-gray-400 w-10">{item.code}</span>
                                    <span className="text-sm text-gray-700">{item.name}</span>
                                </div>
                                <span className="text-sm font-semibold text-gray-800 tabular-nums">{fmt(item.amount)}</span>
                            </div>
                        ))}
                    </div>
                    <div className="flex justify-between py-3 px-4 bg-blue-50 rounded-lg border border-blue-100 mb-6">
                        <span className="text-sm font-bold text-blue-800">TOTAL REVENUE</span>
                        <span className="text-sm font-bold text-blue-800 tabular-nums">{fmt(totalRevenue)}</span>
                    </div>

                    {/* COGS */}
                    <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">Cost of Goods Sold</p>
                    <div className="space-y-1 mb-4">
                        {cogsItems.length === 0 && (
                            <p className="text-sm text-gray-400 pl-4 py-2">No COGS recorded in this period</p>
                        )}
                        {cogsItems.map(item => (
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
                        <span className="text-sm font-bold text-amber-800">TOTAL COGS</span>
                        <span className="text-sm font-bold text-amber-800 tabular-nums">{fmt(totalCOGS)}</span>
                    </div>
                    <div className={`flex justify-between py-3 px-4 rounded-lg border mb-6 ${grossProfit >= 0 ? "bg-emerald-50 border-emerald-100" : "bg-red-50 border-red-100"}`}>
                        <span className={`text-sm font-bold ${grossProfit >= 0 ? "text-emerald-800" : "text-red-800"}`}>GROSS PROFIT</span>
                        <span className={`text-sm font-bold tabular-nums ${grossProfit >= 0 ? "text-emerald-800" : "text-red-800"}`}>{fmt(grossProfit)}</span>
                    </div>

                    {/* OPERATING EXPENSES */}
                    {opExItems.length > 0 && (
                        <>
                            <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">Operating Expenses</p>
                            <div className="space-y-1 mb-4">
                                {opExItems.map(item => (
                                    <div key={item.code} className="flex justify-between items-center py-2 px-4 rounded hover:bg-gray-50">
                                        <div className="flex items-center gap-3">
                                            <span className="text-[10px] font-mono text-gray-400 w-10">{item.code}</span>
                                            <span className="text-sm text-gray-700">{item.name}</span>
                                        </div>
                                        <span className="text-sm font-semibold text-gray-800 tabular-nums">{fmt(item.amount)}</span>
                                    </div>
                                ))}
                            </div>
                            <div className="flex justify-between py-3 px-4 bg-orange-50 rounded-lg border border-orange-100 mb-4">
                                <span className="text-sm font-bold text-orange-800">TOTAL OPERATING EXPENSES</span>
                                <span className="text-sm font-bold text-orange-800 tabular-nums">{fmt(totalOpEx)}</span>
                            </div>
                        </>
                    )}

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

            {/* ── QUICK RATIOS ─────────────────────────────────────────── */}
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm text-center">
                    <p className="text-xs text-gray-400 uppercase tracking-wider font-medium mb-1">Net Margin</p>
                    <p className={`text-2xl font-bold ${isProfit ? "text-emerald-600" : "text-red-600"}`}>
                        {netMargin.toFixed(1)}%
                    </p>
                </div>
                <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm text-center">
                    <p className="text-xs text-gray-400 uppercase tracking-wider font-medium mb-1">Gross Margin</p>
                    <p className="text-2xl font-bold text-blue-600">
                        {grossMargin.toFixed(1)}%
                    </p>
                </div>
                <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm text-center">
                    <p className="text-xs text-gray-400 uppercase tracking-wider font-medium mb-1">COGS Ratio</p>
                    <p className="text-2xl font-bold text-gray-700">
                        {totalRevenue > 0 ? ((totalCOGS / totalRevenue) * 100).toFixed(1) : "0.0"}%
                    </p>
                </div>
            </div>

        </div>
    )
}
