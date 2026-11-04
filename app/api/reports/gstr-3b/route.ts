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

function getStateCode(gstin: string | null): string {
    if (gstin && gstin.length >= 2 && /^\d{2}$/.test(gstin.substring(0, 2))) return gstin.substring(0, 2)
    return "21"
}

export async function GET(request: NextRequest) {
    try {
        await requireAuth(["SUPER_ADMIN", "ACCOUNTANT"])
    } catch {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { searchParams } = request.nextUrl
    const format = searchParams.get("format") || "json"
    const todayIst = new Date(new Date().toLocaleString("en-US", { timeZone: "Asia/Kolkata" }))
    const month = Number(searchParams.get("month") || todayIst.getMonth() + 1)
    const year = Number(searchParams.get("year") || todayIst.getFullYear())

    const { start, end } = getMonthBoundaries(month, year)
    const fp = `${String(month).padStart(2, '0')}${year}`

    const settings = await prisma.hospitalSettings.findFirst({ where: { id: 1 } })
    const gstin = settings?.gstNo || ""
    const stateCode = getStateCode(gstin)

    // Outward supplies
    const outwardBills = await prisma.billing.findMany({
        where: { type: "PHARMACY", billDate: { gte: start, lte: end }, status: { notIn: ["CANCELLED", "DRAFT"] } },
        include: { items: true },
    })

    let outTaxable = 0, outCgst = 0, outSgst = 0
    for (const bill of outwardBills) {
        for (const item of bill.items) {
            if (item.gstRate === 0 && item.description.startsWith("Lab Test:")) continue
            outTaxable += item.amount
            outCgst += item.gstAmount / 2
            outSgst += item.gstAmount / 2
        }
    }

    // Nil-rated
    let nilVal = 0
    for (const bill of outwardBills) {
        for (const item of bill.items) {
            if (item.gstRate === 0) nilVal += item.amount
        }
    }

    // Exempt services
    const labBills = await prisma.billing.findMany({
        where: { type: "LABORATORY", billDate: { gte: start, lte: end }, status: { notIn: ["CANCELLED", "DRAFT"] } },
    })
    const opdBills = await prisma.billing.findMany({
        where: { type: "OPD", billDate: { gte: start, lte: end }, status: { notIn: ["CANCELLED", "DRAFT"] } },
    })
    const exemptVal = labBills.reduce((s, b) => s + b.netAmount, 0) + opdBills.reduce((s, b) => s + b.netAmount, 0) + nilVal

    // ITC
    const purchases = await prisma.purchaseInvoice.findMany({
        where: { date: { gte: start, lte: end }, supplier: { gstNumber: { not: null } } },
        include: { items: true },
    })

    let itcCgst = 0, itcSgst = 0
    for (const inv of purchases) {
        for (const item of inv.items) {
            const tax = (item.quantity * item.rate * item.taxPercent) / 100
            itcCgst += tax / 2
            itcSgst += tax / 2
        }
    }

    const netCgst = Math.max(outCgst - itcCgst, 0)
    const netSgst = Math.max(outSgst - itcSgst, 0)

    const round = (v: number) => Math.round(v * 100) / 100

    if (format === "json") {
        // Official GSTR-3B JSON format
        const gstr3b = {
            gstin: gstin,
            ret_period: fp,
            sup_details: {
                osup_det: {
                    txval: round(outTaxable),
                    camt: round(outCgst),
                    samt: round(outSgst),
                    iamt: 0,
                    csamt: 0,
                },
                osup_zero: { txval: 0, camt: 0, samt: 0, iamt: 0, csamt: 0 },
                osup_nil_exmp: { txval: round(exemptVal) },
                isup_rev: { txval: 0, camt: 0, samt: 0, iamt: 0, csamt: 0 },
                osup_nongst: { txval: 0 },
            },
            itc_elg: {
                itc_avl: [
                    { ty: "IMPG", iamt: 0, camt: 0, samt: 0, csamt: 0 },
                    { ty: "IMPS", iamt: 0, camt: 0, samt: 0, csamt: 0 },
                    { ty: "ISRC", iamt: 0, camt: 0, samt: 0, csamt: 0 },
                    { ty: "ISD", iamt: 0, camt: 0, samt: 0, csamt: 0 },
                    { ty: "OTH", iamt: 0, camt: round(itcCgst), samt: round(itcSgst), csamt: 0 },
                ],
                itc_rev: [
                    { ty: "RUL", iamt: 0, camt: 0, samt: 0, csamt: 0 },
                    { ty: "OTH", iamt: 0, camt: 0, samt: 0, csamt: 0 },
                ],
                itc_net: { iamt: 0, camt: round(itcCgst), samt: round(itcSgst), csamt: 0 },
                itc_inelg: [
                    { ty: "RUL", iamt: 0, camt: 0, samt: 0, csamt: 0 },
                    { ty: "OTH", iamt: 0, camt: 0, samt: 0, csamt: 0 },
                ],
            },
            intr_ltfee: {
                intr_details: { iamt: 0, camt: 0, samt: 0, csamt: 0 },
                ltfee_details: { iamt: 0, camt: 0, samt: 0, csamt: 0 },
            },
            tax_pmt: {
                tx: [
                    {
                        tx_ty: "CGST",
                        tx_payable: round(outCgst),
                        paid_cash: round(netCgst),
                        paid_itc: round(Math.min(itcCgst, outCgst)),
                    },
                    {
                        tx_ty: "SGST",
                        tx_payable: round(outSgst),
                        paid_cash: round(netSgst),
                        paid_itc: round(Math.min(itcSgst, outSgst)),
                    },
                    { tx_ty: "IGST", tx_payable: 0, paid_cash: 0, paid_itc: 0 },
                    { tx_ty: "CESS", tx_payable: 0, paid_cash: 0, paid_itc: 0 },
                ],
            },
        }

        return new NextResponse(JSON.stringify(gstr3b, null, 2), {
            status: 200,
            headers: {
                "Content-Type": "application/json",
                "Content-Disposition": `attachment; filename="GSTR3B_${gstin}_${fp}.json"`,
            },
        })
    }

    // Excel format
    const wb = XLSX.utils.book_new()

    // Sheet 1: 3.1 Outward Supplies
    const s1Data = [
        ["Nature of Supplies", "Taxable Value", "CGST", "SGST", "IGST", "Cess"],
        ["(a) Outward taxable supplies", round(outTaxable), round(outCgst), round(outSgst), 0, 0],
        ["(b) Outward taxable supplies (zero rated)", 0, 0, 0, 0, 0],
        ["(c) Exempt / Nil rated", round(exemptVal), 0, 0, 0, 0],
        ["(d) Inward supplies (reverse charge)", 0, 0, 0, 0, 0],
        ["(e) Non-GST outward supplies", 0, 0, 0, 0, 0],
    ]
    const ws1 = XLSX.utils.aoa_to_sheet(s1Data)
    ws1["!cols"] = [{ wch: 40 }, { wch: 16 }, { wch: 14 }, { wch: 14 }, { wch: 10 }, { wch: 10 }]
    XLSX.utils.book_append_sheet(wb, ws1, "3.1 Outward Supplies")

    // Sheet 2: 4 ITC
    const s2Data = [
        ["Details", "CGST", "SGST", "IGST", "Cess"],
        ["(A) ITC Available", round(itcCgst), round(itcSgst), 0, 0],
        ["(B) ITC Reversed", 0, 0, 0, 0],
        ["(C) Net ITC (A-B)", round(itcCgst), round(itcSgst), 0, 0],
    ]
    const ws2 = XLSX.utils.aoa_to_sheet(s2Data)
    ws2["!cols"] = [{ wch: 30 }, { wch: 14 }, { wch: 14 }, { wch: 10 }, { wch: 10 }]
    XLSX.utils.book_append_sheet(wb, ws2, "4 ITC")

    // Sheet 3: 6.1 Tax Payment
    const s3Data = [
        ["Description", "CGST", "SGST", "IGST", "Cess"],
        ["Tax payable", round(outCgst), round(outSgst), 0, 0],
        ["Paid through ITC", round(Math.min(itcCgst, outCgst)), round(Math.min(itcSgst, outSgst)), 0, 0],
        ["Tax payable in cash", round(netCgst), round(netSgst), 0, 0],
    ]
    const ws3 = XLSX.utils.aoa_to_sheet(s3Data)
    ws3["!cols"] = [{ wch: 25 }, { wch: 14 }, { wch: 14 }, { wch: 10 }, { wch: 10 }]
    XLSX.utils.book_append_sheet(wb, ws3, "6.1 Tax Payment")

    const buf = XLSX.write(wb, { type: "buffer", bookType: "xlsx" })

    return new NextResponse(buf, {
        status: 200,
        headers: {
            "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            "Content-Disposition": `attachment; filename="GSTR3B_${String(month).padStart(2, '0')}_${year}.xlsx"`,
        },
    })
}
