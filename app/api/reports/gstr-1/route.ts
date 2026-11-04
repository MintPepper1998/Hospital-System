import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireAuth } from "@/lib/auth-guard"
import * as XLSX from "xlsx"

// ── IST month boundaries ──
function getMonthBoundaries(month: number, year: number) {
    const startIst = `${year}-${String(month).padStart(2, '0')}-01T00:00:00+05:30`
    const lastDay = new Date(year, month, 0).getDate()
    const endIst = `${year}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}T23:59:59.999+05:30`
    return { start: new Date(startIst), end: new Date(endIst) }
}

// ── Extract medicine name from billing item description ──
function extractMedicineName(desc: string): string {
    const match = desc.match(/^(.+?)\s*\(Batch:/)
    return match ? match[1].trim() : desc
}

// ── Indian state code mapping ──
const STATE_CODES: Record<string, string> = {
    "andhra pradesh": "37", "arunachal pradesh": "12", "assam": "18",
    "bihar": "10", "chhattisgarh": "22", "goa": "30", "gujarat": "24",
    "haryana": "06", "himachal pradesh": "02", "jharkhand": "20",
    "karnataka": "29", "kerala": "32", "madhya pradesh": "23",
    "maharashtra": "27", "manipur": "14", "meghalaya": "17",
    "mizoram": "15", "nagaland": "13", "odisha": "21", "punjab": "03",
    "rajasthan": "08", "sikkim": "11", "tamil nadu": "33",
    "telangana": "36", "tripura": "16", "uttar pradesh": "09",
    "uttarakhand": "05", "west bengal": "19", "delhi": "07",
    "jammu and kashmir": "01", "ladakh": "38", "chandigarh": "04",
    "puducherry": "34", "lakshadweep": "31",
    "andaman and nicobar islands": "35", "dadra and nagar haveli": "26",
    "daman and diu": "25",
}

function getStateCode(gstin: string | null, stateName: string | null): string {
    // First two digits of GSTIN are the state code
    if (gstin && gstin.length >= 2) {
        const code = gstin.substring(0, 2)
        if (/^\d{2}$/.test(code)) return code
    }
    if (stateName) {
        const code = STATE_CODES[stateName.toLowerCase().trim()]
        if (code) return code
    }
    return "21" // Default: Odisha (BSKY state)
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
    const fp = `${String(month).padStart(2, '0')}${year}` // Filing period MMYYYY

    // ── Fetch hospital settings ──
    const settings = await prisma.hospitalSettings.findFirst({ where: { id: 1 } })
    const gstin = settings?.gstNo || ""
    const stateCode = getStateCode(gstin, settings?.address || null)

    // ── Fetch pharmacy billings ──
    const billings = await prisma.billing.findMany({
        where: {
            type: "PHARMACY",
            billDate: { gte: start, lte: end },
            status: { notIn: ["CANCELLED", "DRAFT"] },
        },
        include: {
            items: true,
            patient: { include: { user: true } },
        },
        orderBy: { billDate: "asc" },
    })

    const cancelledCount = await prisma.billing.count({
        where: {
            type: "PHARMACY",
            billDate: { gte: start, lte: end },
            status: "CANCELLED",
        },
    })

    // ── Medicine HSN map ──
    const medicines = await prisma.medicine.findMany({
        select: { name: true, hsnCode: true },
    })
    const hsnMap = new Map<string, string>()
    for (const med of medicines) {
        if (med.hsnCode) hsnMap.set(med.name.toLowerCase(), med.hsnCode)
    }

    function lookupHsn(desc: string): string {
        const name = extractMedicineName(desc).toLowerCase()
        return hsnMap.get(name) || "30049099"
    }

    // ─────────────────────────────────────────────
    // FORMAT: GST Portal JSON
    // ─────────────────────────────────────────────
    if (format === "json") {
        // B2CS: Aggregate by rate (all pharmacy = B2C Small, intra-state)
        const b2csMap = new Map<number, { txval: number; camt: number; samt: number }>()

        for (const bill of billings) {
            for (const item of bill.items) {
                if (item.gstRate === 0 && item.description.startsWith("Lab Test:")) continue
                const rate = item.gstRate
                if (!b2csMap.has(rate)) b2csMap.set(rate, { txval: 0, camt: 0, samt: 0 })
                const bucket = b2csMap.get(rate)!
                bucket.txval += item.amount
                bucket.camt += item.gstAmount / 2
                bucket.samt += item.gstAmount / 2
            }
        }

        const b2cs = Array.from(b2csMap.entries()).map(([rate, val]) => ({
            sply_ty: "INTRA",
            pos: stateCode,
            typ: "OE",
            txval: Math.round(val.txval * 100) / 100,
            rt: rate,
            iamt: 0,
            camt: Math.round(val.camt * 100) / 100,
            samt: Math.round(val.samt * 100) / 100,
            csamt: 0,
        }))

        // HSN summary
        const hsnAgg = new Map<string, {
            hsn_sc: string; desc: string; uqc: string; qty: number
            val: number; txval: number; camt: number; samt: number; rt: number
        }>()

        for (const bill of billings) {
            for (const item of bill.items) {
                if (item.gstRate === 0 && item.description.startsWith("Lab Test:")) continue
                const hsn = lookupHsn(item.description)
                const key = `${hsn}_${item.gstRate}`
                if (!hsnAgg.has(key)) {
                    hsnAgg.set(key, {
                        hsn_sc: hsn,
                        desc: extractMedicineName(item.description),
                        uqc: "NOS-NUMBERS",
                        qty: 0,
                        val: 0,
                        txval: 0,
                        camt: 0,
                        samt: 0,
                        rt: item.gstRate,
                    })
                }
                const h = hsnAgg.get(key)!
                h.qty += item.quantity
                h.val += item.totalAmount
                h.txval += item.amount
                h.camt += item.gstAmount / 2
                h.samt += item.gstAmount / 2
            }
        }

        const hsnData = Array.from(hsnAgg.values()).map((h, i) => ({
            num: i + 1,
            hsn_sc: h.hsn_sc,
            desc: h.desc,
            uqc: h.uqc,
            qty: Math.round(h.qty * 100) / 100,
            val: Math.round(h.val * 100) / 100,
            txval: Math.round(h.txval * 100) / 100,
            iamt: 0,
            camt: Math.round(h.camt * 100) / 100,
            samt: Math.round(h.samt * 100) / 100,
            csamt: 0,
            rt: h.rt,
        }))

        // Doc issue
        const billNumbers = billings.map(b => b.billNumber)
        const docIssue = {
            doc_det: [
                {
                    doc_num: 1,
                    doc_typ: "Invoices for outward supply",
                    docs: [
                        {
                            num: 1,
                            from: billNumbers[0] || "",
                            to: billNumbers[billNumbers.length - 1] || "",
                            totnum: billings.length + cancelledCount,
                            cancel: cancelledCount,
                            net_issue: billings.length,
                        },
                    ],
                },
            ],
        }

        // Compute grand total
        let gt = 0
        for (const bill of billings) {
            gt += bill.netAmount
        }

        // Final GSTR-1 JSON — official GST portal format
        const gstr1Json = {
            gstin: gstin,
            fp: fp,
            gt: Math.round(gt * 100) / 100,
            cur_gt: Math.round(gt * 100) / 100,
            b2b: [],
            b2cl: [],
            b2cs: b2cs,
            cdnr: [],
            cdnur: [],
            exp: [],
            at: [],
            txpd: [],
            hsn: {
                data: hsnData,
            },
            nil: {
                inv: [
                    {
                        sply_ty: "INTRB2B",
                        nil_amt: 0,
                        expt_amt: 0,
                        ngsup_amt: 0,
                    },
                    {
                        sply_ty: "INTRB2C",
                        nil_amt: 0,
                        expt_amt: 0,
                        ngsup_amt: 0,
                    },
                ],
            },
            doc_issue: docIssue,
        }

        const jsonString = JSON.stringify(gstr1Json, null, 2)

        return new NextResponse(jsonString, {
            status: 200,
            headers: {
                "Content-Type": "application/json",
                "Content-Disposition": `attachment; filename="GSTR1_${gstin}_${fp}.json"`,
            },
        })
    }

    // ─────────────────────────────────────────────
    // FORMAT: HSN Summary Excel
    // ─────────────────────────────────────────────
    if (format === "hsn") {
        const hsnAgg = new Map<string, {
            hsnCode: string; description: string; uqc: string; qty: number
            taxableValue: number; rate: number; cgst: number; sgst: number; totalValue: number
        }>()

        for (const bill of billings) {
            for (const item of bill.items) {
                if (item.gstRate === 0 && item.description.startsWith("Lab Test:")) continue
                const hsn = lookupHsn(item.description)
                const key = `${hsn}_${item.gstRate}`
                if (!hsnAgg.has(key)) {
                    hsnAgg.set(key, {
                        hsnCode: hsn,
                        description: extractMedicineName(item.description),
                        uqc: "NOS",
                        qty: 0,
                        taxableValue: 0,
                        rate: item.gstRate,
                        cgst: 0,
                        sgst: 0,
                        totalValue: 0,
                    })
                }
                const h = hsnAgg.get(key)!
                h.qty += item.quantity
                h.taxableValue += item.amount
                h.cgst += item.gstAmount / 2
                h.sgst += item.gstAmount / 2
                h.totalValue += item.totalAmount
            }
        }

        const rows = Array.from(hsnAgg.values()).sort((a, b) => a.hsnCode.localeCompare(b.hsnCode))

        const wsData = [
            ["HSN Code", "Description", "UQC", "Total Qty", "Taxable Value", "Rate (%)", "CGST", "SGST", "Total Value"],
            ...rows.map(r => [
                r.hsnCode, r.description, r.uqc, r.qty,
                Math.round(r.taxableValue * 100) / 100,
                r.rate,
                Math.round(r.cgst * 100) / 100,
                Math.round(r.sgst * 100) / 100,
                Math.round(r.totalValue * 100) / 100,
            ]),
        ]

        const wb = XLSX.utils.book_new()
        const ws = XLSX.utils.aoa_to_sheet(wsData)

        // Column widths
        ws["!cols"] = [
            { wch: 12 }, { wch: 30 }, { wch: 8 }, { wch: 10 },
            { wch: 16 }, { wch: 10 }, { wch: 14 }, { wch: 14 }, { wch: 16 },
        ]

        XLSX.utils.book_append_sheet(wb, ws, "HSN Summary")
        const buf = XLSX.write(wb, { type: "buffer", bookType: "xlsx" })

        return new NextResponse(buf, {
            status: 200,
            headers: {
                "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                "Content-Disposition": `attachment; filename="GSTR1_HSN_${String(month).padStart(2, '0')}_${year}.xlsx"`,
            },
        })
    }

    // ─────────────────────────────────────────────
    // FORMAT: Full GSTR-1 Excel (default)
    // ─────────────────────────────────────────────
    const wb = XLSX.utils.book_new()

    // ── Sheet 1: B2CS ──
    const b2csRateMap = new Map<number, { txval: number; cgst: number; sgst: number; count: number }>()
    for (const bill of billings) {
        const ratesInBill = new Set<number>()
        for (const item of bill.items) {
            if (item.gstRate === 0 && item.description.startsWith("Lab Test:")) continue
            const rate = item.gstRate
            if (!b2csRateMap.has(rate)) b2csRateMap.set(rate, { txval: 0, cgst: 0, sgst: 0, count: 0 })
            const b = b2csRateMap.get(rate)!
            b.txval += item.amount
            b.cgst += item.gstAmount / 2
            b.sgst += item.gstAmount / 2
            ratesInBill.add(rate)
        }
        for (const r of ratesInBill) {
            b2csRateMap.get(r)!.count += 1
        }
    }

    const b2csData = [
        ["Type", "Place of Supply", "Rate (%)", "Taxable Value", "CGST", "SGST", "IGST", "Cess", "No. of Invoices"],
        ...Array.from(b2csRateMap.entries())
            .sort(([a], [b]) => a - b)
            .map(([rate, val]) => [
                "OE", stateCode, rate,
                Math.round(val.txval * 100) / 100,
                Math.round(val.cgst * 100) / 100,
                Math.round(val.sgst * 100) / 100,
                0, 0, val.count,
            ]),
    ]
    const b2csWs = XLSX.utils.aoa_to_sheet(b2csData)
    b2csWs["!cols"] = [
        { wch: 8 }, { wch: 18 }, { wch: 10 }, { wch: 16 },
        { wch: 14 }, { wch: 14 }, { wch: 10 }, { wch: 8 }, { wch: 16 },
    ]
    XLSX.utils.book_append_sheet(wb, b2csWs, "B2CS")

    // ── Sheet 2: HSN Summary ──
    const hsnAggExcel = new Map<string, {
        hsnCode: string; desc: string; uqc: string; qty: number
        txval: number; rate: number; cgst: number; sgst: number; totalVal: number
    }>()
    for (const bill of billings) {
        for (const item of bill.items) {
            if (item.gstRate === 0 && item.description.startsWith("Lab Test:")) continue
            const hsn = lookupHsn(item.description)
            const key = `${hsn}_${item.gstRate}`
            if (!hsnAggExcel.has(key)) {
                hsnAggExcel.set(key, {
                    hsnCode: hsn, desc: extractMedicineName(item.description), uqc: "NOS",
                    qty: 0, txval: 0, rate: item.gstRate, cgst: 0, sgst: 0, totalVal: 0,
                })
            }
            const h = hsnAggExcel.get(key)!
            h.qty += item.quantity
            h.txval += item.amount
            h.cgst += item.gstAmount / 2
            h.sgst += item.gstAmount / 2
            h.totalVal += item.totalAmount
        }
    }

    const hsnSheetData = [
        ["HSN Code", "Description", "UQC", "Total Qty", "Taxable Value", "Rate (%)", "CGST", "SGST", "IGST", "Cess", "Total Value"],
        ...Array.from(hsnAggExcel.values())
            .sort((a, b) => a.hsnCode.localeCompare(b.hsnCode))
            .map(h => [
                h.hsnCode, h.desc, h.uqc, h.qty,
                Math.round(h.txval * 100) / 100, h.rate,
                Math.round(h.cgst * 100) / 100,
                Math.round(h.sgst * 100) / 100,
                0, 0,
                Math.round(h.totalVal * 100) / 100,
            ]),
    ]
    const hsnWs = XLSX.utils.aoa_to_sheet(hsnSheetData)
    hsnWs["!cols"] = [
        { wch: 12 }, { wch: 30 }, { wch: 8 }, { wch: 10 },
        { wch: 16 }, { wch: 10 }, { wch: 14 }, { wch: 14 },
        { wch: 10 }, { wch: 8 }, { wch: 16 },
    ]
    XLSX.utils.book_append_sheet(wb, hsnWs, "HSN Summary")

    // ── Sheet 3: Doc Issue ──
    const billNumbers = billings.map(b => b.billNumber)
    const docData = [
        ["Document Type", "Sr. No. From", "Sr. No. To", "Total Number", "Cancelled", "Net Issued"],
        [
            "Invoices for outward supply",
            billNumbers[0] || "",
            billNumbers[billNumbers.length - 1] || "",
            billings.length + cancelledCount,
            cancelledCount,
            billings.length,
        ],
    ]
    const docWs = XLSX.utils.aoa_to_sheet(docData)
    docWs["!cols"] = [
        { wch: 32 }, { wch: 20 }, { wch: 20 }, { wch: 14 }, { wch: 12 }, { wch: 12 },
    ]
    XLSX.utils.book_append_sheet(wb, docWs, "Doc Issued")

    // ── Sheet 4: Invoice Details ──
    const invRows = billings.map(bill => {
        const taxableVal = bill.items
            .filter(i => !(i.gstRate === 0 && i.description.startsWith("Lab Test:")))
            .reduce((s, i) => s + i.amount, 0)
        const totalGst = bill.items
            .filter(i => !(i.gstRate === 0 && i.description.startsWith("Lab Test:")))
            .reduce((s, i) => s + i.gstAmount, 0)

        return [
            bill.billNumber,
            new Date(bill.billDate).toLocaleDateString("en-IN"),
            bill.patient?.user?.name || "Walk-In",
            Math.round(taxableVal * 100) / 100,
            Math.round((totalGst / 2) * 100) / 100,
            Math.round((totalGst / 2) * 100) / 100,
            0,
            Math.round(bill.netAmount * 100) / 100,
            bill.status,
            bill.paymentMethod || "CASH",
        ]
    })

    const invData = [
        ["Invoice No", "Invoice Date", "Patient/Customer", "Taxable Value", "CGST", "SGST", "IGST", "Invoice Value", "Status", "Payment Method"],
        ...invRows,
    ]
    const invWs = XLSX.utils.aoa_to_sheet(invData)
    invWs["!cols"] = [
        { wch: 20 }, { wch: 14 }, { wch: 25 }, { wch: 16 },
        { wch: 14 }, { wch: 14 }, { wch: 10 }, { wch: 16 },
        { wch: 14 }, { wch: 16 },
    ]
    XLSX.utils.book_append_sheet(wb, invWs, "Invoice Details")

    const buf = XLSX.write(wb, { type: "buffer", bookType: "xlsx" })

    return new NextResponse(buf, {
        status: 200,
        headers: {
            "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            "Content-Disposition": `attachment; filename="GSTR1_${String(month).padStart(2, '0')}_${year}.xlsx"`,
        },
    })
}
