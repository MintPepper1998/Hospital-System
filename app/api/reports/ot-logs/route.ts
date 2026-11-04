import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireAuth } from "@/lib/auth-guard"
import { format } from "date-fns"
import * as XLSX from "xlsx"

function getIstBoundary(dateString: string, isEnd: boolean) {
    const [year, month, day] = dateString.split("-").map(Number)
    const iso = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}T${isEnd ? "23:59:59.999" : "00:00:00"}+05:30`
    return new Date(iso)
}

export async function GET(request: NextRequest) {
    try {
        await requireAuth(["SUPER_ADMIN", "ACCOUNTANT", "DOCTOR"])
    } catch {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { searchParams } = request.nextUrl
    const todayIst = new Date(new Date().toLocaleString("en-US", { timeZone: "Asia/Kolkata" }))
    const firstDayIst = new Date(todayIst.getFullYear(), todayIst.getMonth(), 1)
    const fromStr = searchParams.get("from") || format(firstDayIst, "yyyy-MM-dd")
    const toStr = searchParams.get("to") || format(todayIst, "yyyy-MM-dd")
    const fmt = searchParams.get("format") || "csv"

    const start = getIstBoundary(fromStr, false)
    const end = getIstBoundary(toStr, true)

    const surgeries = await prisma.surgery.findMany({
        where: { scheduledDate: { gte: start, lte: end } },
        include: {
            patient: { include: { user: true } },
            leadSurgeon: { include: { user: true } },
            theater: true,
        },
        orderBy: { scheduledDate: "desc" },
    })

    const rows = surgeries.map(s => {
        const dateTimeIst = new Date(s.scheduledDate).toLocaleString("en-IN", {
            timeZone: "Asia/Kolkata", dateStyle: "medium", timeStyle: "short",
        })
        const patientName = s.patient?.user?.name || "Unknown"
        const procedure = s.procedureName || "N/A"
        const surgeon = s.leadSurgeon?.user?.name ? `Dr. ${s.leadSurgeon.user.name}` : "Unassigned"
        const room = s.theater?.name || "N/A"
        const amount = s.surgeryCharge || 0
        return [dateTimeIst, patientName, procedure, surgeon, room, amount > 0 ? amount.toFixed(2) : "Pending"]
    })

    const totalRevenue = surgeries.reduce((s, surg) => s + (surg.surgeryCharge || 0), 0)

    if (fmt === "excel") {
        const wb = XLSX.utils.book_new()
        const wsData = [
            [`OT Logs — ${fromStr} to ${toStr}`],
            [`Total Surgeries: ${surgeries.length}  |  Total OT Revenue: INR ${totalRevenue.toFixed(2)}`],
            [],
            ["Date & Time (IST)", "Patient Name", "Procedure", "Primary Surgeon", "OT Room", "Amount Billed (INR)"],
            ...rows,
            [],
            ["", "", "", "", "TOTAL OT REVENUE", totalRevenue.toFixed(2)],
        ]
        const ws = XLSX.utils.aoa_to_sheet(wsData)
        ws["!cols"] = [{ wch: 22 }, { wch: 25 }, { wch: 30 }, { wch: 25 }, { wch: 14 }, { wch: 18 }]
        XLSX.utils.book_append_sheet(wb, ws, "OT Logs")
        const buf = XLSX.write(wb, { type: "buffer", bookType: "xlsx" })
        return new NextResponse(buf, {
            status: 200,
            headers: {
                "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                "Content-Disposition": `attachment; filename="OT_Logs_${fromStr}_${toStr}.xlsx"`,
            },
        })
    }

    const header = "Date & Time (IST),Patient Name,Procedure,Primary Surgeon,OT Room,Amount Billed (INR)"
    const csvRows = rows.map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(","))
    csvRows.push(`"","","","","TOTAL OT REVENUE","${totalRevenue.toFixed(2)}"`)

    return new NextResponse([header, ...csvRows].join("\n"), {
        status: 200,
        headers: {
            "Content-Type": "text/csv",
            "Content-Disposition": `attachment; filename="OT_Logs_${fromStr}_${toStr}.csv"`,
        },
    })
}
