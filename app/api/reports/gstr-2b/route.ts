import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireAuth } from "@/lib/auth-guard"
import * as XLSX from "xlsx"

function getMonthBoundaries(month: number, year: number) {
    const startIst = `${year}-${String(month).padStart(2, '0')}-01T00:00:00+05:30`
    const lastDay = new Date(year, month, 0).getDate()
    const endIst = `${year}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}T23:59:59.999+05:30`
    return { start: new Date(startIst), end: new Date(endIst) }
}

export async function GET(request: NextRequest) {
    try {
        await requireAuth(["SUPER_ADMIN", "ACCOUNTANT"])
    } catch {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { searchParams } = request.nextUrl
    const todayIst = new Date(new Date().toLocaleString("en-US", { timeZone: "Asia/Kolkata" }))
    const month = Number(searchParams.get("month") || todayIst.getMonth() + 1)
    const year = Number(searchParams.get("year") || todayIst.getFullYear())

    const { start, end } = getMonthBoundaries(month, year)

    const purchases = await prisma.purchaseInvoice.findMany({
        where: { date: { gte: start, lte: end } },
        include: { supplier: true, items: true },
        orderBy: { date: "asc" },
    })

    const wb = XLSX.utils.book_new()

    // Sheet 1: Supplier-wise ITC
    const supplierRows = purchases.map(inv => {
        const taxableVal = inv.items.reduce((s, i) => s + i.quantity * i.rate, 0)
        const taxAmt = inv.items.reduce((s, i) => s + (i.quantity * i.rate * i.taxPercent) / 100, 0)
        return [
            inv.supplier.gstNumber || "UNREGISTERED",
            inv.supplier.name,
            inv.invoiceNumber,
            new Date(inv.date).toLocaleDateString("en-IN"),
            Math.round(taxableVal * 100) / 100,
            Math.round((taxAmt / 2) * 100) / 100,
            Math.round((taxAmt / 2) * 100) / 100,
            0,
            Math.round(taxAmt * 100) / 100,
            inv.supplier.gstNumber ? "Yes" : "No",
        ]
    })

    const supplierData = [
        ["Supplier GSTIN", "Supplier Name", "Invoice No", "Invoice Date", "Taxable Value", "CGST", "SGST", "IGST", "Total ITC", "ITC Eligible"],
        ...supplierRows,
    ]
    const ws1 = XLSX.utils.aoa_to_sheet(supplierData)
    ws1["!cols"] = [
        { wch: 18 }, { wch: 25 }, { wch: 18 }, { wch: 14 },
        { wch: 16 }, { wch: 14 }, { wch: 14 }, { wch: 10 }, { wch: 14 }, { wch: 12 },
    ]
    XLSX.utils.book_append_sheet(wb, ws1, "Supplier ITC")

    // Sheet 2: Rate-wise Summary
    const rateMap = new Map<number, { txval: number; cgst: number; sgst: number }>()
    for (const inv of purchases) {
        for (const item of inv.items) {
            const txval = item.quantity * item.rate
            const tax = (txval * item.taxPercent) / 100
            if (!rateMap.has(item.taxPercent)) rateMap.set(item.taxPercent, { txval: 0, cgst: 0, sgst: 0 })
            const r = rateMap.get(item.taxPercent)!
            r.txval += txval
            r.cgst += tax / 2
            r.sgst += tax / 2
        }
    }

    const rateData = [
        ["GST Rate (%)", "Taxable Value", "CGST", "SGST", "Total ITC"],
        ...Array.from(rateMap.entries()).sort(([a], [b]) => a - b).map(([rate, v]) => [
            rate,
            Math.round(v.txval * 100) / 100,
            Math.round(v.cgst * 100) / 100,
            Math.round(v.sgst * 100) / 100,
            Math.round((v.cgst + v.sgst) * 100) / 100,
        ]),
    ]
    const ws2 = XLSX.utils.aoa_to_sheet(rateData)
    ws2["!cols"] = [{ wch: 14 }, { wch: 16 }, { wch: 14 }, { wch: 14 }, { wch: 14 }]
    XLSX.utils.book_append_sheet(wb, ws2, "Rate Summary")

    const buf = XLSX.write(wb, { type: "buffer", bookType: "xlsx" })

    return new NextResponse(buf, {
        status: 200,
        headers: {
            "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            "Content-Disposition": `attachment; filename="GSTR2B_${String(month).padStart(2, '0')}_${year}.xlsx"`,
        },
    })
}
