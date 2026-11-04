import { prisma } from "@/lib/prisma"
import { requireAuth } from "@/lib/auth-guard"
import { Gstr9Client } from "./gstr9-client"

function getFyBoundaries(fyStartYear: number) {
    // Indian Financial Year: April 1 to March 31
    const startIst = `${fyStartYear}-04-01T00:00:00+05:30`
    const endIst = `${fyStartYear + 1}-03-31T23:59:59.999+05:30`
    return { start: new Date(startIst), end: new Date(endIst) }
}

interface MonthlyBreakdown {
    month: string
    taxableValue: number
    cgst: number
    sgst: number
    totalTax: number
    invoiceCount: number
}

export default async function Gstr9Page({
    searchParams,
}: {
    searchParams: Promise<{ fy?: string }>
}) {
    await requireAuth(["SUPER_ADMIN", "ACCOUNTANT"])

    const params = await searchParams
    const todayIst = new Date(new Date().toLocaleString("en-US", { timeZone: "Asia/Kolkata" }))
    // Default: previous completed FY
    const currentMonth = todayIst.getMonth() + 1
    const defaultFy = currentMonth >= 4 ? todayIst.getFullYear() - 1 : todayIst.getFullYear() - 2
    const fyStartYear = params.fy ? Number(params.fy) : defaultFy

    const { start, end } = getFyBoundaries(fyStartYear)
    const fyLabel = `FY ${fyStartYear}-${String(fyStartYear + 1).slice(2)}`

    const settings = await prisma.hospitalSettings.findFirst({ where: { id: 1 } })
    const gstin = settings?.gstNo || "NOT CONFIGURED"

    // ═══════════════════════════════════════
    // Part II — Outward Supplies (Pharmacy)
    // ═══════════════════════════════════════
    const outwardBills = await prisma.billing.findMany({
        where: {
            type: "PHARMACY",
            billDate: { gte: start, lte: end },
            status: { notIn: ["CANCELLED", "DRAFT"] },
        },
        include: { items: true },
        orderBy: { billDate: "asc" },
    })

    let annualTaxable = 0
    let annualCgst = 0
    let annualSgst = 0

    // Monthly breakdown
    const monthlyMap = new Map<string, MonthlyBreakdown>()
    const monthNames = ["Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec", "Jan", "Feb", "Mar"]

    // Initialize all 12 months
    for (let i = 0; i < 12; i++) {
        const monthIdx = (3 + i) % 12 // Apr=3, May=4, ... Mar=2
        const yr = monthIdx >= 3 ? fyStartYear : fyStartYear + 1
        const key = `${yr}-${String(monthIdx + 1).padStart(2, '0')}`
        monthlyMap.set(key, {
            month: `${monthNames[i]} ${yr}`,
            taxableValue: 0, cgst: 0, sgst: 0, totalTax: 0, invoiceCount: 0,
        })
    }

    for (const bill of outwardBills) {
        const billDate = new Date(bill.billDate)
        const billDateIst = new Date(billDate.toLocaleString("en-US", { timeZone: "Asia/Kolkata" }))
        const key = `${billDateIst.getFullYear()}-${String(billDateIst.getMonth() + 1).padStart(2, '0')}`
        const mb = monthlyMap.get(key)

        for (const item of bill.items) {
            if (item.gstRate === 0 && item.description.startsWith("Lab Test:")) continue
            annualTaxable += item.amount
            annualCgst += item.gstAmount / 2
            annualSgst += item.gstAmount / 2
            if (mb) {
                mb.taxableValue += item.amount
                mb.cgst += item.gstAmount / 2
                mb.sgst += item.gstAmount / 2
                mb.totalTax += item.gstAmount
            }
        }

        if (mb) mb.invoiceCount += 1
    }

    const annualTotalTax = annualCgst + annualSgst
    const monthlyBreakdown = Array.from(monthlyMap.values())

    // ═══════════════════════════════════════
    // Part II — Exempt / Nil-rated
    // ═══════════════════════════════════════
    const exemptBills = await prisma.billing.findMany({
        where: {
            type: { in: ["OPD", "LABORATORY"] },
            billDate: { gte: start, lte: end },
            status: { notIn: ["CANCELLED", "DRAFT"] },
        },
    })
    const annualExempt = exemptBills.reduce((s, b) => s + b.netAmount, 0)

    // Nil-rated items in pharmacy bills
    let annualNilRated = 0
    for (const bill of outwardBills) {
        for (const item of bill.items) {
            if (item.gstRate === 0) annualNilRated += item.amount
        }
    }

    // ═══════════════════════════════════════
    // Part III — ITC (Annual)
    // ═══════════════════════════════════════
    const purchases = await prisma.purchaseInvoice.findMany({
        where: {
            date: { gte: start, lte: end },
        },
        include: { items: true, supplier: true },
    })

    // INTEGRITY CHECK: Fetch inventory batches to validate medicine purchase items
    const allBatches = await prisma.inventoryBatch.findMany({
        select: { medicineId: true, batchNumber: true, invoiceNumber: true, supplierId: true },
    })

    let annualItcCgst = 0
    let annualItcSgst = 0
    let annualItcTaxable = 0

    for (const inv of purchases) {
        for (const item of inv.items) {
            // Skip medicine purchase items without matching stock (orphan protection)
            if (item.medicineId) {
                const hasMatchingStock = allBatches.some(b =>
                    b.medicineId === item.medicineId &&
                    b.batchNumber === item.batchNumber &&
                    b.invoiceNumber === inv.invoiceNumber &&
                    b.supplierId === inv.supplierId
                )
                if (!hasMatchingStock) continue
            }

            const taxableVal = item.quantity * item.rate
            const taxAmt = (taxableVal * item.taxPercent) / 100
            annualItcTaxable += taxableVal
            annualItcCgst += taxAmt / 2
            annualItcSgst += taxAmt / 2
        }
    }
    const annualItcTotal = annualItcCgst + annualItcSgst

    // ═══════════════════════════════════════
    // Net Tax
    // ═══════════════════════════════════════
    const netCgst = Math.max(annualCgst - annualItcCgst, 0)
    const netSgst = Math.max(annualSgst - annualItcSgst, 0)
    const annualNetPayable = netCgst + netSgst

    // Cancelled / refunded summary
    const cancelledCount = await prisma.billing.count({
        where: { type: "PHARMACY", billDate: { gte: start, lte: end }, status: "CANCELLED" },
    })
    const refundedCount = await prisma.billing.count({
        where: { type: "PHARMACY", billDate: { gte: start, lte: end }, status: "REFUNDED" },
    })

    const fmtInr = (v: number) => `₹${v.toLocaleString("en-IN", { minimumFractionDigits: 2 })}`

    return (
        <div className="p-6 md:p-8 max-w-7xl mx-auto space-y-8 bg-slate-50/50 min-h-[calc(100vh-4rem)]">
            <Gstr9Client initialYear={fyStartYear} />

            {/* GSTIN + FY Banner */}
            <div className="bg-rose-50 rounded-xl border border-rose-200 p-5 shadow-sm flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                <div>
                    <p className="text-xs font-semibold text-rose-700 uppercase tracking-wider">GSTIN</p>
                    <p className="text-lg font-bold text-rose-900 font-mono tracking-wide">{gstin}</p>
                </div>
                <div className="text-right">
                    <p className="text-xs font-semibold text-rose-700 uppercase tracking-wider">Annual Return</p>
                    <p className="text-lg font-bold text-rose-900">{fyLabel}</p>
                    <p className="text-xs text-rose-600">April {fyStartYear} — March {fyStartYear + 1}</p>
                </div>
            </div>

            {/* Deadline notice */}
            <div className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 text-sm text-amber-800 flex items-start gap-2">
                <span className="font-bold text-amber-600 mt-0.5">Due Date:</span>
                <span>GSTR-9 for {fyLabel} must be filed by <strong>31st December {fyStartYear + 2}</strong>. This report consolidates all monthly GSTR-1 and GSTR-3B filings.</span>
            </div>

            {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <div className="bg-rose-50 rounded-xl border border-rose-200 p-6 shadow-sm relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-rose-100 rounded-full -mr-16 -mt-16 opacity-60" />
                    <p className="text-sm font-semibold text-rose-800 mb-1 relative z-10">Annual Turnover (Taxable)</p>
                    <p className="text-3xl font-bold text-rose-900 relative z-10">{fmtInr(annualTaxable)}</p>
                    <p className="text-xs text-rose-700/80 mt-2 relative z-10">{outwardBills.length} invoices issued</p>
                </div>

                <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-slate-50 rounded-full -mr-16 -mt-16 opacity-60" />
                    <p className="text-sm font-medium text-slate-500 mb-1 relative z-10">Total Tax Collected</p>
                    <p className="text-3xl font-bold text-slate-800 relative z-10">{fmtInr(annualTotalTax)}</p>
                    <p className="text-xs text-slate-500 mt-2 relative z-10 font-bold">CGST + SGST combined</p>
                </div>

                <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-slate-50 rounded-full -mr-16 -mt-16 opacity-60" />
                    <p className="text-sm font-medium text-slate-500 mb-1 relative z-10">Total ITC Claimed</p>
                    <p className="text-3xl font-bold text-slate-800 relative z-10">{fmtInr(annualItcTotal)}</p>
                    <p className="text-xs text-violet-600 mt-2 relative z-10 font-bold">{purchases.length} purchase invoices</p>
                </div>

                <div className={`rounded-xl border p-6 shadow-sm relative overflow-hidden ${annualNetPayable > 0 ? "bg-rose-50 border-rose-200" : "bg-emerald-50 border-emerald-200"}`}>
                    <div className={`absolute top-0 right-0 w-32 h-32 rounded-full -mr-16 -mt-16 opacity-60 ${annualNetPayable > 0 ? "bg-rose-100" : "bg-emerald-100"}`} />
                    <p className={`text-sm font-semibold mb-1 relative z-10 ${annualNetPayable > 0 ? "text-rose-800" : "text-emerald-800"}`}>Net Tax Paid / Payable</p>
                    <p className={`text-3xl font-bold relative z-10 ${annualNetPayable > 0 ? "text-rose-900" : "text-emerald-900"}`}>{fmtInr(annualNetPayable)}</p>
                    <p className={`text-xs mt-2 relative z-10 font-bold ${annualNetPayable > 0 ? "text-rose-600" : "text-emerald-600"}`}>After ITC adjustment</p>
                </div>
            </div>

            {/* ── Part II: Monthly Breakdown ── */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="p-4 border-b border-slate-200 bg-slate-50">
                    <h2 className="font-semibold text-slate-800">Part II — Month-wise Outward Supply Details</h2>
                    <p className="text-xs text-slate-500 mt-0.5">Taxable pharmacy sales broken down by month for {fyLabel}</p>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="text-xs text-slate-500 uppercase bg-slate-50/50 border-b border-slate-200">
                            <tr>
                                <th className="px-6 py-4 font-medium">Month</th>
                                <th className="px-6 py-4 font-medium text-center">Invoices</th>
                                <th className="px-6 py-4 font-medium text-right">Taxable Value (₹)</th>
                                <th className="px-6 py-4 font-medium text-right">CGST (₹)</th>
                                <th className="px-6 py-4 font-medium text-right">SGST (₹)</th>
                                <th className="px-6 py-4 font-medium text-right">Total Tax (₹)</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {monthlyBreakdown.map((mb) => (
                                <tr key={mb.month} className={`hover:bg-slate-50/50 transition-colors ${mb.invoiceCount === 0 ? "text-slate-400" : ""}`}>
                                    <td className="px-6 py-4 font-semibold text-slate-800">{mb.month}</td>
                                    <td className="px-6 py-4 text-center font-semibold">{mb.invoiceCount}</td>
                                    <td className="px-6 py-4 text-right font-bold">{fmtInr(mb.taxableValue)}</td>
                                    <td className="px-6 py-4 text-right">{fmtInr(mb.cgst)}</td>
                                    <td className="px-6 py-4 text-right">{fmtInr(mb.sgst)}</td>
                                    <td className="px-6 py-4 text-right font-bold text-rose-700">{fmtInr(mb.totalTax)}</td>
                                </tr>
                            ))}
                        </tbody>
                        <tfoot className="bg-slate-50/80 border-t-2 border-slate-200 font-bold text-slate-800">
                            <tr>
                                <td className="px-6 py-4">Annual Total</td>
                                <td className="px-6 py-4 text-center">{outwardBills.length}</td>
                                <td className="px-6 py-4 text-right">{fmtInr(annualTaxable)}</td>
                                <td className="px-6 py-4 text-right">{fmtInr(annualCgst)}</td>
                                <td className="px-6 py-4 text-right">{fmtInr(annualSgst)}</td>
                                <td className="px-6 py-4 text-right text-rose-700">{fmtInr(annualTotalTax)}</td>
                            </tr>
                        </tfoot>
                    </table>
                </div>
            </div>

            {/* ── Part III: ITC Summary ── */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="p-4 border-b border-slate-200 bg-slate-50">
                    <h2 className="font-semibold text-slate-800">Part III — Input Tax Credit (Annual)</h2>
                    <p className="text-xs text-slate-500 mt-0.5">Total ITC availed during {fyLabel} from purchase invoices</p>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="text-xs text-slate-500 uppercase bg-slate-50/50 border-b border-slate-200">
                            <tr>
                                <th className="px-6 py-4 font-medium">Description</th>
                                <th className="px-6 py-4 font-medium text-right">Taxable Value (₹)</th>
                                <th className="px-6 py-4 font-medium text-right">CGST (₹)</th>
                                <th className="px-6 py-4 font-medium text-right">SGST (₹)</th>
                                <th className="px-6 py-4 font-medium text-right">IGST (₹)</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            <tr className="hover:bg-slate-50/50">
                                <td className="px-6 py-4 font-semibold text-slate-800">Total ITC availed (from GSTR-3B filings)</td>
                                <td className="px-6 py-4 text-right font-bold text-slate-800">{fmtInr(annualItcTaxable)}</td>
                                <td className="px-6 py-4 text-right font-bold text-violet-700">{fmtInr(annualItcCgst)}</td>
                                <td className="px-6 py-4 text-right font-bold text-violet-700">{fmtInr(annualItcSgst)}</td>
                                <td className="px-6 py-4 text-right text-slate-400">₹0.00</td>
                            </tr>
                            <tr className="hover:bg-slate-50/50">
                                <td className="px-6 py-4 font-semibold text-slate-800">ITC reversed during the year</td>
                                <td className="px-6 py-4 text-right text-slate-400">₹0.00</td>
                                <td className="px-6 py-4 text-right text-slate-400">₹0.00</td>
                                <td className="px-6 py-4 text-right text-slate-400">₹0.00</td>
                                <td className="px-6 py-4 text-right text-slate-400">₹0.00</td>
                            </tr>
                            <tr className="hover:bg-slate-50/50 bg-violet-50/30">
                                <td className="px-6 py-4 font-bold text-slate-800">Net ITC available</td>
                                <td className="px-6 py-4 text-right font-bold text-slate-800">{fmtInr(annualItcTaxable)}</td>
                                <td className="px-6 py-4 text-right font-bold text-violet-700">{fmtInr(annualItcCgst)}</td>
                                <td className="px-6 py-4 text-right font-bold text-violet-700">{fmtInr(annualItcSgst)}</td>
                                <td className="px-6 py-4 text-right text-slate-400">₹0.00</td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </div>

            {/* ── Part IV: Tax Paid ── */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="p-4 border-b border-slate-200 bg-slate-50">
                    <h2 className="font-semibold text-slate-800">Part IV — Tax Paid Summary</h2>
                    <p className="text-xs text-slate-500 mt-0.5">Annual tax liability vs ITC utilization</p>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="text-xs text-slate-500 uppercase bg-slate-50/50 border-b border-slate-200">
                            <tr>
                                <th className="px-6 py-4 font-medium">Description</th>
                                <th className="px-6 py-4 font-medium text-right">CGST (₹)</th>
                                <th className="px-6 py-4 font-medium text-right">SGST (₹)</th>
                                <th className="px-6 py-4 font-medium text-right">Total (₹)</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            <tr className="hover:bg-slate-50/50">
                                <td className="px-6 py-4 font-semibold text-slate-800">Tax liability for the year</td>
                                <td className="px-6 py-4 text-right font-bold text-slate-800">{fmtInr(annualCgst)}</td>
                                <td className="px-6 py-4 text-right font-bold text-slate-800">{fmtInr(annualSgst)}</td>
                                <td className="px-6 py-4 text-right font-bold text-slate-800">{fmtInr(annualTotalTax)}</td>
                            </tr>
                            <tr className="hover:bg-slate-50/50">
                                <td className="px-6 py-4 font-semibold text-slate-800">Paid through ITC</td>
                                <td className="px-6 py-4 text-right font-bold text-violet-700">{fmtInr(Math.min(annualItcCgst, annualCgst))}</td>
                                <td className="px-6 py-4 text-right font-bold text-violet-700">{fmtInr(Math.min(annualItcSgst, annualSgst))}</td>
                                <td className="px-6 py-4 text-right font-bold text-violet-700">{fmtInr(Math.min(annualItcCgst, annualCgst) + Math.min(annualItcSgst, annualSgst))}</td>
                            </tr>
                            <tr className={`${annualNetPayable > 0 ? "bg-rose-50/50" : "bg-emerald-50/50"}`}>
                                <td className={`px-6 py-4 font-bold ${annualNetPayable > 0 ? "text-rose-800" : "text-emerald-800"}`}>Paid in cash</td>
                                <td className={`px-6 py-4 text-right font-bold ${annualNetPayable > 0 ? "text-rose-700" : "text-emerald-700"}`}>{fmtInr(netCgst)}</td>
                                <td className={`px-6 py-4 text-right font-bold ${annualNetPayable > 0 ? "text-rose-700" : "text-emerald-700"}`}>{fmtInr(netSgst)}</td>
                                <td className={`px-6 py-4 text-right font-bold ${annualNetPayable > 0 ? "text-rose-700" : "text-emerald-700"}`}>{fmtInr(annualNetPayable)}</td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </div>

            {/* ── Part V: Particulars of Transactions ── */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="p-4 border-b border-slate-200 bg-slate-50">
                    <h2 className="font-semibold text-slate-800">Part V — Particulars of Transactions</h2>
                    <p className="text-xs text-slate-500 mt-0.5">Summary of exempt, nil-rated, cancelled, and refunded transactions</p>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="text-xs text-slate-500 uppercase bg-slate-50/50 border-b border-slate-200">
                            <tr>
                                <th className="px-6 py-4 font-medium">Particulars</th>
                                <th className="px-6 py-4 font-medium text-right">Value (₹)</th>
                                <th className="px-6 py-4 font-medium text-center">Count</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            <tr className="hover:bg-slate-50/50">
                                <td className="px-6 py-4 font-semibold text-slate-800">Exempt/Nil-rated supplies (OPD + Lab services)</td>
                                <td className="px-6 py-4 text-right font-bold text-slate-800">{fmtInr(annualExempt + annualNilRated)}</td>
                                <td className="px-6 py-4 text-center font-semibold text-slate-700">{exemptBills.length}</td>
                            </tr>
                            <tr className="hover:bg-slate-50/50">
                                <td className="px-6 py-4 font-semibold text-slate-800">Cancelled invoices</td>
                                <td className="px-6 py-4 text-right text-rose-600 font-bold">—</td>
                                <td className="px-6 py-4 text-center">
                                    {cancelledCount > 0 ? (
                                        <span className="inline-flex items-center px-2 py-1 rounded text-[11px] font-bold bg-rose-50 text-rose-600 border border-rose-100">{cancelledCount}</span>
                                    ) : <span className="text-slate-400">0</span>}
                                </td>
                            </tr>
                            <tr className="hover:bg-slate-50/50">
                                <td className="px-6 py-4 font-semibold text-slate-800">Credit notes (Refunds)</td>
                                <td className="px-6 py-4 text-right text-rose-600 font-bold">—</td>
                                <td className="px-6 py-4 text-center">
                                    {refundedCount > 0 ? (
                                        <span className="inline-flex items-center px-2 py-1 rounded text-[11px] font-bold bg-rose-50 text-rose-600 border border-rose-100">{refundedCount}</span>
                                    ) : <span className="text-slate-400">0</span>}
                                </td>
                            </tr>
                            <tr className="hover:bg-slate-50/50">
                                <td className="px-6 py-4 font-semibold text-slate-800">Total purchase value (inward supplies)</td>
                                <td className="px-6 py-4 text-right font-bold text-slate-800">{fmtInr(annualItcTaxable)}</td>
                                <td className="px-6 py-4 text-center font-semibold text-slate-700">{purchases.length}</td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    )
}
