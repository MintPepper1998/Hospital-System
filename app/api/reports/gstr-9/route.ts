import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireAuth } from "@/lib/auth-guard"
import * as XLSX from "xlsx"

function getFyBoundaries(fyStartYear: number) {
    const startIst = `${fyStartYear}-04-01T00:00:00+05:30`
    const endIst = `${fyStartYear + 1}-03-31T23:59:59.999+05:30`
    return { start: new Date(startIst), end: new Date(endIst) }
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
    const currentMonth = todayIst.getMonth() + 1
    const defaultFy = currentMonth >= 4 ? todayIst.getFullYear() - 1 : todayIst.getFullYear() - 2
    const fyStartYear = Number(searchParams.get("fy") || defaultFy)

    const { start, end } = getFyBoundaries(fyStartYear)

    const settings = await prisma.hospitalSettings.findFirst({ where: { id: 1 } })
    const gstin = settings?.gstNo || ""

    // Outward supplies
    const outwardBills = await prisma.billing.findMany({
        where: { type: "PHARMACY", billDate: { gte: start, lte: end }, status: { notIn: ["CANCELLED", "DRAFT"] } },
        include: { items: true },
        orderBy: { billDate: "asc" },
    })

    let annualTaxable = 0, annualCgst = 0, annualSgst = 0

    const monthNames = ["Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec", "Jan", "Feb", "Mar"]
    const monthlyMap = new Map<string, { month: string; txval: number; cgst: number; sgst: number; count: number }>()

    for (let i = 0; i < 12; i++) {
        const monthIdx = (3 + i) % 12
        const yr = monthIdx >= 3 ? fyStartYear : fyStartYear + 1
        const key = `${yr}-${String(monthIdx + 1).padStart(2, '0')}`
        monthlyMap.set(key, { month: `${monthNames[i]} ${yr}`, txval: 0, cgst: 0, sgst: 0, count: 0 })
    }

    for (const bill of outwardBills) {
        const d = new Date(new Date(bill.billDate).toLocaleString("en-US", { timeZone: "Asia/Kolkata" }))
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
        const mb = monthlyMap.get(key)

        for (const item of bill.items) {
            if (item.gstRate === 0 && item.description.startsWith("Lab Test:")) continue
            annualTaxable += item.amount
            annualCgst += item.gstAmount / 2
            annualSgst += item.gstAmount / 2
            if (mb) {
                mb.txval += item.amount
                mb.cgst += item.gstAmount / 2
                mb.sgst += item.gstAmount / 2
                mb.count += 1
            }
        }
        if (mb) mb.count = (mb.count > 0 ? mb.count : 0) // already counted above per item, fix below
    }

    // Fix invoice count (count per bill not per item)
    const monthlyCountMap = new Map<string, number>()
    for (const bill of outwardBills) {
        const d = new Date(new Date(bill.billDate).toLocaleString("en-US", { timeZone: "Asia/Kolkata" }))
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
        monthlyCountMap.set(key, (monthlyCountMap.get(key) || 0) + 1)
    }
    for (const [key, count] of monthlyCountMap) {
        const mb = monthlyMap.get(key)
        if (mb) mb.count = count
    }

    // ITC
    const purchases = await prisma.purchaseInvoice.findMany({
        where: { date: { gte: start, lte: end } },
        include: { items: true },
    })

    let itcCgst = 0, itcSgst = 0, itcTaxable = 0
    for (const inv of purchases) {
        for (const item of inv.items) {
            const txval = item.quantity * item.rate
            const tax = (txval * item.taxPercent) / 100
            itcTaxable += txval
            itcCgst += tax / 2
            itcSgst += tax / 2
        }
    }

    const netCgst = Math.max(annualCgst - itcCgst, 0)
    const netSgst = Math.max(annualSgst - itcSgst, 0)

    const round = (v: number) => Math.round(v * 100) / 100

    if (format === "json") {
        const gstr9 = {
            gstin: gstin,
            fp: `${fyStartYear}${fyStartYear + 1}`,
            table4: {
                taxable_outward_supplies: {
                    txval: round(annualTaxable),
                    camt: round(annualCgst),
                    samt: round(annualSgst),
                    iamt: 0,
                    csamt: 0,
                },
                zero_rated_supplies: { txval: 0, camt: 0, samt: 0, iamt: 0, csamt: 0 },
            },
            table6: {
                total_itc_availed: {
                    txval: round(itcTaxable),
                    camt: round(itcCgst),
                    samt: round(itcSgst),
                    iamt: 0,
                    csamt: 0,
                },
                itc_reversed: { camt: 0, samt: 0, iamt: 0, csamt: 0 },
                net_itc: {
                    camt: round(itcCgst),
                    samt: round(itcSgst),
                    iamt: 0,
                    csamt: 0,
                },
            },
            table9: {
                tax_payable: {
                    camt: round(annualCgst),
                    samt: round(annualSgst),
                    iamt: 0,
                    csamt: 0,
                },
                paid_through_itc: {
                    camt: round(Math.min(itcCgst, annualCgst)),
                    samt: round(Math.min(itcSgst, annualSgst)),
                    iamt: 0,
                    csamt: 0,
                },
                paid_in_cash: {
                    camt: round(netCgst),
                    samt: round(netSgst),
                    iamt: 0,
                    csamt: 0,
                },
            },
        }

        return new NextResponse(JSON.stringify(gstr9, null, 2), {
            status: 200,
            headers: {
                "Content-Type": "application/json",
                "Content-Disposition": `attachment; filename="GSTR9_${gstin}_${fyStartYear}_${fyStartYear + 1}.json"`,
            },
        })
    }

    // Excel
    const wb = XLSX.utils.book_new()

    // Sheet 1: Monthly Breakdown
    const monthlyRows = Array.from(monthlyMap.values())
    const s1Data = [
        ["Month", "Invoices", "Taxable Value", "CGST", "SGST", "Total Tax"],
        ...monthlyRows.map(m => [
            m.month, m.count, round(m.txval), round(m.cgst), round(m.sgst), round(m.cgst + m.sgst),
        ]),
        ["Annual Total", outwardBills.length, round(annualTaxable), round(annualCgst), round(annualSgst), round(annualCgst + annualSgst)],
    ]
    const ws1 = XLSX.utils.aoa_to_sheet(s1Data)
    ws1["!cols"] = [{ wch: 14 }, { wch: 12 }, { wch: 16 }, { wch: 14 }, { wch: 14 }, { wch: 14 }]
    XLSX.utils.book_append_sheet(wb, ws1, "Monthly Outward")

    // Sheet 2: ITC Summary
    const s2Data = [
        ["Description", "Taxable Value", "CGST", "SGST", "IGST"],
        ["Total ITC availed", round(itcTaxable), round(itcCgst), round(itcSgst), 0],
        ["ITC reversed", 0, 0, 0, 0],
        ["Net ITC", round(itcTaxable), round(itcCgst), round(itcSgst), 0],
    ]
    const ws2 = XLSX.utils.aoa_to_sheet(s2Data)
    ws2["!cols"] = [{ wch: 25 }, { wch: 16 }, { wch: 14 }, { wch: 14 }, { wch: 10 }]
    XLSX.utils.book_append_sheet(wb, ws2, "ITC Summary")

    // Sheet 3: Tax Payment
    const s3Data = [
        ["Description", "CGST", "SGST", "Total"],
        ["Tax liability", round(annualCgst), round(annualSgst), round(annualCgst + annualSgst)],
        ["Paid through ITC", round(Math.min(itcCgst, annualCgst)), round(Math.min(itcSgst, annualSgst)), round(Math.min(itcCgst, annualCgst) + Math.min(itcSgst, annualSgst))],
        ["Paid in cash", round(netCgst), round(netSgst), round(netCgst + netSgst)],
    ]
    const ws3 = XLSX.utils.aoa_to_sheet(s3Data)
    ws3["!cols"] = [{ wch: 22 }, { wch: 14 }, { wch: 14 }, { wch: 14 }]
    XLSX.utils.book_append_sheet(wb, ws3, "Tax Payment")

    const buf = XLSX.write(wb, { type: "buffer", bookType: "xlsx" })

    return new NextResponse(buf, {
        status: 200,
        headers: {
            "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            "Content-Disposition": `attachment; filename="GSTR9_FY${fyStartYear}_${fyStartYear + 1}.xlsx"`,
        },
    })
}
