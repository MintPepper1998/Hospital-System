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
    const fmt = searchParams.get("format") || "excel"

    const { start, end } = getMonthBoundaries(month, year)
    const fp = `${String(month).padStart(2, '0')}${year}`

    const settings = await prisma.hospitalSettings.findFirst({ where: { id: 1 } })
    const gstin = settings?.gstNo || "NOT CONFIGURED"

    // Cancelled invoices
    const cancelledBills = await prisma.billing.findMany({
        where: { type: "PHARMACY", billDate: { gte: start, lte: end }, status: "CANCELLED" },
        include: { items: true, patient: { include: { user: true } } },
        orderBy: { billDate: "asc" },
    })

    // Refunded invoices (credit notes)
    const refundedBills = await prisma.billing.findMany({
        where: { type: "PHARMACY", billDate: { gte: start, lte: end }, status: "REFUNDED" },
        include: { items: true, patient: { include: { user: true } } },
        orderBy: { billDate: "asc" },
    })

    // Amended invoices
    const allPharmacyBills = await prisma.billing.findMany({
        where: { type: "PHARMACY", billDate: { gte: start, lte: end }, status: { notIn: ["CANCELLED", "DRAFT"] } },
        include: { items: true, patient: { include: { user: true } } },
    })
    const amendedBills = allPharmacyBills.filter(b => {
        const diffMs = new Date(b.updatedAt).getTime() - new Date(b.createdAt).getTime()
        return diffMs > 60000
    })

    if (fmt === "json") {
        // GST portal-compatible JSON for GSTR-1A (amendments)
        const cdnur = refundedBills.map(b => {
            const taxableVal = b.items.reduce((s, i) => s + i.amount, 0)
            const gstAmt = b.items.reduce((s, i) => s + i.gstAmount, 0)
            return {
                ntty: "C",
                nt_num: b.billNumber,
                nt_dt: new Date(b.billDate).toLocaleDateString("en-IN"),
                val: Math.round(b.netAmount * 100) / 100,
                pos: "21",
                typ: "B2CL",
                diff_percent: 1,
                itms: [{
                    num: 1,
                    itm_det: {
                        rt: b.items[0]?.gstRate || 0,
                        txval: Math.round(taxableVal * 100) / 100,
                        iamt: 0,
                        camt: Math.round((gstAmt / 2) * 100) / 100,
                        samt: Math.round((gstAmt / 2) * 100) / 100,
                        csamt: 0,
                    },
                }],
            }
        })

        const gstr1aJson = {
            gstin,
            fp,
            cdnur,
            b2b: [],
        }

        return new NextResponse(JSON.stringify(gstr1aJson, null, 2), {
            status: 200,
            headers: {
                "Content-Type": "application/json",
                "Content-Disposition": `attachment; filename="GSTR1A_${gstin}_${fp}.json"`,
            },
        })
    }

    // Excel — 3 sheets: Cancelled, Credit Notes, Amended
    const wb = XLSX.utils.book_new()

    // Sheet 1: Cancelled Invoices
    const cancelledData = [
        ["Invoice No", "Invoice Date", "Patient / Customer", "Taxable Value (INR)", "CGST (INR)", "SGST (INR)", "Invoice Value (INR)"],
        ...cancelledBills.map(b => {
            const txVal = b.items.reduce((s, i) => s + i.amount, 0)
            const gstAmt = b.items.reduce((s, i) => s + i.gstAmount, 0)
            return [
                b.billNumber,
                new Date(b.billDate).toLocaleDateString("en-IN"),
                b.patient?.user?.name || "Walk-In",
                txVal.toFixed(2),
                (gstAmt / 2).toFixed(2),
                (gstAmt / 2).toFixed(2),
                b.netAmount.toFixed(2),
            ]
        }),
    ]
    const cancelWs = XLSX.utils.aoa_to_sheet(cancelledData)
    cancelWs["!cols"] = [{ wch: 20 }, { wch: 14 }, { wch: 25 }, { wch: 20 }, { wch: 14 }, { wch: 14 }, { wch: 18 }]
    XLSX.utils.book_append_sheet(wb, cancelWs, "Cancelled Invoices")

    // Sheet 2: Credit Notes (Refunds)
    const creditData = [
        ["Original Invoice No", "Date", "Patient / Customer", "Taxable Value (INR)", "CGST (INR)", "SGST (INR)", "Credit Note Value (INR)"],
        ...refundedBills.map(b => {
            const txVal = b.items.reduce((s, i) => s + i.amount, 0)
            const gstAmt = b.items.reduce((s, i) => s + i.gstAmount, 0)
            return [
                b.billNumber,
                new Date(b.billDate).toLocaleDateString("en-IN"),
                b.patient?.user?.name || "Walk-In",
                txVal.toFixed(2),
                (gstAmt / 2).toFixed(2),
                (gstAmt / 2).toFixed(2),
                b.netAmount.toFixed(2),
            ]
        }),
    ]
    const creditWs = XLSX.utils.aoa_to_sheet(creditData)
    creditWs["!cols"] = [{ wch: 22 }, { wch: 14 }, { wch: 25 }, { wch: 20 }, { wch: 14 }, { wch: 14 }, { wch: 20 }]
    XLSX.utils.book_append_sheet(wb, creditWs, "Credit Notes")

    // Sheet 3: Amended Invoices
    const amendedData = [
        ["Invoice No", "Invoice Date", "Last Modified", "Patient / Customer", "Taxable Value (INR)", "Total Tax (INR)", "Invoice Value (INR)"],
        ...amendedBills.map(b => {
            const txVal = b.items.reduce((s, i) => s + i.amount, 0)
            const gstAmt = b.items.reduce((s, i) => s + i.gstAmount, 0)
            return [
                b.billNumber,
                new Date(b.billDate).toLocaleDateString("en-IN"),
                new Date(b.updatedAt).toLocaleDateString("en-IN"),
                b.patient?.user?.name || "Walk-In",
                txVal.toFixed(2),
                gstAmt.toFixed(2),
                b.netAmount.toFixed(2),
            ]
        }),
    ]
    const amendedWs = XLSX.utils.aoa_to_sheet(amendedData)
    amendedWs["!cols"] = [{ wch: 20 }, { wch: 14 }, { wch: 16 }, { wch: 25 }, { wch: 20 }, { wch: 16 }, { wch: 18 }]
    XLSX.utils.book_append_sheet(wb, amendedWs, "Amended Invoices")

    const buf = XLSX.write(wb, { type: "buffer", bookType: "xlsx" })

    return new NextResponse(buf, {
        status: 200,
        headers: {
            "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            "Content-Disposition": `attachment; filename="GSTR1A_${String(month).padStart(2, '0')}_${year}.xlsx"`,
        },
    })
}
