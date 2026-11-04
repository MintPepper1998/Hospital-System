import { requireAuth } from "@/lib/auth-guard"
import { HospitalPnlClient } from "../hospital-pnl/hospital-pnl-client"
import { generatePnlReport } from "@/app/actions/financial-reports"
import { format } from "date-fns"

function fmt(n: number) {
    return "₹" + n.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

export default async function CombinedPnlPage({
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

    // Fetch all three scopes
    const [hospitalResult, pharmacyResult, combinedResult] = await Promise.all([
        generatePnlReport({ from: fromStr, to: toStr, scope: "HOSPITAL" }),
        generatePnlReport({ from: fromStr, to: toStr, scope: "PHARMACY" }),
        generatePnlReport({ from: fromStr, to: toStr, scope: "COMBINED" }),
    ])

    const h = hospitalResult.data
    const p = pharmacyResult.data
    const c = combinedResult.data

    // Scope summaries
    const scopes = [
        {
            label: "Hospital",
            color: "blue",
            revenue: h?.revenue.total ?? 0,
            cogs: h?.directExpenses.total ?? 0,
            grossProfit: h?.grossProfit ?? 0,
            opex: h?.indirectExpenses.total ?? 0,
            netProfit: h?.netProfit ?? 0,
            grossMargin: h?.ratios.grossMargin ?? 0,
            netMargin: h?.ratios.netMargin ?? 0,
        },
        {
            label: "Pharmacy",
            color: "purple",
            revenue: p?.revenue.total ?? 0,
            cogs: p?.directExpenses.total ?? 0,
            grossProfit: p?.grossProfit ?? 0,
            opex: p?.indirectExpenses.total ?? 0,
            netProfit: p?.netProfit ?? 0,
            grossMargin: p?.ratios.grossMargin ?? 0,
            netMargin: p?.ratios.netMargin ?? 0,
            closingStock: p?.inventorySnapshot?.closingStockValue ?? 0,
        },
        {
            label: "Combined",
            color: "emerald",
            revenue: c?.revenue.total ?? 0,
            cogs: c?.directExpenses.total ?? 0,
            grossProfit: c?.grossProfit ?? 0,
            opex: c?.indirectExpenses.total ?? 0,
            netProfit: c?.netProfit ?? 0,
            grossMargin: c?.ratios.grossMargin ?? 0,
            netMargin: c?.ratios.netMargin ?? 0,
            closingStock: c?.inventorySnapshot?.closingStockValue ?? 0,
        },
    ]

    const combinedNetProfit = c?.netProfit ?? 0
    const isProfit = combinedNetProfit >= 0

    return (
        <div className="p-6 md:p-8 max-w-7xl mx-auto space-y-6 min-h-screen bg-gray-50">

            {/* Header */}
            <div>
                <h1 className="text-2xl font-bold text-gray-900">Combined P&L</h1>
                <p className="text-gray-500 text-sm mt-1">
                    Consolidated view — Hospital + Pharmacy with side-by-side comparison
                </p>
            </div>

            {/* Date Filter */}
            <HospitalPnlClient initialFrom={new Date(fromStr)} initialTo={new Date(toStr)} />

            <p className="text-xs text-gray-400">
                Period: {c?.period.label ?? `${fromStr} — ${toStr}`}
            </p>

            {!combinedResult.success && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-sm text-red-700">
                    Report generation failed: {combinedResult.message}
                </div>
            )}

            {/* ── COMBINED NET PROFIT BANNER ──────────────────────────── */}
            <div className={`rounded-xl border-2 p-6 shadow-sm ${isProfit ? "bg-emerald-600 border-emerald-500" : "bg-red-600 border-red-500"}`}>
                <div className="flex items-center justify-between">
                    <div>
                        <p className="text-xs font-semibold text-white/70 uppercase tracking-wider mb-1">
                            Combined Net {isProfit ? "Profit" : "Loss"}
                        </p>
                        <p className="text-3xl font-bold text-white">{fmt(Math.abs(combinedNetProfit))}</p>
                    </div>
                    <div className="text-right">
                        <p className="text-xs text-white/60 uppercase tracking-wider mb-1">Net Margin</p>
                        <p className="text-2xl font-bold text-white">
                            {(c?.ratios.netMargin ?? 0).toFixed(1)}%
                        </p>
                    </div>
                </div>
            </div>

            {/* ── SIDE-BY-SIDE COMPARISON TABLE ─────────────────────── */}
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-100 bg-gray-50">
                    <h2 className="font-semibold text-gray-800">Side-by-Side Comparison</h2>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="border-b border-gray-100">
                                <th className="text-left px-6 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">Line Item</th>
                                <th className="text-right px-6 py-3 text-xs font-semibold text-blue-500 uppercase tracking-wider">Hospital</th>
                                <th className="text-right px-6 py-3 text-xs font-semibold text-purple-500 uppercase tracking-wider">Pharmacy</th>
                                <th className="text-right px-6 py-3 text-xs font-semibold text-emerald-600 uppercase tracking-wider">Combined</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                            {/* Revenue */}
                            <tr className="bg-blue-50/30">
                                <td className="px-6 py-3 font-semibold text-gray-700">Revenue</td>
                                <td className="px-6 py-3 text-right font-semibold text-blue-700 tabular-nums">{fmt(scopes[0].revenue)}</td>
                                <td className="px-6 py-3 text-right font-semibold text-purple-700 tabular-nums">{fmt(scopes[1].revenue)}</td>
                                <td className="px-6 py-3 text-right font-bold text-emerald-700 tabular-nums">{fmt(scopes[2].revenue)}</td>
                            </tr>

                            {/* Revenue line items */}
                            {(c?.revenue.items ?? []).map(item => (
                                <tr key={item.code} className="hover:bg-gray-50">
                                    <td className="px-6 py-2 pl-10 text-gray-500">
                                        <span className="text-[10px] font-mono text-gray-400 mr-2">{item.code}</span>
                                        {item.name}
                                    </td>
                                    <td className="px-6 py-2 text-right text-gray-600 tabular-nums">
                                        {fmt(h?.revenue.items.find(i => i.code === item.code)?.amount ?? 0)}
                                    </td>
                                    <td className="px-6 py-2 text-right text-gray-600 tabular-nums">
                                        {fmt(p?.revenue.items.find(i => i.code === item.code)?.amount ?? 0)}
                                    </td>
                                    <td className="px-6 py-2 text-right font-medium text-gray-700 tabular-nums">{fmt(item.amount)}</td>
                                </tr>
                            ))}

                            {/* COGS */}
                            <tr className="bg-amber-50/30">
                                <td className="px-6 py-3 font-semibold text-gray-700">Direct Expenses / COGS</td>
                                <td className="px-6 py-3 text-right font-semibold text-blue-700 tabular-nums">{fmt(scopes[0].cogs)}</td>
                                <td className="px-6 py-3 text-right font-semibold text-purple-700 tabular-nums">{fmt(scopes[1].cogs)}</td>
                                <td className="px-6 py-3 text-right font-bold text-emerald-700 tabular-nums">{fmt(scopes[2].cogs)}</td>
                            </tr>

                            {/* COGS line items */}
                            {(c?.directExpenses.items ?? []).map(item => (
                                <tr key={item.code} className="hover:bg-gray-50">
                                    <td className={`px-6 py-2 pl-10 ${item.amount < 0 ? "text-emerald-600 italic" : "text-gray-500"}`}>
                                        <span className="text-[10px] font-mono text-gray-400 mr-2">{item.code}</span>
                                        {item.name}
                                    </td>
                                    <td className="px-6 py-2 text-right text-gray-600 tabular-nums">
                                        {fmt(h?.directExpenses.items.find(i => i.code === item.code)?.amount ?? 0)}
                                    </td>
                                    <td className="px-6 py-2 text-right text-gray-600 tabular-nums">
                                        {fmt(p?.directExpenses.items.find(i => i.code === item.code)?.amount ?? 0)}
                                    </td>
                                    <td className={`px-6 py-2 text-right font-medium tabular-nums ${item.amount < 0 ? "text-emerald-600" : "text-gray-700"}`}>
                                        {item.amount < 0 ? `(${fmt(Math.abs(item.amount))})` : fmt(item.amount)}
                                    </td>
                                </tr>
                            ))}

                            {/* Gross Profit */}
                            <tr className="border-t-2 border-gray-200 bg-emerald-50/50">
                                <td className="px-6 py-3 font-bold text-gray-800">Gross Profit</td>
                                <td className={`px-6 py-3 text-right font-bold tabular-nums ${scopes[0].grossProfit >= 0 ? "text-emerald-700" : "text-red-700"}`}>
                                    {fmt(scopes[0].grossProfit)}
                                </td>
                                <td className={`px-6 py-3 text-right font-bold tabular-nums ${scopes[1].grossProfit >= 0 ? "text-emerald-700" : "text-red-700"}`}>
                                    {fmt(scopes[1].grossProfit)}
                                </td>
                                <td className={`px-6 py-3 text-right font-bold tabular-nums ${scopes[2].grossProfit >= 0 ? "text-emerald-700" : "text-red-700"}`}>
                                    {fmt(scopes[2].grossProfit)}
                                </td>
                            </tr>

                            {/* OpEx */}
                            <tr className="bg-orange-50/30">
                                <td className="px-6 py-3 font-semibold text-gray-700">Operating Expenses</td>
                                <td className="px-6 py-3 text-right font-semibold text-blue-700 tabular-nums">{fmt(scopes[0].opex)}</td>
                                <td className="px-6 py-3 text-right font-semibold text-purple-700 tabular-nums">{fmt(scopes[1].opex)}</td>
                                <td className="px-6 py-3 text-right font-bold text-emerald-700 tabular-nums">{fmt(scopes[2].opex)}</td>
                            </tr>

                            {/* OpEx line items */}
                            {(c?.indirectExpenses.items ?? []).map(item => (
                                <tr key={item.code} className="hover:bg-gray-50">
                                    <td className="px-6 py-2 pl-10 text-gray-500">
                                        <span className="text-[10px] font-mono text-gray-400 mr-2">{item.code}</span>
                                        {item.name}
                                    </td>
                                    <td className="px-6 py-2 text-right text-gray-600 tabular-nums">
                                        {fmt(h?.indirectExpenses.items.find(i => i.code === item.code)?.amount ?? 0)}
                                    </td>
                                    <td className="px-6 py-2 text-right text-gray-600 tabular-nums">
                                        {fmt(p?.indirectExpenses.items.find(i => i.code === item.code)?.amount ?? 0)}
                                    </td>
                                    <td className="px-6 py-2 text-right font-medium text-gray-700 tabular-nums">{fmt(item.amount)}</td>
                                </tr>
                            ))}

                            {/* Net Profit */}
                            <tr className={`border-t-2 border-gray-300 ${isProfit ? "bg-emerald-50" : "bg-red-50"}`}>
                                <td className={`px-6 py-4 font-bold text-base ${isProfit ? "text-emerald-800" : "text-red-800"}`}>
                                    Net {isProfit ? "Profit" : "Loss"}
                                </td>
                                <td className={`px-6 py-4 text-right font-bold tabular-nums ${scopes[0].netProfit >= 0 ? "text-emerald-700" : "text-red-700"}`}>
                                    {fmt(scopes[0].netProfit)}
                                </td>
                                <td className={`px-6 py-4 text-right font-bold tabular-nums ${scopes[1].netProfit >= 0 ? "text-emerald-700" : "text-red-700"}`}>
                                    {fmt(scopes[1].netProfit)}
                                </td>
                                <td className={`px-6 py-4 text-right font-bold text-base tabular-nums ${isProfit ? "text-emerald-800" : "text-red-800"}`}>
                                    {fmt(scopes[2].netProfit)}
                                </td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </div>

            {/* ── MARGIN COMPARISON ──────────────────────────────────── */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {scopes.map(s => {
                    const isP = s.netProfit >= 0
                    const bgColor = s.color === "blue" ? "bg-blue-50 border-blue-100"
                        : s.color === "purple" ? "bg-purple-50 border-purple-100"
                            : "bg-emerald-50 border-emerald-100"
                    const textColor = s.color === "blue" ? "text-blue-600"
                        : s.color === "purple" ? "text-purple-600"
                            : "text-emerald-600"

                    return (
                        <div key={s.label} className={`rounded-xl border p-5 shadow-sm ${bgColor}`}>
                            <p className={`text-xs font-semibold uppercase tracking-wider mb-3 ${textColor}`}>{s.label}</p>
                            <div className="space-y-2">
                                <div className="flex justify-between">
                                    <span className="text-xs text-gray-500">Revenue</span>
                                    <span className="text-sm font-semibold text-gray-800 tabular-nums">{fmt(s.revenue)}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-xs text-gray-500">Gross Margin</span>
                                    <span className="text-sm font-semibold text-gray-800">{s.grossMargin.toFixed(1)}%</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-xs text-gray-500">Net Margin</span>
                                    <span className={`text-sm font-bold ${isP ? "text-emerald-600" : "text-red-600"}`}>
                                        {s.netMargin.toFixed(1)}%
                                    </span>
                                </div>
                                <div className="flex justify-between pt-2 border-t border-gray-200">
                                    <span className="text-xs text-gray-500 font-medium">Net {isP ? "Profit" : "Loss"}</span>
                                    <span className={`text-sm font-bold ${isP ? "text-emerald-600" : "text-red-600"}`}>
                                        {fmt(Math.abs(s.netProfit))}
                                    </span>
                                </div>
                            </div>
                        </div>
                    )
                })}
            </div>

            {/* Closing Stock note */}
            {(c?.inventorySnapshot?.closingStockValue ?? 0) > 0 && (
                <div className="bg-indigo-50 border border-indigo-100 rounded-lg px-4 py-3 text-xs text-indigo-700">
                    📦 <strong>Closing Stock Value:</strong> {fmt(c!.inventorySnapshot!.closingStockValue)} — deducted from COGS per standard inventory-based costing (COGS = Purchases + Write-offs − Closing Stock)
                </div>
            )}

        </div>
    )
}
