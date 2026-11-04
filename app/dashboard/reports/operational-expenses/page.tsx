import { prisma } from "@/lib/prisma"
import { requireAuth } from "@/lib/auth-guard"
import { ExpensesClient } from "./expenses-client"
import { format } from "date-fns"
import { cn } from "@/lib/utils"

// Helper to strictly define IST midnight boundaries for a given date string
function getIstDayBoundaries(dateString: string, isEnd: boolean = false) {
    const [year, month, day] = dateString.split("-").map(Number)

    if (isEnd) {
        // 23:59:59.999 IST
        const endIstString = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}T23:59:59.999+05:30`
        return new Date(endIstString)
    } else {
        // 00:00:00.000 IST
        const startIstString = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}T00:00:00+05:30`
        return new Date(startIstString)
    }
}

export default async function OperationalExpensesPage({
    searchParams,
}: {
    searchParams: Promise<{ from?: string; to?: string }>
}) {
    await requireAuth(["SUPER_ADMIN", "ACCOUNTANT"])

    const params = await searchParams

    // Default to 1st of current month to Today in IST
    const todayIst = new Date(new Date().toLocaleString("en-US", { timeZone: "Asia/Kolkata" }))
    const firstDayIst = new Date(todayIst.getFullYear(), todayIst.getMonth(), 1)

    const fromStr = params.from || format(firstDayIst, "yyyy-MM-dd")
    const toStr = params.to || format(todayIst, "yyyy-MM-dd")

    const startDateIst = getIstDayBoundaries(fromStr, false)
    const endDateIst = getIstDayBoundaries(toStr, true)

    // Fetch EXPENSE transactions within date range
    const expenses = await prisma.transaction.findMany({
        where: {
            type: "EXPENSE",
            date: {
                gte: startDateIst,
                lte: endDateIst,
            },
            // Exclude obvious capital or internal movements if applicable based on schema mapping
            category: {
                notIn: ["CAPITAL", "EQUIPMENT", "INTERNAL_TRANSFER"]
            }
        },
        orderBy: {
            date: "desc", // Latest first
        },
    })

    // Calculate Summary Metrics
    let totalExpense = 0
    const categoryTotals: Record<string, number> = {}

    expenses.forEach(expense => {
        totalExpense += expense.amount

        const cat = expense.category || "Uncategorized"
        categoryTotals[cat] = (categoryTotals[cat] || 0) + expense.amount
    })

    // Top Expense Category
    let topCategoryName = "None"
    let topCategoryAmount = 0

    Object.entries(categoryTotals).forEach(([cat, amount]) => {
        if (amount > topCategoryAmount) {
            topCategoryAmount = amount
            topCategoryName = cat
        }
    })

    // Average Daily Expense
    // Calculate days in range
    const msInDay = 24 * 60 * 60 * 1000
    const daysDiff = Math.round(Math.abs((endDateIst.getTime() - startDateIst.getTime()) / msInDay))
    const daysInRange = Math.max(1, daysDiff) // Avoid division by zero
    const averageDailyExpense = totalExpense / daysInRange

    // Map for display
    const displayExpenses = expenses.map(e => ({
        id: e.id,
        date: e.date,
        category: e.category.replace(/_/g, " "), // Format enum-style strings
        description: e.description || "N/A",
        paymentMethod: e.paymentMethod,
        amount: e.amount,
        status: "PAID" // Transactions represent cash already moved
    }))

    return (
        <div className="p-6 md:p-8 max-w-7xl mx-auto space-y-8 bg-slate-50/50 min-h-[calc(100vh-4rem)]">

            {/* Client Date Filter Component */}
            <ExpensesClient
                initialFrom={new Date(fromStr)}
                initialTo={new Date(toStr)}
            />

            {/* THEMED KPI CARDS (Rose/Red Theme to signify Cash Outflow) */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">

                {/* Total Operational Expense (Red UI) */}
                <div className="bg-rose-50 rounded-xl border border-rose-200 p-6 shadow-sm relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-rose-100 rounded-full -mr-16 -mt-16 opacity-60" />
                    <p className="text-sm font-semibold text-rose-800 mb-1 relative z-10">Total Operational Expense</p>
                    <div className="flex items-baseline gap-2 relative z-10">
                        <p className="text-3xl font-bold text-rose-900">
                            ₹{totalExpense.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                        </p>
                    </div>
                    <p className="text-xs text-rose-700/80 mt-2 relative z-10">Total cash outflow in period</p>
                </div>

                {/* Top Expense Category */}
                <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-slate-50 rounded-full -mr-16 -mt-16 opacity-60" />
                    <p className="text-sm font-medium text-slate-500 mb-1 relative z-10">Top Expense Category</p>
                    <div className="flex items-baseline gap-2 relative z-10">
                        <p className="text-3xl font-bold text-slate-800 uppercase tracking-tight">
                            {topCategoryName}
                        </p>
                    </div>
                    <p className="text-xs text-slate-500 mt-2 relative z-10 font-bold">
                        ₹{topCategoryAmount.toLocaleString("en-IN", { minimumFractionDigits: 2 })} spent
                    </p>
                </div>

                {/* Average Daily Expense */}
                <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-slate-50 rounded-full -mr-16 -mt-16 opacity-60" />
                    <p className="text-sm font-medium text-slate-500 mb-1 relative z-10">Average Daily Expense</p>
                    <p className="text-3xl font-bold text-slate-800 relative z-10">
                        ₹{averageDailyExpense.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                    </p>
                    <p className="text-xs text-slate-500 mt-2 relative z-10">Across {daysInRange} selected days</p>
                </div>
            </div>

            {/* OPERATIONS LEDGER TABLE */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="p-4 border-b border-slate-200 bg-slate-50">
                    <h2 className="font-semibold text-slate-800">Expense Ledger</h2>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="text-xs text-slate-500 uppercase bg-slate-50/50 border-b border-slate-200">
                            <tr>
                                <th className="px-6 py-4 font-medium">Date (IST)</th>
                                <th className="px-6 py-4 font-medium">Category</th>
                                <th className="px-6 py-4 font-medium hidden sm:table-cell">Description / Vendor</th>
                                <th className="px-6 py-4 font-medium">Mode</th>
                                <th className="px-6 py-4 font-medium text-center">Status</th>
                                <th className="px-6 py-4 font-medium text-right">Amount</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {displayExpenses.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="px-6 py-12 text-center text-slate-500">
                                        No operational expenses recorded during this period.
                                    </td>
                                </tr>
                            ) : (
                                displayExpenses.map((expense) => {
                                    const timeIst = new Date(expense.date).toLocaleString("en-US", {
                                        timeZone: "Asia/Kolkata",
                                        month: "short",
                                        day: "numeric",
                                        year: "numeric"
                                    })

                                    return (
                                        <tr key={expense.id} className="hover:bg-slate-50/50 transition-colors">
                                            <td className="px-6 py-4 whitespace-nowrap text-slate-500">{timeIst}</td>
                                            <td className="px-6 py-4 font-bold text-slate-800 uppercase tracking-widest text-[11px]">
                                                {expense.category}
                                            </td>
                                            <td className="px-6 py-4 text-slate-500 hidden sm:table-cell">
                                                {expense.description}
                                            </td>
                                            <td className="px-6 py-4 text-slate-600 font-medium">
                                                {expense.paymentMethod}
                                            </td>
                                            <td className="px-6 py-4 text-center">
                                                <span className="inline-flex items-center px-2 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider bg-emerald-50 text-emerald-700 border border-emerald-200">
                                                    {expense.status}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-right font-bold text-rose-600 whitespace-nowrap">
                                                ₹{expense.amount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                                            </td>
                                        </tr>
                                    )
                                })
                            )}
                        </tbody>
                        {displayExpenses.length > 0 && (
                            <tfoot className="bg-slate-50/80 border-t border-slate-200 font-bold text-slate-800">
                                <tr>
                                    <td colSpan={5} className="px-6 py-4 text-right">Total Opex (Selected Period):</td>
                                    <td className="px-6 py-4 text-right text-rose-700">
                                        ₹{totalExpense.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                                    </td>
                                </tr>
                            </tfoot>
                        )}
                    </table>
                </div>
            </div>
        </div>
    )
}
