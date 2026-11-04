import { prisma } from "@/lib/prisma"
import { requireAuth } from "@/lib/auth-guard"
import { OpdIpdClient } from "./opd-ipd-client"
import { format } from "date-fns"
import { cn } from "@/lib/utils"
import Link from "next/link"

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

export default async function OpdIpdRevenuePage({
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

    // 1. Fetch INCOME transactions within date range
    const transactions = await prisma.transaction.findMany({
        where: {
            type: "INCOME",
            date: {
                gte: startDateIst,
                lte: endDateIst,
            },
        },
        orderBy: {
            date: "asc",
        },
    })

    // 2. Extract Bills references to determine OPD vs IPD
    const billIds = transactions
        .filter(t => t.referenceId && t.category.includes("BILL"))
        .map(t => t.referenceId!)

    let bills: any[] = []
    if (billIds.length > 0) {
        bills = await prisma.billing.findMany({
            where: { id: { in: billIds } },
            include: {
                patient: { include: { user: true } },
                appointment: { include: { doctor: { include: { user: true } } } }
            }
        })
    }

    // 3. Classify and Calculate Metrics
    let totalOpd = 0
    let totalIpd = 0

    // We map the enriched data for the table
    const enrichedTransactions = transactions.map(t => {
        let type: "OPD" | "IPD" | "OTHER" = "OTHER"
        let patientName = "-"
        let patientId = ""
        let doctorName = "-"

        const relatedBill = bills.find(b => b.id === t.referenceId)

        if (relatedBill) {
            patientName = relatedBill.patient.user.name || relatedBill.patient.patientId
            patientId = relatedBill.patientId

            if (relatedBill.appointment && relatedBill.appointment.doctor.user.name) {
                doctorName = relatedBill.appointment.doctor.user.name
            }

            // Explicit classification based on BillingType
            if (relatedBill.type === "OPD" || relatedBill.type === "PHARMACY" || relatedBill.type === "LABORATORY") {
                type = "OPD"
                totalOpd += t.amount
            } else if (relatedBill.type === "IPD" || relatedBill.type === "OT") {
                type = "IPD"
                totalIpd += t.amount
            }
        } else {
            // If it's income but not tied to a recognized bill, we classify as OTHER, 
            // but for this report context we might exclude or simply list them without metric impact if they aren't patient revenues.
            // Usually "OTHER" could be investment inflows or miscellaneous income.
        }

        return {
            ...t,
            classifiedType: type,
            patientName,
            patientId,
            doctorName
        }
    })

    const combinedRevenue = totalOpd + totalIpd

    return (
        <div className="p-6 md:p-8 max-w-7xl mx-auto space-y-8 bg-slate-50/50 min-h-[calc(100vh-4rem)]">

            {/* Client Date Filter Component */}
            {/* We pass standard Date objects for the UI state initialized from the strings */}
            <OpdIpdClient
                initialFrom={new Date(fromStr)}
                initialTo={new Date(toStr)}
            />

            {/* THEMED KPI CARDS */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">

                {/* OPD Revenue (Soft Blue) */}
                <div className="bg-white rounded-xl border border-blue-100 p-6 shadow-sm relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-blue-50 rounded-full -mr-16 -mt-16 opacity-60" />
                    <p className="text-sm font-medium text-blue-600 mb-1 relative z-10">Total OPD Revenue</p>
                    <div className="flex items-baseline gap-2 relative z-10">
                        <p className="text-3xl font-bold text-slate-800">
                            ₹{totalOpd.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                        </p>
                    </div>
                    <p className="text-xs text-slate-500 mt-2 relative z-10">Includes Consultations, Pharmacy & Labs</p>
                </div>

                {/* IPD Revenue (Soft Green) */}
                <div className="bg-white rounded-xl border border-emerald-100 p-6 shadow-sm relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-50 rounded-full -mr-16 -mt-16 opacity-60" />
                    <p className="text-sm font-medium text-emerald-600 mb-1 relative z-10">Total IPD Revenue</p>
                    <div className="flex items-baseline gap-2 relative z-10">
                        <p className="text-3xl font-bold text-slate-800">
                            ₹{totalIpd.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                        </p>
                    </div>
                    <p className="text-xs text-slate-500 mt-2 relative z-10">Includes Room Charges & OT Sub-components</p>
                </div>

                {/* Combined Revenue (Dark Theme) */}
                <div className="bg-slate-900 rounded-xl border border-slate-800 p-6 shadow-md relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-slate-800 rounded-full -mr-16 -mt-16 opacity-50" />
                    <p className="text-sm font-medium text-slate-300 mb-1 relative z-10">Combined Revenue (OPD + IPD)</p>
                    <p className="text-3xl font-bold text-white relative z-10">
                        ₹{combinedRevenue.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                    </p>
                    <div className="w-full bg-slate-800 h-1.5 rounded-full mt-3 overflow-hidden">
                        {/* Progress bar split */}
                        {combinedRevenue > 0 && (
                            <div
                                className="h-full bg-blue-400 float-left"
                                style={{ width: `${(totalOpd / combinedRevenue) * 100}%` }}
                            />
                        )}
                    </div>
                    <div className="flex justify-between text-[10px] text-slate-400 mt-1 uppercase tracking-wider font-semibold">
                        <span>OPD {combinedRevenue > 0 ? Math.round((totalOpd / combinedRevenue) * 100) : 0}%</span>
                        <span>IPD {combinedRevenue > 0 ? Math.round((totalIpd / combinedRevenue) * 100) : 0}%</span>
                    </div>
                </div>
            </div>

            {/* REVENUE TABLE */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="p-4 border-b border-slate-200 bg-slate-50">
                    <h2 className="font-semibold text-slate-800">Revenue Ledger</h2>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="text-xs text-slate-500 uppercase bg-slate-50/50 border-b border-slate-200">
                            <tr>
                                <th className="px-6 py-4 font-medium">Date & Time (IST)</th>
                                <th className="px-6 py-4 font-medium">Patient Name</th>
                                <th className="px-6 py-4 font-medium hidden sm:table-cell">Doctor / Dept</th>
                                <th className="px-6 py-4 font-medium">Type</th>
                                <th className="px-6 py-4 font-medium text-right">Amount (₹)</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {enrichedTransactions.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="px-6 py-12 text-center text-slate-500">
                                        No revenue recorded during this period.
                                    </td>
                                </tr>
                            ) : (
                                enrichedTransactions
                                    // Only plot actual clinical revenue for this specific report (Ignore OTHER)
                                    .filter(t => t.classifiedType !== "OTHER")
                                    .map((t) => {
                                        const timeIst = new Date(t.date).toLocaleString("en-US", {
                                            timeZone: "Asia/Kolkata",
                                            month: "short",
                                            day: "numeric",
                                            hour: "2-digit",
                                            minute: "2-digit"
                                        })

                                        return (
                                            <tr key={t.id} className="hover:bg-slate-50/50 transition-colors">
                                                <td className="px-6 py-4 whitespace-nowrap text-slate-500">{timeIst}</td>
                                                <td className="px-6 py-4 font-medium text-slate-800">
                                                    {t.patientId ? (
                                                        <Link href={`/dashboard/finance/billing/patient/${t.patientId}`} className="text-blue-700 hover:text-blue-900 hover:underline">
                                                            {t.patientName}
                                                        </Link>
                                                    ) : t.patientName}
                                                </td>
                                                <td className="px-6 py-4 text-slate-500 hidden sm:table-cell">
                                                    {t.doctorName}
                                                </td>
                                                <td className="px-6 py-4">
                                                    <span className={cn(
                                                        "inline-flex items-center px-2 py-1 rounded-md text-xs font-semibold uppercase tracking-wider",
                                                        t.classifiedType === "OPD" ? "bg-blue-50 text-blue-600 border border-blue-100" : "bg-emerald-50 text-emerald-600 border border-emerald-100"
                                                    )}>
                                                        {t.classifiedType}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 text-right whitespace-nowrap font-medium text-slate-700">
                                                    {t.amount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                                                </td>
                                            </tr>
                                        )
                                    })
                            )}
                        </tbody>
                        {enrichedTransactions.filter(t => t.classifiedType !== "OTHER").length > 0 && (
                            <tfoot className="bg-slate-50/80 border-t border-slate-200 font-bold text-slate-800">
                                <tr>
                                    <td colSpan={4} className="px-6 py-4 text-right">Total Combined Revenue:</td>
                                    <td className="px-6 py-4 text-right text-slate-900">
                                        ₹{combinedRevenue.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
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
