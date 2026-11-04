import { prisma } from "@/lib/prisma"
import { requireAuth } from "@/lib/auth-guard"
import { BskyClient } from "./bsky-client"
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

export default async function BskyClaimsPage({
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

    // Fetch Billings that hit BSKY constraints within date range
    const bills = await prisma.billing.findMany({
        where: {
            billDate: {
                gte: startDateIst,
                lte: endDateIst,
            },
            OR: [
                { paymentMethod: "BSKY" },
                { patient: { isBsky: true } }
            ]
        },
        include: {
            patient: {
                include: {
                    user: true
                }
            }
        },
        orderBy: {
            billDate: "desc", // Show newest first for active tracking
        },
    })

    // Calculate Summary Metrics
    let totalClaimed = 0
    let totalSettled = 0

    const enrichedBills = bills.map(b => {
        // Total Claim Submitted
        totalClaimed += b.netAmount
        // Total successfully paid by BSKY/Govt
        totalSettled += b.paidAmount

        // Status Resolution
        let claimStatus: "PENDING" | "SETTLED" | "REJECTED" | "PARTIAL" = "PENDING"

        if (b.status === "PAID" || b.paidAmount >= b.netAmount) {
            claimStatus = "SETTLED"
        } else if (b.status === "REFUNDED" || b.status === "CANCELLED") {
            claimStatus = "REJECTED"
        } else if (b.paidAmount > 0) {
            claimStatus = "PARTIAL"
        }

        return {
            id: b.id,
            date: b.billDate,
            patientName: b.patient.user?.name || b.patient.patientId,
            urn: b.patient.bskyNumber || b.billNumber,
            claimAmount: b.netAmount,
            settledAmount: b.paidAmount,
            status: claimStatus
        }
    })

    const totalPending = totalClaimed - totalSettled

    return (
        <div className="p-6 md:p-8 max-w-7xl mx-auto space-y-8 bg-slate-50/50 min-h-[calc(100vh-4rem)]">

            {/* Client Date Filter Component */}
            <BskyClient
                initialFrom={new Date(fromStr)}
                initialTo={new Date(toStr)}
            />

            {/* THEMED KPI CARDS (Dashboard Focus vs IPD/OPD Theme) */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">

                {/* Total Claimed (Soft Blue) */}
                <div className="bg-white rounded-xl border border-blue-100 p-6 shadow-sm relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-blue-50 rounded-full -mr-16 -mt-16 opacity-60" />
                    <p className="text-sm font-medium text-blue-600 mb-1 relative z-10">Total BSKY Claimed</p>
                    <div className="flex items-baseline gap-2 relative z-10">
                        <p className="text-3xl font-bold text-slate-800">
                            ₹{totalClaimed.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                        </p>
                    </div>
                    <p className="text-xs text-slate-500 mt-2 relative z-10">Total value of invoices generated</p>
                </div>

                {/* Total Settled (Soft Green) */}
                <div className="bg-white rounded-xl border border-emerald-100 p-6 shadow-sm relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-50 rounded-full -mr-16 -mt-16 opacity-60" />
                    <p className="text-sm font-medium text-emerald-600 mb-1 relative z-10">Total Settled</p>
                    <div className="flex items-baseline gap-2 relative z-10">
                        <p className="text-3xl font-bold text-slate-800">
                            ₹{totalSettled.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                        </p>
                    </div>
                    <p className="text-xs text-slate-500 mt-2 relative z-10">Total government payouts received</p>
                </div>

                {/* Total Pending (Alert/Amber Theme) */}
                <div className="bg-amber-50 rounded-xl border border-amber-200 p-6 shadow-sm relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-amber-100 rounded-full -mr-16 -mt-16 opacity-60" />
                    <div className="absolute bottom-0 right-0 w-24 h-24 bg-orange-100 rounded-full -mr-8 -mb-8 opacity-60" />
                    <p className="text-sm font-semibold text-amber-800 mb-1 relative z-10">Pending / Outstanding</p>
                    <p className="text-3xl font-bold text-amber-900 relative z-10">
                        ₹{totalPending.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                    </p>
                    <p className="text-xs text-amber-700/80 mt-2 relative z-10 uppercase tracking-widest font-bold">Requires Action</p>
                </div>
            </div>

            {/* CLAIMS TRACKING TABLE */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="p-4 border-b border-slate-200 bg-slate-50">
                    <h2 className="font-semibold text-slate-800">Claims Log</h2>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="text-xs text-slate-500 uppercase bg-slate-50/50 border-b border-slate-200">
                            <tr>
                                <th className="px-6 py-4 font-medium">Claim Date (IST)</th>
                                <th className="px-6 py-4 font-medium">Patient Name</th>
                                <th className="px-6 py-4 font-medium hidden sm:table-cell">BSKY URN / Ref no.</th>
                                <th className="px-6 py-4 font-medium text-right">Claim Amount</th>
                                <th className="px-6 py-4 font-medium text-right">Settled Amount</th>
                                <th className="px-6 py-4 font-medium text-center">Status</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {enrichedBills.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="px-6 py-12 text-center text-slate-500">
                                        No active BSKY claims matching this period.
                                    </td>
                                </tr>
                            ) : (
                                enrichedBills.map((claim) => {
                                    const timeIst = new Date(claim.date).toLocaleString("en-US", {
                                        timeZone: "Asia/Kolkata",
                                        month: "short",
                                        day: "numeric",
                                        year: "numeric"
                                    })

                                    return (
                                        <tr key={claim.id} className="hover:bg-slate-50/50 transition-colors">
                                            <td className="px-6 py-4 whitespace-nowrap text-slate-500">{timeIst}</td>
                                            <td className="px-6 py-4 font-medium text-slate-800">
                                                {claim.patientName}
                                            </td>
                                            <td className="px-6 py-4 text-slate-500 hidden sm:table-cell">
                                                {claim.urn}
                                            </td>
                                            <td className="px-6 py-4 text-right whitespace-nowrap font-medium text-slate-700">
                                                ₹{claim.claimAmount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                                            </td>
                                            <td className="px-6 py-4 text-right whitespace-nowrap font-medium text-emerald-600">
                                                ₹{claim.settledAmount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                                            </td>
                                            <td className="px-6 py-4 text-center">
                                                <span className={cn(
                                                    "inline-flex items-center px-2 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider",
                                                    claim.status === "SETTLED" && "bg-emerald-50 text-emerald-700 border border-emerald-200",
                                                    claim.status === "PENDING" && "bg-amber-50 text-amber-700 border border-amber-200",
                                                    claim.status === "PARTIAL" && "bg-blue-50 text-blue-700 border border-blue-200",
                                                    claim.status === "REJECTED" && "bg-red-50 text-red-700 border border-red-200",
                                                )}>
                                                    {claim.status}
                                                </span>
                                            </td>
                                        </tr>
                                    )
                                })
                            )}
                        </tbody>
                        {enrichedBills.length > 0 && (
                            <tfoot className="bg-slate-50/80 border-t border-slate-200 font-bold text-slate-800">
                                <tr>
                                    <td colSpan={3} className="px-6 py-4 text-right">Report Totals:</td>
                                    <td className="px-6 py-4 text-right text-slate-900">
                                        ₹{totalClaimed.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                                    </td>
                                    <td className="px-6 py-4 text-right text-emerald-700">
                                        ₹{totalSettled.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                                    </td>
                                    <td className="px-6 py-4 text-center text-amber-600">
                                        Pending: ₹{totalPending.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
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
