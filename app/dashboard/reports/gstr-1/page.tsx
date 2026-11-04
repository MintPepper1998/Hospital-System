import { prisma } from "@/lib/prisma"
import { requireAuth } from "@/lib/auth-guard"
import { Gstr1Client } from "./gstr1-client"

// ── IST boundary helpers ──
function getMonthBoundaries(month: number, year: number) {
    const startIst = `${year}-${String(month).padStart(2, '0')}-01T00:00:00+05:30`
    // Last day of month
    const lastDay = new Date(year, month, 0).getDate()
    const endIst = `${year}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}T23:59:59.999+05:30`
    return { start: new Date(startIst), end: new Date(endIst) }
}

// ── Types ──
interface RateBucket {
    rate: number
    taxableValue: number
    cgst: number
    sgst: number
    totalTax: number
    invoiceCount: number
}

interface HsnBucket {
    hsnCode: string
    description: string
    uqc: string
    quantity: number
    taxableValue: number
    rate: number
    cgst: number
    sgst: number
    totalValue: number
}

export default async function Gstr1Page({
    searchParams,
}: {
    searchParams: Promise<{ month?: string; year?: string }>
}) {
    await requireAuth(["SUPER_ADMIN", "ACCOUNTANT"])

    const params = await searchParams

    const todayIst = new Date(new Date().toLocaleString("en-US", { timeZone: "Asia/Kolkata" }))
    const selectedMonth = params.month ? Number(params.month) : todayIst.getMonth() + 1
    const selectedYear = params.year ? Number(params.year) : todayIst.getFullYear()

    const { start, end } = getMonthBoundaries(selectedMonth, selectedYear)

    // ── Fetch hospital GSTIN ──
    const settings = await prisma.hospitalSettings.findFirst({ where: { id: 1 } })
    const gstin = settings?.gstNo || "NOT CONFIGURED"

    // ── Fetch pharmacy billings for the period ──
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

    // Count cancelled invoices in range for doc_issue
    const cancelledCount = await prisma.billing.count({
        where: {
            type: "PHARMACY",
            billDate: { gte: start, lte: end },
            status: "CANCELLED",
        },
    })

    // ── Build medicine name → HSN map ──
    const medicines = await prisma.medicine.findMany({
        select: { name: true, hsnCode: true },
    })
    const hsnMap = new Map<string, string>()
    for (const med of medicines) {
        if (med.hsnCode) hsnMap.set(med.name.toLowerCase(), med.hsnCode)
    }

    // ── Helper: extract medicine name from billing item description ──
    function extractMedicineName(desc: string): string {
        const match = desc.match(/^(.+?)\s*\(Batch:/)
        return match ? match[1].trim() : desc
    }

    function lookupHsn(desc: string): string {
        const name = extractMedicineName(desc).toLowerCase()
        return hsnMap.get(name) || "30049099" // Default pharma HSN
    }

    // ── Aggregate: rate-wise buckets ──
    const rateMap = new Map<number, RateBucket>()
    // ── Aggregate: HSN-wise buckets ──
    const hsnAggMap = new Map<string, HsnBucket>()
    // Track bill numbers for doc_issue
    const billNumbers: string[] = []

    let grandTaxableValue = 0
    let grandCgst = 0
    let grandSgst = 0
    let grandTotalTax = 0

    for (const bill of billings) {
        billNumbers.push(bill.billNumber)

        for (const item of bill.items) {
            // Skip lab test items (gstRate = 0 and starts with "Lab Test:")
            if (item.gstRate === 0 && item.description.startsWith("Lab Test:")) continue

            const taxableValue = item.amount // pre-tax amount
            const gstRate = item.gstRate
            const cgst = item.gstAmount / 2
            const sgst = item.gstAmount / 2

            // ── Rate-wise ──
            if (!rateMap.has(gstRate)) {
                rateMap.set(gstRate, {
                    rate: gstRate,
                    taxableValue: 0,
                    cgst: 0,
                    sgst: 0,
                    totalTax: 0,
                    invoiceCount: 0,
                })
            }
            const rb = rateMap.get(gstRate)!
            rb.taxableValue += taxableValue
            rb.cgst += cgst
            rb.sgst += sgst
            rb.totalTax += item.gstAmount

            // ── HSN-wise ──
            const hsn = lookupHsn(item.description)
            const hsnKey = `${hsn}_${gstRate}`
            if (!hsnAggMap.has(hsnKey)) {
                hsnAggMap.set(hsnKey, {
                    hsnCode: hsn,
                    description: extractMedicineName(item.description),
                    uqc: "NOS",
                    quantity: 0,
                    taxableValue: 0,
                    rate: gstRate,
                    cgst: 0,
                    sgst: 0,
                    totalValue: 0,
                })
            }
            const hb = hsnAggMap.get(hsnKey)!
            hb.quantity += item.quantity
            hb.taxableValue += taxableValue
            hb.cgst += cgst
            hb.sgst += sgst
            hb.totalValue += item.totalAmount

            grandTaxableValue += taxableValue
            grandCgst += cgst
            grandSgst += sgst
            grandTotalTax += item.gstAmount
        }

        // Count unique invoices per rate
        const ratesInBill = new Set(bill.items.filter(i => !(i.gstRate === 0 && i.description.startsWith("Lab Test:"))).map(i => i.gstRate))
        for (const r of ratesInBill) {
            if (rateMap.has(r)) rateMap.get(r)!.invoiceCount += 1
        }
    }

    const rateBuckets = Array.from(rateMap.values()).sort((a, b) => a.rate - b.rate)
    const hsnBuckets = Array.from(hsnAggMap.values()).sort((a, b) => a.hsnCode.localeCompare(b.hsnCode))
    const grandTotal = grandTaxableValue + grandTotalTax

    // Financial year label
    const fyStart = selectedMonth >= 4 ? selectedYear : selectedYear - 1
    const fyLabel = `FY ${fyStart}-${String(fyStart + 1).slice(2)}`

    // Doc issue range
    const firstBill = billNumbers.length > 0 ? billNumbers[0] : "—"
    const lastBill = billNumbers.length > 0 ? billNumbers[billNumbers.length - 1] : "—"

    // Month label
    const monthLabel = new Date(selectedYear, selectedMonth - 1).toLocaleString("en-IN", { month: "long", year: "numeric" })

    return (
        <div className="p-6 md:p-8 max-w-7xl mx-auto space-y-8 bg-slate-50/50 min-h-[calc(100vh-4rem)]">

            <Gstr1Client
                initialMonth={selectedMonth}
                initialYear={selectedYear}
            />

            {/* ── GSTIN & Period Banner ── */}
            <div className="bg-emerald-50 rounded-xl border border-emerald-200 p-5 shadow-sm flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                <div>
                    <p className="text-xs font-semibold text-emerald-700 uppercase tracking-wider">GSTIN</p>
                    <p className="text-lg font-bold text-emerald-900 font-mono tracking-wide">{gstin}</p>
                </div>
                <div className="text-right">
                    <p className="text-xs font-semibold text-emerald-700 uppercase tracking-wider">Return Period</p>
                    <p className="text-lg font-bold text-emerald-900">{monthLabel}</p>
                    <p className="text-xs text-emerald-600">{fyLabel}</p>
                </div>
            </div>

            {/* ── KPI Cards ── */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <div className="bg-emerald-50 rounded-xl border border-emerald-200 p-6 shadow-sm relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-100 rounded-full -mr-16 -mt-16 opacity-60" />
                    <p className="text-sm font-semibold text-emerald-800 mb-1 relative z-10">Total Taxable Value</p>
                    <p className="text-3xl font-bold text-emerald-900 relative z-10">
                        ₹{grandTaxableValue.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                    </p>
                    <p className="text-xs text-emerald-700/80 mt-2 relative z-10">Pharmacy outward supplies</p>
                </div>

                <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-slate-50 rounded-full -mr-16 -mt-16 opacity-60" />
                    <p className="text-sm font-medium text-slate-500 mb-1 relative z-10">CGST Collected</p>
                    <p className="text-3xl font-bold text-slate-800 relative z-10">
                        ₹{grandCgst.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                    </p>
                    <p className="text-xs text-slate-500 mt-2 relative z-10 font-bold">Central GST</p>
                </div>

                <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-slate-50 rounded-full -mr-16 -mt-16 opacity-60" />
                    <p className="text-sm font-medium text-slate-500 mb-1 relative z-10">SGST Collected</p>
                    <p className="text-3xl font-bold text-slate-800 relative z-10">
                        ₹{grandSgst.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                    </p>
                    <p className="text-xs text-slate-500 mt-2 relative z-10 font-bold">State GST</p>
                </div>

                <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-slate-50 rounded-full -mr-16 -mt-16 opacity-60" />
                    <p className="text-sm font-medium text-slate-500 mb-1 relative z-10">Total Invoices</p>
                    <p className="text-3xl font-bold text-slate-800 relative z-10">{billings.length}</p>
                    <p className="text-xs text-emerald-600 mt-2 relative z-10 font-bold">
                        {cancelledCount > 0 ? `${cancelledCount} cancelled` : "No cancellations"}
                    </p>
                </div>
            </div>

            {/* ── B2C Small — Rate-wise Summary (Table 7) ── */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="p-4 border-b border-slate-200 bg-slate-50">
                    <h2 className="font-semibold text-slate-800">B2C (Small) — Rate-wise Summary</h2>
                    <p className="text-xs text-slate-500 mt-0.5">Table 7 — Outward supplies to unregistered persons (invoice value ≤ ₹2.5 lakh)</p>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="text-xs text-slate-500 uppercase bg-slate-50/50 border-b border-slate-200">
                            <tr>
                                <th className="px-6 py-4 font-medium">GST Rate (%)</th>
                                <th className="px-6 py-4 font-medium text-center">No. of Invoices</th>
                                <th className="px-6 py-4 font-medium text-right">Taxable Value (₹)</th>
                                <th className="px-6 py-4 font-medium text-right">CGST (₹)</th>
                                <th className="px-6 py-4 font-medium text-right">SGST (₹)</th>
                                <th className="px-6 py-4 font-medium text-right">Total Tax (₹)</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {rateBuckets.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="px-6 py-12 text-center text-slate-500">
                                        No pharmacy sales recorded for this period.
                                    </td>
                                </tr>
                            ) : (
                                rateBuckets.map((rb) => (
                                    <tr key={rb.rate} className="hover:bg-slate-50/50 transition-colors">
                                        <td className="px-6 py-4">
                                            <span className="inline-flex items-center px-3 py-1 rounded-md text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-100">
                                                {rb.rate}%
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-center font-semibold text-slate-700">{rb.invoiceCount}</td>
                                        <td className="px-6 py-4 text-right font-bold text-slate-800 whitespace-nowrap">
                                            ₹{rb.taxableValue.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                                        </td>
                                        <td className="px-6 py-4 text-right text-slate-700 whitespace-nowrap">
                                            ₹{rb.cgst.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                                        </td>
                                        <td className="px-6 py-4 text-right text-slate-700 whitespace-nowrap">
                                            ₹{rb.sgst.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                                        </td>
                                        <td className="px-6 py-4 text-right font-bold text-emerald-700 whitespace-nowrap">
                                            ₹{rb.totalTax.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                        {rateBuckets.length > 0 && (
                            <tfoot className="bg-slate-50/80 border-t-2 border-slate-200 font-bold text-slate-800">
                                <tr>
                                    <td className="px-6 py-4">Total</td>
                                    <td className="px-6 py-4 text-center">{billings.length}</td>
                                    <td className="px-6 py-4 text-right whitespace-nowrap">
                                        ₹{grandTaxableValue.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                                    </td>
                                    <td className="px-6 py-4 text-right whitespace-nowrap">
                                        ₹{grandCgst.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                                    </td>
                                    <td className="px-6 py-4 text-right whitespace-nowrap">
                                        ₹{grandSgst.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                                    </td>
                                    <td className="px-6 py-4 text-right text-emerald-700 whitespace-nowrap">
                                        ₹{grandTotalTax.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                                    </td>
                                </tr>
                            </tfoot>
                        )}
                    </table>
                </div>
            </div>

            {/* ── HSN-wise Summary (Table 12) ── */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="p-4 border-b border-slate-200 bg-slate-50">
                    <h2 className="font-semibold text-slate-800">HSN-wise Summary of Outward Supplies</h2>
                    <p className="text-xs text-slate-500 mt-0.5">Table 12 — HSN code breakdown for medicines sold</p>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="text-xs text-slate-500 uppercase bg-slate-50/50 border-b border-slate-200">
                            <tr>
                                <th className="px-6 py-4 font-medium">#</th>
                                <th className="px-6 py-4 font-medium">HSN Code</th>
                                <th className="px-6 py-4 font-medium hidden md:table-cell">Description</th>
                                <th className="px-6 py-4 font-medium text-center">UQC</th>
                                <th className="px-6 py-4 font-medium text-center">Qty</th>
                                <th className="px-6 py-4 font-medium text-right">Taxable Value (₹)</th>
                                <th className="px-6 py-4 font-medium text-center hidden lg:table-cell">Rate</th>
                                <th className="px-6 py-4 font-medium text-right hidden sm:table-cell">CGST (₹)</th>
                                <th className="px-6 py-4 font-medium text-right hidden sm:table-cell">SGST (₹)</th>
                                <th className="px-6 py-4 font-medium text-right">Total Value (₹)</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {hsnBuckets.length === 0 ? (
                                <tr>
                                    <td colSpan={10} className="px-6 py-12 text-center text-slate-500">
                                        No HSN data available for this period.
                                    </td>
                                </tr>
                            ) : (
                                hsnBuckets.map((hb, index) => (
                                    <tr key={`${hb.hsnCode}_${hb.rate}`} className="hover:bg-slate-50/50 transition-colors">
                                        <td className="px-6 py-4 text-slate-400 font-medium">{index + 1}</td>
                                        <td className="px-6 py-4">
                                            <span className="font-mono font-bold text-slate-800">{hb.hsnCode}</span>
                                        </td>
                                        <td className="px-6 py-4 text-slate-600 truncate max-w-[200px] hidden md:table-cell" title={hb.description}>
                                            {hb.description}
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-slate-100 text-slate-600 border border-slate-200">
                                                {hb.uqc}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-center font-semibold text-slate-700">{hb.quantity}</td>
                                        <td className="px-6 py-4 text-right font-bold text-slate-800 whitespace-nowrap">
                                            ₹{hb.taxableValue.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                                        </td>
                                        <td className="px-6 py-4 text-center hidden lg:table-cell">
                                            <span className="text-xs font-bold text-emerald-700">{hb.rate}%</span>
                                        </td>
                                        <td className="px-6 py-4 text-right text-slate-700 whitespace-nowrap hidden sm:table-cell">
                                            ₹{hb.cgst.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                                        </td>
                                        <td className="px-6 py-4 text-right text-slate-700 whitespace-nowrap hidden sm:table-cell">
                                            ₹{hb.sgst.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                                        </td>
                                        <td className="px-6 py-4 text-right font-bold text-emerald-700 whitespace-nowrap">
                                            ₹{hb.totalValue.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                        {hsnBuckets.length > 0 && (
                            <tfoot className="bg-slate-50/80 border-t-2 border-slate-200 font-bold text-slate-800">
                                <tr>
                                    <td colSpan={4} className="px-6 py-4 text-right">Totals</td>
                                    <td className="px-6 py-4 text-center">
                                        {hsnBuckets.reduce((s, h) => s + h.quantity, 0)}
                                    </td>
                                    <td className="px-6 py-4 text-right whitespace-nowrap">
                                        ₹{grandTaxableValue.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                                    </td>
                                    <td className="px-6 py-4 hidden lg:table-cell" />
                                    <td className="px-6 py-4 text-right whitespace-nowrap hidden sm:table-cell">
                                        ₹{grandCgst.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                                    </td>
                                    <td className="px-6 py-4 text-right whitespace-nowrap hidden sm:table-cell">
                                        ₹{grandSgst.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                                    </td>
                                    <td className="px-6 py-4 text-right text-emerald-700 whitespace-nowrap">
                                        ₹{grandTotal.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                                    </td>
                                </tr>
                            </tfoot>
                        )}
                    </table>
                </div>
            </div>

            {/* ── Document Issued (Table 13) ── */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="p-4 border-b border-slate-200 bg-slate-50">
                    <h2 className="font-semibold text-slate-800">Documents Issued</h2>
                    <p className="text-xs text-slate-500 mt-0.5">Table 13 — Invoice range summary for the return period</p>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="text-xs text-slate-500 uppercase bg-slate-50/50 border-b border-slate-200">
                            <tr>
                                <th className="px-6 py-4 font-medium">Document Type</th>
                                <th className="px-6 py-4 font-medium">From</th>
                                <th className="px-6 py-4 font-medium">To</th>
                                <th className="px-6 py-4 font-medium text-center">Total Issued</th>
                                <th className="px-6 py-4 font-medium text-center">Cancelled</th>
                                <th className="px-6 py-4 font-medium text-center">Net Issued</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            <tr className="hover:bg-slate-50/50 transition-colors">
                                <td className="px-6 py-4 font-semibold text-slate-800">Invoices for outward supply</td>
                                <td className="px-6 py-4 font-mono text-slate-700">{firstBill}</td>
                                <td className="px-6 py-4 font-mono text-slate-700">{lastBill}</td>
                                <td className="px-6 py-4 text-center font-bold text-slate-800">{billings.length + cancelledCount}</td>
                                <td className="px-6 py-4 text-center">
                                    {cancelledCount > 0 ? (
                                        <span className="inline-flex items-center px-2 py-1 rounded text-[11px] font-bold bg-rose-50 text-rose-700 border border-rose-100">
                                            {cancelledCount}
                                        </span>
                                    ) : (
                                        <span className="text-slate-400">0</span>
                                    )}
                                </td>
                                <td className="px-6 py-4 text-center font-bold text-emerald-700">{billings.length}</td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    )
}
