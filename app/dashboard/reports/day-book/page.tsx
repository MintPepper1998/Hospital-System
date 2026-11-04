import { prisma } from "@/lib/prisma"
import { requireAuth } from "@/lib/auth-guard"
import { DayBookClient } from "./day-book-client"
import { format } from "date-fns"
import Link from "next/link"
import { toZonedTime, format as formatTz } from "date-fns-tz" // Need to install date-fns-tz if not present, but standard Date objects work if careful

// Since simple string manipulation is safer for timezone boundaries without extra deps:
function getIstDayBoundaries(dateString: string) {
    // Input: "YYYY-MM-DD" e.g., "2026-03-07"
    // Output: UTC Date objects representing midnight to midnight in IST (UTC+5:30)

    // Midnight IST is 18:30 UTC the previous day.
    // End of Day IST is 18:29:59.999 UTC the current day.

    const [year, month, day] = dateString.split("-").map(Number)

    // Create a Date object in IST timezone by appending +05:30
    // e.g. "2026-03-07T00:00:00+05:30"
    const startIstString = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}T00:00:00+05:30`
    const endIstString = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}T23:59:59.999+05:30`

    return {
        start: new Date(startIstString),
        end: new Date(endIstString)
    }
}

export default async function DayBookPage({
    searchParams,
}: {
    searchParams: Promise<{ date?: string }>
}) {
    await requireAuth(["SUPER_ADMIN", "ACCOUNTANT"])

    const params = await searchParams

    // Default to today in IST
    const todayIst = new Date(new Date().toLocaleString("en-US", { timeZone: "Asia/Kolkata" }))
    const dateStr = params.date || format(todayIst, "yyyy-MM-dd")
    const { start: startOfDayIst, end: endOfDayIst } = getIstDayBoundaries(dateStr)

    // Fetch all transactions for the selected day
    const transactions = await prisma.transaction.findMany({
        where: {
            date: {
                gte: startOfDayIst,
                lte: endOfDayIst,
            },
        },
        include: {
            account: true,
        },
        orderBy: {
            date: "asc",
        },
    })

    // Since prisma.transaction doesn't have a direct relation back to Patient/Bill easily defined in the schema for "Particulars", 
    // we will rely on the `description` and `referenceId` joined with manual fetch if needed, 
    // but let's fetch any associated Bills to enrich the description if referenceId is a bill.
    const billIds = transactions
        .filter(t => t.referenceId && t.category.includes("BILL")) // e.g. PATIENT_BILL
        .map(t => t.referenceId!)

    let bills: any[] = []
    if (billIds.length > 0) {
        bills = await prisma.billing.findMany({
            where: { id: { in: billIds } },
            include: { patient: { include: { user: true } } }
        })
    }

    // Calculate Metrics
    const totalInflow = transactions
        .filter((t) => t.type === "INCOME")
        .reduce((sum, t) => sum + t.amount, 0)

    const totalOutflow = transactions
        .filter((t) => t.type === "EXPENSE")
        .reduce((sum, t) => sum + t.amount, 0)

    const netBalance = totalInflow - totalOutflow

    return (
        <div className="p-6 md:p-8 max-w-7xl mx-auto space-y-8 bg-slate-50/50 min-h-[calc(100vh-4rem)]">
            <DayBookClient initialDate={startOfDayIst} />

            {/* KPI CARDS (Vyapar Style) */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-green-50 rounded-full -mr-16 -mt-16 opacity-50" />
                    <p className="text-sm font-medium text-slate-500 mb-1">Total Cash In</p>
                    <p className="text-3xl font-bold text-slate-800">
                        ₹{totalInflow.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                    </p>
                </div>

                <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-red-50 rounded-full -mr-16 -mt-16 opacity-50" />
                    <p className="text-sm font-medium text-slate-500 mb-1">Total Cash Out</p>
                    <p className="text-3xl font-bold text-slate-800">
                        ₹{totalOutflow.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                    </p>
                </div>

                <div className="bg-slate-900 rounded-xl border border-slate-800 p-6 shadow-md relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-slate-800 rounded-full -mr-16 -mt-16 opacity-50" />
                    <p className="text-sm font-medium text-slate-300 mb-1">Net Closing Balance</p>
                    <p className="text-3xl font-bold text-white">
                        ₹{netBalance.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                    </p>
                </div>
            </div>

            {/* LEDGER TABLE */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="p-4 border-b border-slate-200 bg-slate-50">
                    <h2 className="font-semibold text-slate-800">Transaction Ledger</h2>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="text-xs text-slate-500 uppercase bg-slate-50/50 border-b border-slate-200">
                            <tr>
                                <th className="px-6 py-4 font-medium">Time (IST)</th>
                                <th className="px-6 py-4 font-medium">Particulars</th>
                                <th className="px-6 py-4 font-medium hidden sm:table-cell">Ref No.</th>
                                <th className="px-6 py-4 font-medium">Mode</th>
                                <th className="px-6 py-4 font-medium text-right">Cash In</th>
                                <th className="px-6 py-4 font-medium text-right">Cash Out</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {transactions.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="px-6 py-12 text-center text-slate-500">
                                        No transactions recorded on this date.
                                    </td>
                                </tr>
                            ) : (
                                transactions.map((t) => {
                                    // Format time to IST
                                    const timeIst = new Date(t.date).toLocaleTimeString("en-US", {
                                        timeZone: "Asia/Kolkata",
                                        hour: "2-digit",
                                        minute: "2-digit"
                                    })

                                    // Enrich Particulars if it's a known bill
                                    let particulars = t.description || t.category
                                    const relatedBill = bills.find(b => b.id === t.referenceId)
                                    const patientDbId = relatedBill?.patientId || ""
                                    const patientName = relatedBill ? (relatedBill.patient.user.name || relatedBill.patient.patientId) : ""
                                    if (relatedBill) {
                                        particulars = `Bill: ${patientName} - ${t.category}`
                                    }

                                    return (
                                        <tr key={t.id} className="hover:bg-slate-50/50 transition-colors">
                                            <td className="px-6 py-4 whitespace-nowrap text-slate-500">{timeIst}</td>
                                            <td className="px-6 py-4 font-medium text-slate-800">
                                                {patientDbId ? (
                                                    <Link href={`/dashboard/finance/billing/patient/${patientDbId}`} className="text-blue-700 hover:text-blue-900 hover:underline">
                                                        {particulars}
                                                    </Link>
                                                ) : particulars}
                                            </td>
                                            <td className="px-6 py-4 text-slate-500 hidden sm:table-cell">
                                                {relatedBill ? relatedBill.billNumber : t.referenceId || "-"}
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-slate-100 text-slate-600">
                                                    {t.paymentMethod}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-right whitespace-nowrap font-medium text-green-600">
                                                {t.type === "INCOME" ? `₹${t.amount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}` : "-"}
                                            </td>
                                            <td className="px-6 py-4 text-right whitespace-nowrap font-medium text-red-600">
                                                {t.type === "EXPENSE" ? `₹${t.amount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}` : "-"}
                                            </td>
                                        </tr>
                                    )
                                })
                            )}
                        </tbody>
                        {transactions.length > 0 && (
                            <tfoot className="bg-slate-50/80 border-t border-slate-200 font-semibold text-slate-800">
                                <tr>
                                    <td colSpan={4} className="px-6 py-4 text-right">Totals:</td>
                                    <td className="px-6 py-4 text-right text-green-700">₹{totalInflow.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</td>
                                    <td className="px-6 py-4 text-right text-red-700">₹{totalOutflow.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</td>
                                </tr>
                            </tfoot>
                        )}
                    </table>
                </div>
            </div>
        </div>
    )
}
