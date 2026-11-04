import { prisma } from "@/lib/prisma"
import { requireAuth } from "@/lib/auth-guard"
import { OTLogsClient } from "./ot-logs-client"
import { format } from "date-fns"

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

export default async function OTLogsPage({
    searchParams,
}: {
    searchParams: Promise<{ from?: string; to?: string }>
}) {
    await requireAuth(["SUPER_ADMIN", "ACCOUNTANT", "DOCTOR"])

    const params = await searchParams

    // Default to 1st of current month to Today in IST
    const todayIst = new Date(new Date().toLocaleString("en-US", { timeZone: "Asia/Kolkata" }))
    const firstDayIst = new Date(todayIst.getFullYear(), todayIst.getMonth(), 1)

    const fromStr = params.from || format(firstDayIst, "yyyy-MM-dd")
    const toStr = params.to || format(todayIst, "yyyy-MM-dd")

    const startDateIst = getIstDayBoundaries(fromStr, false)
    const endDateIst = getIstDayBoundaries(toStr, true)

    // Fetch Surgeries within date range including relation data
    const surgeries = await prisma.surgery.findMany({
        where: {
            scheduledDate: {
                gte: startDateIst,
                lte: endDateIst,
            }
        },
        include: {
            patient: {
                include: { user: true }
            },
            leadSurgeon: {
                include: { user: true }
            },
            theater: true
        },
        orderBy: {
            scheduledDate: "desc", // Latest first
        },
    })

    // Calculate Summary Metrics
    let totalOTRevenue = 0
    const procedureCounts: Record<string, number> = {}

    surgeries.forEach(surgery => {
        totalOTRevenue += surgery.surgeryCharge || 0

        const proc = surgery.procedureName || "Uncategorized"
        procedureCounts[proc] = (procedureCounts[proc] || 0) + 1
    })

    // Total Surgeries
    const totalSurgeries = surgeries.length

    // Top Procedure Count
    let topProcedureName = "None"
    let topProcedureCount = 0

    Object.entries(procedureCounts).forEach(([proc, count]) => {
        if (count > topProcedureCount) {
            topProcedureCount = count
            topProcedureName = proc
        }
    })

    // Map for display
    const displaySurgeries = surgeries.map(s => ({
        id: s.id,
        date: s.scheduledDate,
        patientName: s.patient?.user?.name || "Unknown Patient",
        procedureName: s.procedureName,
        leadSurgeon: s.leadSurgeon?.user?.name || "Unassigned",
        roomNo: s.theater?.name || "N/A",
        amount: s.surgeryCharge || 0
    }))

    return (
        <div className="p-6 md:p-8 max-w-7xl mx-auto space-y-8 bg-slate-50/50 min-h-[calc(100vh-4rem)]">

            {/* Client Date Filter Component */}
            <OTLogsClient
                initialFrom={new Date(fromStr)}
                initialTo={new Date(toStr)}
            />

            {/* THEMED KPI CARDS (Clinical Teal Theme) */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">

                {/* Total Surgeries (Teal UI) */}
                <div className="bg-teal-50 rounded-xl border border-teal-200 p-6 shadow-sm relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-teal-100 rounded-full -mr-16 -mt-16 opacity-60" />
                    <p className="text-sm font-semibold text-teal-800 mb-1 relative z-10">Total Surgeries Performed</p>
                    <div className="flex items-baseline gap-2 relative z-10">
                        <p className="text-3xl font-bold text-teal-900">
                            {totalSurgeries}
                        </p>
                    </div>
                    <p className="text-xs text-teal-700/80 mt-2 relative z-10">Procedures logged in OT</p>
                </div>

                {/* Total OT Revenue */}
                <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-slate-50 rounded-full -mr-16 -mt-16 opacity-60" />
                    <p className="text-sm font-medium text-slate-500 mb-1 relative z-10">Total OT Revenue</p>
                    <div className="flex items-baseline gap-2 relative z-10">
                        <p className="text-3xl font-bold text-slate-800">
                            ₹{totalOTRevenue.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                        </p>
                    </div>
                    <p className="text-xs text-slate-500 mt-2 relative z-10 font-bold">
                        Generated across {totalSurgeries} procedures
                    </p>
                </div>

                {/* Top Procedure */}
                <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-slate-50 rounded-full -mr-16 -mt-16 opacity-60" />
                    <p className="text-sm font-medium text-slate-500 mb-1 relative z-10">Most Frequent Procedure</p>
                    <p className="text-xl font-bold text-slate-800 relative z-10 truncate" title={topProcedureName}>
                        {topProcedureName}
                    </p>
                    <p className="text-xs text-teal-600 mt-2 relative z-10 font-bold">
                        Performed {topProcedureCount} times
                    </p>
                </div>
            </div>

            {/* OPERATIONS LEDGER TABLE */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="p-4 border-b border-slate-200 bg-slate-50">
                    <h2 className="font-semibold text-slate-800">Operation Theatre Ledger</h2>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="text-xs text-slate-500 uppercase bg-slate-50/50 border-b border-slate-200">
                            <tr>
                                <th className="px-6 py-4 font-medium">Date & Time (IST)</th>
                                <th className="px-6 py-4 font-medium">Patient Name</th>
                                <th className="px-6 py-4 font-medium">Procedure</th>
                                <th className="px-6 py-4 font-medium hidden sm:table-cell">Primary Surgeon</th>
                                <th className="px-6 py-4 font-medium text-center hidden md:table-cell">OT Room</th>
                                <th className="px-6 py-4 font-medium text-right">Amount Billed</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {displaySurgeries.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="px-6 py-12 text-center text-slate-500">
                                        No surgeries scheduled or performed in this period.
                                    </td>
                                </tr>
                            ) : (
                                displaySurgeries.map((surgery) => {
                                    const dateTimeIst = new Date(surgery.date).toLocaleString("en-US", {
                                        timeZone: "Asia/Kolkata",
                                        month: "short",
                                        day: "numeric",
                                        year: "numeric",
                                        hour: "2-digit",
                                        minute: "2-digit"
                                    })

                                    const isPendingAmount = surgery.amount === 0;

                                    return (
                                        <tr key={surgery.id} className="hover:bg-slate-50/50 transition-colors">
                                            <td className="px-6 py-4 whitespace-nowrap text-slate-500">{dateTimeIst}</td>
                                            <td className="px-6 py-4 font-bold text-slate-800">
                                                {surgery.patientName}
                                            </td>
                                            <td className="px-6 py-4 text-slate-800 font-semibold text-[13px]">
                                                {surgery.procedureName}
                                            </td>
                                            <td className="px-6 py-4 text-teal-700 hidden sm:table-cell font-medium">
                                                Dr. {surgery.leadSurgeon}
                                            </td>
                                            <td className="px-6 py-4 text-center hidden md:table-cell">
                                                <span className="inline-flex items-center px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-widest bg-slate-100 text-slate-600 border border-slate-200">
                                                    {surgery.roomNo}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                {isPendingAmount ? (
                                                    <span className="inline-flex items-center px-2 py-1 rounded w-fit text-[11px] font-bold uppercase text-slate-500 bg-slate-100">
                                                        Pending
                                                    </span>
                                                ) : (
                                                    <span className="font-bold text-slate-700 whitespace-nowrap">
                                                        ₹{surgery.amount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                                                    </span>
                                                )}
                                            </td>
                                        </tr>
                                    )
                                })
                            )}
                        </tbody>
                        {displaySurgeries.length > 0 && (
                            <tfoot className="bg-slate-50/80 border-t border-slate-200 font-bold text-slate-800">
                                <tr>
                                    <td colSpan={5} className="px-6 py-4 text-right">Total OT Gross (Selected Period):</td>
                                    <td className="px-6 py-4 text-right text-teal-700">
                                        ₹{totalOTRevenue.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
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
