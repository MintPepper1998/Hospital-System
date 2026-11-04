import { prisma } from "@/lib/prisma"
import { requireAuth } from "@/lib/auth-guard"
import { DoctorPayoutsClient } from "./doctor-payouts-client"
import { format } from "date-fns"

// Helper to strictly define IST midnight boundaries for a given date string
function getIstDayBoundaries(dateString: string, isEnd: boolean = false) {
    const [year, month, day] = dateString.split("-").map(Number)

    if (isEnd) {
        const endIstString = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}T23:59:59.999+05:30`
        return new Date(endIstString)
    } else {
        const startIstString = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}T00:00:00+05:30`
        return new Date(startIstString)
    }
}

// ---------- Types ----------
interface DoctorPayout {
    doctorId: string
    doctorName: string
    specialization: string
    consultationFee: number
    opdConsultations: number
    opdRevenue: number
    surgeries: number
    surgeryRevenue: number
    totalRevenue: number
}

export default async function DoctorPayoutsPage({
    searchParams,
}: {
    searchParams: Promise<{ from?: string; to?: string; doctor?: string }>
}) {
    await requireAuth(["SUPER_ADMIN", "ACCOUNTANT"])

    const params = await searchParams

    // Default date range: 1st of current month to today (IST)
    const todayIst = new Date(new Date().toLocaleString("en-US", { timeZone: "Asia/Kolkata" }))
    const firstDayIst = new Date(todayIst.getFullYear(), todayIst.getMonth(), 1)

    const fromStr = params.from || format(firstDayIst, "yyyy-MM-dd")
    const toStr = params.to || format(todayIst, "yyyy-MM-dd")
    const selectedDoctorId = params.doctor || ""

    const startDateIst = getIstDayBoundaries(fromStr, false)
    const endDateIst = getIstDayBoundaries(toStr, true)

    // Fetch all doctors (for filter dropdown)
    const allDoctors = await prisma.staff.findMany({
        where: {
            user: { role: "DOCTOR" },
        },
        include: { user: true },
        orderBy: { user: { name: "asc" } },
    })

    const doctorList = allDoctors.map((s) => ({
        id: s.id,
        name: s.user.name || "Unknown",
    }))

    // ── Fetch OPD Appointments with linked billings ──
    const appointmentWhere: Record<string, unknown> = {
        appointmentDate: { gte: startDateIst, lte: endDateIst },
        status: { in: ["COMPLETED", "IN_PROGRESS"] },
    }
    if (selectedDoctorId) appointmentWhere.doctorId = selectedDoctorId

    const appointments = await prisma.appointment.findMany({
        where: appointmentWhere,
        include: {
            doctor: { include: { user: true } },
            patient: { include: { user: true } },
            billings: {
                where: {
                    type: "OPD",
                    status: { notIn: ["CANCELLED", "REFUNDED"] },
                },
            },
        },
    })

    // ── Fetch Surgeries ──
    const surgeryWhere: Record<string, unknown> = {
        scheduledDate: { gte: startDateIst, lte: endDateIst },
        status: { in: ["COMPLETED", "IN_PROGRESS"] },
    }
    if (selectedDoctorId) surgeryWhere.leadSurgeonId = selectedDoctorId

    const surgeries = await prisma.surgery.findMany({
        where: surgeryWhere,
        include: {
            leadSurgeon: { include: { user: true } },
            patient: { include: { user: true } },
        },
    })

    // ── Aggregate per-doctor payout ──
    const payoutMap = new Map<string, DoctorPayout>()

    function ensureDoctor(staff: { id: string; user: { name: string | null }; specialization: string | null; consultationFee: number }): DoctorPayout {
        if (!payoutMap.has(staff.id)) {
            payoutMap.set(staff.id, {
                doctorId: staff.id,
                doctorName: staff.user.name || "Unknown",
                specialization: staff.specialization || "General",
                consultationFee: staff.consultationFee,
                opdConsultations: 0,
                opdRevenue: 0,
                surgeries: 0,
                surgeryRevenue: 0,
                totalRevenue: 0,
            })
        }
        return payoutMap.get(staff.id)!
    }

    // OPD Revenue
    for (const appt of appointments) {
        const doc = ensureDoctor(appt.doctor)
        doc.opdConsultations += 1
        // Sum net amount from all linked OPD bills
        const billRevenue = appt.billings.reduce((sum, b) => sum + b.netAmount, 0)
        doc.opdRevenue += billRevenue > 0 ? billRevenue : appt.doctor.consultationFee
    }

    // Surgery Revenue
    for (const surg of surgeries) {
        const doc = ensureDoctor(surg.leadSurgeon)
        doc.surgeries += 1
        doc.surgeryRevenue += surg.surgeryCharge || 0
    }

    // Calculate totals
    for (const doc of payoutMap.values()) {
        doc.totalRevenue = doc.opdRevenue + doc.surgeryRevenue
    }

    // Sort by total revenue descending
    const doctorPayouts = Array.from(payoutMap.values()).sort((a, b) => b.totalRevenue - a.totalRevenue)

    // ── Summary KPIs ──
    const totalOpdRevenue = doctorPayouts.reduce((sum, d) => sum + d.opdRevenue, 0)
    const totalSurgeryRevenue = doctorPayouts.reduce((sum, d) => sum + d.surgeryRevenue, 0)
    const grandTotal = totalOpdRevenue + totalSurgeryRevenue
    const totalConsultations = doctorPayouts.reduce((sum, d) => sum + d.opdConsultations, 0)
    const totalSurgeriesCount = doctorPayouts.reduce((sum, d) => sum + d.surgeries, 0)

    // Top earning doctor
    const topDoctor = doctorPayouts.length > 0 ? doctorPayouts[0] : null

    return (
        <div className="p-6 md:p-8 max-w-7xl mx-auto space-y-8 bg-slate-50/50 min-h-[calc(100vh-4rem)]">

            {/* Client Controls */}
            <DoctorPayoutsClient
                initialFrom={new Date(fromStr)}
                initialTo={new Date(toStr)}
                doctors={doctorList}
                selectedDoctorId={selectedDoctorId}
            />

            {/* KPI CARDS (Indigo/Clinical Theme) */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">

                {/* Grand Total Revenue */}
                <div className="bg-indigo-50 rounded-xl border border-indigo-200 p-6 shadow-sm relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-100 rounded-full -mr-16 -mt-16 opacity-60" />
                    <p className="text-sm font-semibold text-indigo-800 mb-1 relative z-10">Total Doctor Revenue</p>
                    <div className="flex items-baseline gap-2 relative z-10">
                        <p className="text-3xl font-bold text-indigo-900">
                            ₹{grandTotal.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                        </p>
                    </div>
                    <p className="text-xs text-indigo-700/80 mt-2 relative z-10">OPD + Surgery combined</p>
                </div>

                {/* OPD Revenue */}
                <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-slate-50 rounded-full -mr-16 -mt-16 opacity-60" />
                    <p className="text-sm font-medium text-slate-500 mb-1 relative z-10">OPD Revenue</p>
                    <div className="flex items-baseline gap-2 relative z-10">
                        <p className="text-3xl font-bold text-slate-800">
                            ₹{totalOpdRevenue.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                        </p>
                    </div>
                    <p className="text-xs text-slate-500 mt-2 relative z-10 font-bold">
                        {totalConsultations} consultations
                    </p>
                </div>

                {/* Surgery Revenue */}
                <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-slate-50 rounded-full -mr-16 -mt-16 opacity-60" />
                    <p className="text-sm font-medium text-slate-500 mb-1 relative z-10">Surgery Revenue</p>
                    <div className="flex items-baseline gap-2 relative z-10">
                        <p className="text-3xl font-bold text-slate-800">
                            ₹{totalSurgeryRevenue.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                        </p>
                    </div>
                    <p className="text-xs text-slate-500 mt-2 relative z-10 font-bold">
                        {totalSurgeriesCount} procedures
                    </p>
                </div>

                {/* Top Earning Doctor */}
                <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-slate-50 rounded-full -mr-16 -mt-16 opacity-60" />
                    <p className="text-sm font-medium text-slate-500 mb-1 relative z-10">Top Earning Doctor</p>
                    <p className="text-xl font-bold text-slate-800 relative z-10 truncate" title={topDoctor?.doctorName || "N/A"}>
                        {topDoctor ? `Dr. ${topDoctor.doctorName}` : "N/A"}
                    </p>
                    <p className="text-xs text-indigo-600 mt-2 relative z-10 font-bold">
                        {topDoctor ? `₹${topDoctor.totalRevenue.toLocaleString("en-IN", { minimumFractionDigits: 2 })}` : "—"}
                    </p>
                </div>
            </div>

            {/* DOCTOR-WISE PAYOUT SUMMARY TABLE */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="p-4 border-b border-slate-200 bg-slate-50">
                    <h2 className="font-semibold text-slate-800">Doctor-wise Payout Summary</h2>
                    <p className="text-xs text-slate-500 mt-0.5">Revenue breakdown by OPD consultations and surgical procedures</p>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="text-xs text-slate-500 uppercase bg-slate-50/50 border-b border-slate-200">
                            <tr>
                                <th className="px-6 py-4 font-medium">#</th>
                                <th className="px-6 py-4 font-medium">Doctor Name</th>
                                <th className="px-6 py-4 font-medium hidden sm:table-cell">Specialization</th>
                                <th className="px-6 py-4 font-medium text-center">OPD Visits</th>
                                <th className="px-6 py-4 font-medium text-right">OPD Revenue</th>
                                <th className="px-6 py-4 font-medium text-center hidden md:table-cell">Surgeries</th>
                                <th className="px-6 py-4 font-medium text-right hidden md:table-cell">Surgery Revenue</th>
                                <th className="px-6 py-4 font-medium text-right">Total Payout</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {doctorPayouts.length === 0 ? (
                                <tr>
                                    <td colSpan={8} className="px-6 py-12 text-center text-slate-500">
                                        No doctor revenue recorded in this period.
                                    </td>
                                </tr>
                            ) : (
                                doctorPayouts.map((doc, index) => (
                                    <tr key={doc.doctorId} className="hover:bg-slate-50/50 transition-colors">
                                        <td className="px-6 py-4 text-slate-400 font-medium">{index + 1}</td>
                                        <td className="px-6 py-4">
                                            <div>
                                                <p className="font-bold text-slate-800">Dr. {doc.doctorName}</p>
                                                <p className="text-xs text-slate-400 sm:hidden">{doc.specialization}</p>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 hidden sm:table-cell">
                                            <span className="inline-flex items-center px-2.5 py-1 rounded-md text-[11px] font-semibold bg-indigo-50 text-indigo-700 border border-indigo-100">
                                                {doc.specialization}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-center font-semibold text-slate-700">{doc.opdConsultations}</td>
                                        <td className="px-6 py-4 text-right font-bold text-slate-700 whitespace-nowrap">
                                            ₹{doc.opdRevenue.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                                        </td>
                                        <td className="px-6 py-4 text-center font-semibold text-slate-700 hidden md:table-cell">{doc.surgeries}</td>
                                        <td className="px-6 py-4 text-right font-bold text-slate-700 whitespace-nowrap hidden md:table-cell">
                                            ₹{doc.surgeryRevenue.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <span className="font-bold text-indigo-700 whitespace-nowrap">
                                                ₹{doc.totalRevenue.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                                            </span>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                        {doctorPayouts.length > 0 && (
                            <tfoot className="bg-slate-50/80 border-t-2 border-slate-200 font-bold text-slate-800">
                                <tr>
                                    <td colSpan={3} className="px-6 py-4 text-right hidden sm:table-cell">Totals</td>
                                    <td colSpan={2} className="px-6 py-4 text-right sm:hidden">Totals</td>
                                    <td className="px-6 py-4 text-center">{totalConsultations}</td>
                                    <td className="px-6 py-4 text-right whitespace-nowrap">
                                        ₹{totalOpdRevenue.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                                    </td>
                                    <td className="px-6 py-4 text-center hidden md:table-cell">{totalSurgeriesCount}</td>
                                    <td className="px-6 py-4 text-right whitespace-nowrap hidden md:table-cell">
                                        ₹{totalSurgeryRevenue.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                                    </td>
                                    <td className="px-6 py-4 text-right text-indigo-700 whitespace-nowrap">
                                        ₹{grandTotal.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                                    </td>
                                </tr>
                            </tfoot>
                        )}
                    </table>
                </div>
            </div>

            {/* DETAILED TRANSACTION LOG */}
            <DoctorDetailedLog
                appointments={appointments}
                surgeries={surgeries}
            />
        </div>
    )
}

// ── Detailed Transaction Log Component ──
function DoctorDetailedLog({
    appointments,
    surgeries,
}: {
    appointments: Array<{
        id: string
        appointmentDate: Date
        doctor: { user: { name: string | null }; consultationFee: number }
        billings: Array<{ netAmount: number; billNumber: string }>
        patient: { user: { name: string | null } }
    }>
    surgeries: Array<{
        id: string
        scheduledDate: Date
        procedureName: string
        surgeryCharge: number
        leadSurgeon: { user: { name: string | null } }
        patient: { user: { name: string | null } }
    }>
}) {
    // Merge into a single timeline
    type LogEntry = {
        id: string
        date: Date
        type: "OPD" | "Surgery"
        doctorName: string
        patientName: string
        description: string
        billRef: string
        amount: number
    }

    const entries: LogEntry[] = []

    for (const appt of appointments) {
        const billRevenue = appt.billings.reduce((sum, b) => sum + b.netAmount, 0)
        const amount = billRevenue > 0 ? billRevenue : appt.doctor.consultationFee
        const billRef = appt.billings.length > 0 ? appt.billings.map(b => b.billNumber).join(", ") : "—"

        entries.push({
            id: appt.id,
            date: appt.appointmentDate,
            type: "OPD",
            doctorName: appt.doctor.user.name || "Unknown",
            patientName: appt.patient?.user?.name || "—",
            description: "OPD Consultation",
            billRef,
            amount,
        })
    }

    for (const surg of surgeries) {
        entries.push({
            id: surg.id,
            date: surg.scheduledDate,
            type: "Surgery",
            doctorName: surg.leadSurgeon.user.name || "Unknown",
            patientName: surg.patient?.user?.name || "—",
            description: surg.procedureName,
            billRef: "—",
            amount: surg.surgeryCharge || 0,
        })
    }

    // Sort by date descending
    entries.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())

    return (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-4 border-b border-slate-200 bg-slate-50">
                <h2 className="font-semibold text-slate-800">Detailed Transaction Log</h2>
                <p className="text-xs text-slate-500 mt-0.5">Individual OPD and surgery entries for the selected period</p>
            </div>
            <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                    <thead className="text-xs text-slate-500 uppercase bg-slate-50/50 border-b border-slate-200">
                        <tr>
                            <th className="px-6 py-4 font-medium">Date (IST)</th>
                            <th className="px-6 py-4 font-medium">Type</th>
                            <th className="px-6 py-4 font-medium">Doctor</th>
                            <th className="px-6 py-4 font-medium hidden md:table-cell">Description</th>
                            <th className="px-6 py-4 font-medium hidden lg:table-cell">Bill Ref</th>
                            <th className="px-6 py-4 font-medium text-right">Amount</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {entries.length === 0 ? (
                            <tr>
                                <td colSpan={6} className="px-6 py-12 text-center text-slate-500">
                                    No transactions in this period.
                                </td>
                            </tr>
                        ) : (
                            entries.map((entry) => {
                                const dateTimeIst = new Date(entry.date).toLocaleString("en-US", {
                                    timeZone: "Asia/Kolkata",
                                    month: "short",
                                    day: "numeric",
                                    year: "numeric",
                                    hour: "2-digit",
                                    minute: "2-digit"
                                })

                                return (
                                    <tr key={entry.id} className="hover:bg-slate-50/50 transition-colors">
                                        <td className="px-6 py-4 whitespace-nowrap text-slate-500">{dateTimeIst}</td>
                                        <td className="px-6 py-4">
                                            <span className={`inline-flex items-center px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-widest border ${
                                                entry.type === "OPD"
                                                    ? "bg-blue-50 text-blue-700 border-blue-100"
                                                    : "bg-amber-50 text-amber-700 border-amber-100"
                                            }`}>
                                                {entry.type}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 font-bold text-slate-800">Dr. {entry.doctorName}</td>
                                        <td className="px-6 py-4 text-slate-600 hidden md:table-cell">{entry.description}</td>
                                        <td className="px-6 py-4 text-slate-400 text-xs font-mono hidden lg:table-cell">{entry.billRef}</td>
                                        <td className="px-6 py-4 text-right">
                                            {entry.amount === 0 ? (
                                                <span className="inline-flex items-center px-2 py-1 rounded text-[11px] font-bold uppercase text-slate-500 bg-slate-100">
                                                    Pending
                                                </span>
                                            ) : (
                                                <span className="font-bold text-slate-700 whitespace-nowrap">
                                                    ₹{entry.amount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                                                </span>
                                            )}
                                        </td>
                                    </tr>
                                )
                            })
                        )}
                    </tbody>
                    {entries.length > 0 && (
                        <tfoot className="bg-slate-50/80 border-t border-slate-200 font-bold text-slate-800">
                            <tr>
                                <td colSpan={5} className="px-6 py-4 text-right">Total (Selected Period):</td>
                                <td className="px-6 py-4 text-right text-indigo-700">
                                    ₹{entries.reduce((sum, e) => sum + e.amount, 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                                </td>
                            </tr>
                        </tfoot>
                    )}
                </table>
            </div>
        </div>
    )
}
