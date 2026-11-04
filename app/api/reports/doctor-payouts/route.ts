import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireAuth } from "@/lib/auth-guard"
import { format } from "date-fns"

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

export async function GET(request: NextRequest) {
    try {
        await requireAuth(["SUPER_ADMIN", "ACCOUNTANT"])
    } catch {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { searchParams } = request.nextUrl

    const todayIst = new Date(new Date().toLocaleString("en-US", { timeZone: "Asia/Kolkata" }))
    const firstDayIst = new Date(todayIst.getFullYear(), todayIst.getMonth(), 1)

    const fromStr = searchParams.get("from") || format(firstDayIst, "yyyy-MM-dd")
    const toStr = searchParams.get("to") || format(todayIst, "yyyy-MM-dd")
    const selectedDoctorId = searchParams.get("doctor") || ""

    const startDateIst = getIstDayBoundaries(fromStr, false)
    const endDateIst = getIstDayBoundaries(toStr, true)

    // Fetch appointments
    const appointmentWhere: Record<string, unknown> = {
        appointmentDate: { gte: startDateIst, lte: endDateIst },
        status: { in: ["COMPLETED", "IN_PROGRESS"] },
    }
    if (selectedDoctorId) appointmentWhere.doctorId = selectedDoctorId

    const appointments = await prisma.appointment.findMany({
        where: appointmentWhere,
        include: {
            doctor: { include: { user: true } },
            billings: {
                where: {
                    type: "OPD",
                    status: { notIn: ["CANCELLED", "REFUNDED"] },
                },
            },
        },
    })

    // Fetch surgeries
    const surgeryWhere: Record<string, unknown> = {
        scheduledDate: { gte: startDateIst, lte: endDateIst },
        status: { in: ["COMPLETED", "IN_PROGRESS"] },
    }
    if (selectedDoctorId) surgeryWhere.leadSurgeonId = selectedDoctorId

    const surgeries = await prisma.surgery.findMany({
        where: surgeryWhere,
        include: {
            leadSurgeon: { include: { user: true } },
        },
    })

    // Aggregate per doctor
    const payoutMap = new Map<string, {
        doctorName: string
        specialization: string
        opdConsultations: number
        opdRevenue: number
        surgeries: number
        surgeryRevenue: number
        totalRevenue: number
    }>()

    function ensureDoctor(staff: { id: string; user: { name: string | null }; specialization: string | null; consultationFee: number }) {
        if (!payoutMap.has(staff.id)) {
            payoutMap.set(staff.id, {
                doctorName: staff.user.name || "Unknown",
                specialization: staff.specialization || "General",
                opdConsultations: 0,
                opdRevenue: 0,
                surgeries: 0,
                surgeryRevenue: 0,
                totalRevenue: 0,
            })
        }
        return payoutMap.get(staff.id)!
    }

    for (const appt of appointments) {
        const doc = ensureDoctor(appt.doctor)
        doc.opdConsultations += 1
        const billRevenue = appt.billings.reduce((sum, b) => sum + b.netAmount, 0)
        doc.opdRevenue += billRevenue > 0 ? billRevenue : appt.doctor.consultationFee
    }

    for (const surg of surgeries) {
        const doc = ensureDoctor(surg.leadSurgeon)
        doc.surgeries += 1
        doc.surgeryRevenue += surg.surgeryCharge || 0
    }

    for (const doc of payoutMap.values()) {
        doc.totalRevenue = doc.opdRevenue + doc.surgeryRevenue
    }

    const rows = Array.from(payoutMap.values()).sort((a, b) => b.totalRevenue - a.totalRevenue)

    // Build CSV
    const csvHeader = "Doctor Name,Specialization,OPD Consultations,OPD Revenue,Surgeries,Surgery Revenue,Total Payout"
    const csvRows = rows.map(r =>
        `"Dr. ${r.doctorName}","${r.specialization}",${r.opdConsultations},${r.opdRevenue.toFixed(2)},${r.surgeries},${r.surgeryRevenue.toFixed(2)},${r.totalRevenue.toFixed(2)}`
    )

    const csv = [csvHeader, ...csvRows].join("\n")

    return new NextResponse(csv, {
        status: 200,
        headers: {
            "Content-Type": "text/csv",
            "Content-Disposition": `attachment; filename="doctor-payouts-${fromStr}-to-${toStr}.csv"`,
        },
    })
}
