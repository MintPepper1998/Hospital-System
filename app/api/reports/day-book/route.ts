import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireAuth } from "@/lib/auth-guard"
import { format } from "date-fns"
import * as XLSX from "xlsx"

function getIstDayBoundaries(dateString: string) {
    const [year, month, day] = dateString.split("-").map(Number)
    const start = new Date(`${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}T00:00:00+05:30`)
    const end = new Date(`${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}T23:59:59.999+05:30`)
    return { start, end }
}

export async function GET(request: NextRequest) {
    try {
        await requireAuth(["SUPER_ADMIN", "ACCOUNTANT"])
    } catch {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { searchParams } = request.nextUrl
    const todayIst = new Date(new Date().toLocaleString("en-US", { timeZone: "Asia/Kolkata" }))
    const dateStr = searchParams.get("date") || format(todayIst, "yyyy-MM-dd")
    const fmt = searchParams.get("format") || "csv"

    const { start, end } = getIstDayBoundaries(dateStr)

    const transactions = await prisma.transaction.findMany({
        where: { date: { gte: start, lte: end } },
        include: { account: true },
        orderBy: { date: "asc" },
    })

    // Enrich with bill data
    const billIds = transactions
        .filter(t => t.referenceId && t.category.includes("BILL"))
        .map(t => t.referenceId!)

    let bills: Array<{ id: string; billNumber: string; patient: { patientId: string; user: { name: string | null } } }> = []
    if (billIds.length > 0) {
        bills = await prisma.billing.findMany({
            where: { id: { in: billIds } },
            include: { patient: { include: { user: true } } },
        })
    }

    const rows = transactions.map(t => {
        const timeIst = new Date(t.date).toLocaleTimeString("en-US", {
            timeZone: "Asia/Kolkata",
            hour: "2-digit",
            minute: "2-digit",
        })
        const relatedBill = bills.find(b => b.id === t.referenceId)
        const particulars = relatedBill
            ? `Bill: ${relatedBill.patient.user.name || relatedBill.patient.patientId} - ${t.category}`
            : t.description || t.category
        const refNo = relatedBill ? relatedBill.billNumber : t.referenceId || ""
        const cashIn = t.type === "INCOME" ? t.amount : 0
        const cashOut = t.type === "EXPENSE" ? t.amount : 0

        return [timeIst, particulars, refNo, t.paymentMethod, cashIn, cashOut]
    })

    const totalIn = transactions.filter(t => t.type === "INCOME").reduce((s, t) => s + t.amount, 0)
    const totalOut = transactions.filter(t => t.type === "EXPENSE").reduce((s, t) => s + t.amount, 0)

    if (fmt === "excel") {
        const wb = XLSX.utils.book_new()
        const wsData = [
            [`Day Book — ${dateStr}`],
            [],
            ["Time (IST)", "Particulars", "Ref No.", "Mode", "Cash In (₹)", "Cash Out (₹)"],
            ...rows,
            [],
            ["", "", "", "TOTALS", totalIn.toFixed(2), totalOut.toFixed(2)],
            ["", "", "", "NET BALANCE", (totalIn - totalOut).toFixed(2), ""],
        ]
        const ws = XLSX.utils.aoa_to_sheet(wsData)
        ws["!cols"] = [{ wch: 12 }, { wch: 40 }, { wch: 18 }, { wch: 14 }, { wch: 16 }, { wch: 16 }]
        XLSX.utils.book_append_sheet(wb, ws, "Day Book")
        const buf = XLSX.write(wb, { type: "buffer", bookType: "xlsx" })
        return new NextResponse(buf, {
            status: 200,
            headers: {
                "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                "Content-Disposition": `attachment; filename="DayBook_${dateStr}.xlsx"`,
            },
        })
    }

    // CSV
    const header = "Time (IST),Particulars,Ref No.,Mode,Cash In (INR),Cash Out (INR)"
    const csvRows = rows.map(r =>
        r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(",")
    )
    csvRows.push(`"","","","TOTAL IN","${totalIn.toFixed(2)}","0.00"`)
    csvRows.push(`"","","","TOTAL OUT","0.00","${totalOut.toFixed(2)}"`)
    csvRows.push(`"","","","NET BALANCE","${(totalIn - totalOut).toFixed(2)}","0.00"`)

    return new NextResponse([header, ...csvRows].join("\n"), {
        status: 200,
        headers: {
            "Content-Type": "text/csv",
            "Content-Disposition": `attachment; filename="DayBook_${dateStr}.csv"`,
        },
    })
}
