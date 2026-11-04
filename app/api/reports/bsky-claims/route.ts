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

    const bills = await prisma.billing.findMany({
        where: {
            billDate: { gte: start, lte: end },
            OR: [{ paymentMethod: "BSKY" }, { patient: { isBsky: true } }],
        },
        include: { patient: { include: { user: true } } },
        orderBy: { billDate: "desc" },
    })

    const rows = bills.map(b => {
        let status = "PENDING"
        if (b.status === "PAID" || b.paidAmount >= b.netAmount) status = "SETTLED"
        else if (b.status === "REFUNDED" || b.status === "CANCELLED") status = "REJECTED"
        else if (b.paidAmount > 0) status = "PARTIAL"

        const dateIst = new Date(b.billDate).toLocaleDateString("en-IN", { timeZone: "Asia/Kolkata" })
        const patientName = b.patient.user?.name || b.patient.patientId
        const urn = b.patient.bskyNumber || b.billNumber

        return [dateIst, patientName, urn, b.netAmount.toFixed(2), b.paidAmount.toFixed(2), status]
    })

    const totalClaimed = bills.reduce((s, b) => s + b.netAmount, 0)
    const totalSettled = bills.reduce((s, b) => s + b.paidAmount, 0)
    const totalPending = totalClaimed - totalSettled

    if (fmt === "excel") {
        const wb = XLSX.utils.book_new()
        const wsData = [
            [`BSKY Claims Report — ${fromStr} to ${toStr}`],
            [],
            ["Claim Date", "Patient Name", "BSKY URN / Ref", "Claim Amount (INR)", "Settled Amount (INR)", "Status"],
            ...rows,
            [],
            ["", "", "TOTALS", totalClaimed.toFixed(2), totalSettled.toFixed(2), `Pending: ${totalPending.toFixed(2)}`],
        ]
        const ws = XLSX.utils.aoa_to_sheet(wsData)
        ws["!cols"] = [{ wch: 14 }, { wch: 25 }, { wch: 22 }, { wch: 20 }, { wch: 20 }, { wch: 12 }]
        XLSX.utils.book_append_sheet(wb, ws, "BSKY Claims")
        const buf = XLSX.write(wb, { type: "buffer", bookType: "xlsx" })
        return new NextResponse(buf, {
            status: 200,
            headers: {
                "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                "Content-Disposition": `attachment; filename="BSKY_Claims_${fromStr}_${toStr}.xlsx"`,
            },
        })
    }

    const header = "Claim Date,Patient Name,BSKY URN / Ref,Claim Amount (INR),Settled Amount (INR),Status"
    const csvRows = rows.map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(","))
    csvRows.push(`"","","TOTAL CLAIMED","${totalClaimed.toFixed(2)}","${totalSettled.toFixed(2)}","Pending: ${totalPending.toFixed(2)}"`)

    return new NextResponse([header, ...csvRows].join("\n"), {
        status: 200,
        headers: {
            "Content-Type": "text/csv",
            "Content-Disposition": `attachment; filename="BSKY_Claims_${fromStr}_${toStr}.csv"`,
        },
    })
}
