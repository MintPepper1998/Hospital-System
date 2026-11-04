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
        await requireAuth(["SUPER_ADMIN", "ACCOUNTANT"])
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

    const transactions = await prisma.transaction.findMany({
        where: { type: "INCOME", date: { gte: start, lte: end } },
        orderBy: { date: "asc" },
    })

    const billIds = transactions
        .filter(t => t.referenceId && t.category.includes("BILL"))
        .map(t => t.referenceId!)

    let bills: Array<{
        id: string
        type: string
        patient: { patientId: string; user: { name: string | null } }
        appointment: { doctor: { user: { name: string | null } } } | null
    }> = []
    if (billIds.length > 0) {
        bills = await prisma.billing.findMany({
            where: { id: { in: billIds } },
            include: {
                patient: { include: { user: true } },
                appointment: { include: { doctor: { include: { user: true } } } },
            },
        })
    }

    const rows = transactions.map(t => {
        const relatedBill = bills.find(b => b.id === t.referenceId)
        let typeLabel = "OTHER"
        let patientName = "-"
        let doctorName = "-"

        if (relatedBill) {
            patientName = relatedBill.patient.user.name || relatedBill.patient.patientId
            doctorName = relatedBill.appointment?.doctor?.user?.name || "-"
            if (["OPD", "PHARMACY", "LABORATORY"].includes(relatedBill.type)) typeLabel = "OPD"
            else if (["IPD", "OT"].includes(relatedBill.type)) typeLabel = "IPD"
        }

        const dateTimeIst = new Date(t.date).toLocaleString("en-IN", {
            timeZone: "Asia/Kolkata", dateStyle: "medium", timeStyle: "short",
        })

        return [dateTimeIst, patientName, doctorName, typeLabel, t.amount.toFixed(2)]
    }).filter(r => r[3] !== "OTHER")

    const grandTotal = rows.reduce((s, r) => s + parseFloat(r[4] as string), 0)

    if (fmt === "excel") {
        const wb = XLSX.utils.book_new()
        const wsData = [
            [`OPD/IPD Revenue — ${fromStr} to ${toStr}`],
            [],
            ["Date & Time (IST)", "Patient Name", "Doctor / Dept", "Type", "Amount (INR)"],
            ...rows,
            [],
            ["", "", "", "TOTAL", grandTotal.toFixed(2)],
        ]
        const ws = XLSX.utils.aoa_to_sheet(wsData)
        ws["!cols"] = [{ wch: 22 }, { wch: 25 }, { wch: 22 }, { wch: 8 }, { wch: 14 }]
        XLSX.utils.book_append_sheet(wb, ws, "OPD-IPD Revenue")
        const buf = XLSX.write(wb, { type: "buffer", bookType: "xlsx" })
        return new NextResponse(buf, {
            status: 200,
            headers: {
                "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                "Content-Disposition": `attachment; filename="OPD_IPD_Revenue_${fromStr}_${toStr}.xlsx"`,
            },
        })
    }

    const header = "Date & Time (IST),Patient Name,Doctor / Dept,Type,Amount (INR)"
    const csvRows = rows.map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(","))
    csvRows.push(`"","","","TOTAL","${grandTotal.toFixed(2)}"`)

    return new NextResponse([header, ...csvRows].join("\n"), {
        status: 200,
        headers: {
            "Content-Type": "text/csv",
            "Content-Disposition": `attachment; filename="OPD_IPD_Revenue_${fromStr}_${toStr}.csv"`,
        },
    })
}
