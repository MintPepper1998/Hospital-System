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

    const expenses = await prisma.transaction.findMany({
        where: {
            type: "EXPENSE",
            date: { gte: start, lte: end },
            category: { notIn: ["CAPITAL", "EQUIPMENT", "INTERNAL_TRANSFER"] },
        },
        orderBy: { date: "desc" },
    })

    const rows = expenses.map(e => {
        const dateIst = new Date(e.date).toLocaleDateString("en-IN", { timeZone: "Asia/Kolkata" })
        const category = e.category.replace(/_/g, " ")
        const description = e.description || "N/A"
        return [dateIst, category, description, e.paymentMethod, e.amount.toFixed(2)]
    })

    const total = expenses.reduce((s, e) => s + e.amount, 0)

    if (fmt === "excel") {
        const wb = XLSX.utils.book_new()
        const wsData = [
            [`Operational Expenses — ${fromStr} to ${toStr}`],
            [],
            ["Date (IST)", "Category", "Description / Vendor", "Mode", "Amount (INR)"],
            ...rows,
            [],
            ["", "", "", "TOTAL OPEX", total.toFixed(2)],
        ]
        const ws = XLSX.utils.aoa_to_sheet(wsData)
        ws["!cols"] = [{ wch: 14 }, { wch: 22 }, { wch: 35 }, { wch: 14 }, { wch: 16 }]
        XLSX.utils.book_append_sheet(wb, ws, "Operational Expenses")
        const buf = XLSX.write(wb, { type: "buffer", bookType: "xlsx" })
        return new NextResponse(buf, {
            status: 200,
            headers: {
                "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                "Content-Disposition": `attachment; filename="OpEx_${fromStr}_${toStr}.xlsx"`,
            },
        })
    }

    const header = "Date (IST),Category,Description / Vendor,Mode,Amount (INR)"
    const csvRows = rows.map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(","))
    csvRows.push(`"","","","TOTAL OPEX","${total.toFixed(2)}"`)

    return new NextResponse([header, ...csvRows].join("\n"), {
        status: 200,
        headers: {
            "Content-Type": "text/csv",
            "Content-Disposition": `attachment; filename="OpEx_${fromStr}_${toStr}.csv"`,
        },
    })
}
