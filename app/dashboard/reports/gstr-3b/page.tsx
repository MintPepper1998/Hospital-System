import { prisma } from "@/lib/prisma"
import { requireAuth } from "@/lib/auth-guard"
import { Gstr3bClient } from "./gstr3b-client"

function getMonthBoundaries(month: number, year: number) {
    const startIst = `${year}-${String(month).padStart(2, '0')}-01T00:00:00+05:30`
    const lastDay = new Date(year, month, 0).getDate()
    const endIst = `${year}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}T23:59:59.999+05:30`
    return { start: new Date(startIst), end: new Date(endIst) }
}

export default async function Gstr3bPage({
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

    const settings = await prisma.hospitalSettings.findFirst({ where: { id: 1 } })
    const gstin = settings?.gstNo || "NOT CONFIGURED"

    // ═══════════════════════════════════════════
    // TABLE 3.1 — OUTWARD SUPPLIES (from pharmacy)
    // ═══════════════════════════════════════════
    const outwardBills = await prisma.billing.findMany({
        where: {
            type: "PHARMACY",
            billDate: { gte: start, lte: end },
            status: { notIn: ["CANCELLED", "DRAFT"] },
        },
        include: { items: true },
    })

    let outTaxable = 0
    let outCgst = 0
    let outSgst = 0

    for (const bill of outwardBills) {
        for (const item of bill.items) {
            if (item.gstRate === 0 && item.description.startsWith("Lab Test:")) continue
            outTaxable += item.amount
            outCgst += item.gstAmount / 2
            outSgst += item.gstAmount / 2
        }
    }
    const outTotalTax = outCgst + outSgst

    // Nil-rated / exempt (lab tests within pharmacy bills)
    let nilRatedValue = 0
    for (const bill of outwardBills) {
        for (const item of bill.items) {
            if (item.gstRate === 0) nilRatedValue += item.amount
        }
    }

    // ═══════════════════════════════════════════
    // TABLE 4 — ITC (from purchase invoices)
    // ═══════════════════════════════════════════
    const purchases = await prisma.purchaseInvoice.findMany({
        where: {
            date: { gte: start, lte: end },
            supplier: { gstNumber: { not: null } }, // Only from registered suppliers
        },
        include: {
            items: true,
            supplier: true,
        },
    })

    // INTEGRITY CHECK: Fetch inventory batches to validate medicine purchase items
    const allBatches = await prisma.inventoryBatch.findMany({
        select: { medicineId: true, batchNumber: true, invoiceNumber: true, supplierId: true },
    })

    let itcCgst = 0
    let itcSgst = 0
    let itcTaxable = 0

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
            itcTaxable += taxableVal
            itcCgst += taxAmt / 2
            itcSgst += taxAmt / 2
        }
    }
    const itcTotal = itcCgst + itcSgst

    // ═══════════════════════════════════════════
    // TABLE 5 — Exempt, nil, non-GST supplies
    // ═══════════════════════════════════════════
    // Lab tests and medical services are exempt from GST
    const labBills = await prisma.billing.findMany({
        where: {
            type: "LABORATORY",
            billDate: { gte: start, lte: end },
            status: { notIn: ["CANCELLED", "DRAFT"] },
        },
    })
    const labExemptValue = labBills.reduce((s, b) => s + b.netAmount, 0)

    const opdBills = await prisma.billing.findMany({
        where: {
            type: "OPD",
            billDate: { gte: start, lte: end },
            status: { notIn: ["CANCELLED", "DRAFT"] },
        },
    })
    const opdExemptValue = opdBills.reduce((s, b) => s + b.netAmount, 0)

    const totalExempt = nilRatedValue + labExemptValue + opdExemptValue

    // ═══════════════════════════════════════════
    // TABLE 6 — Net tax payable
    // ═══════════════════════════════════════════
    const netCgst = Math.max(outCgst - itcCgst, 0)
    const netSgst = Math.max(outSgst - itcSgst, 0)
    const netPayable = netCgst + netSgst

    // Excess ITC (carry forward)
    const excessCgst = Math.max(itcCgst - outCgst, 0)
    const excessSgst = Math.max(itcSgst - outSgst, 0)
    const excessItc = excessCgst + excessSgst

    const monthLabel = new Date(selectedYear, selectedMonth - 1).toLocaleString("en-IN", { month: "long", year: "numeric" })
    const fyStart = selectedMonth >= 4 ? selectedYear : selectedYear - 1
    const fyLabel = `FY ${fyStart}-${String(fyStart + 1).slice(2)}`

    // Helper for table rows
    const fmtInr = (v: number) => `₹${v.toLocaleString("en-IN", { minimumFractionDigits: 2 })}`

    return (
        <div className="p-6 md:p-8 max-w-7xl mx-auto space-y-8 bg-slate-50/50 min-h-[calc(100vh-4rem)]">
            <Gstr3bClient initialMonth={selectedMonth} initialYear={selectedYear} />

            {/* GSTIN Banner */}
            <div className="bg-sky-50 rounded-xl border border-sky-200 p-5 shadow-sm flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                <div>
                    <p className="text-xs font-semibold text-sky-700 uppercase tracking-wider">GSTIN</p>
                    <p className="text-lg font-bold text-sky-900 font-mono tracking-wide">{gstin}</p>
                </div>
                <div className="text-right">
                    <p className="text-xs font-semibold text-sky-700 uppercase tracking-wider">Tax Period</p>
                    <p className="text-lg font-bold text-sky-900">{monthLabel}</p>
                    <p className="text-xs text-sky-600">{fyLabel}</p>
                </div>
            </div>

            {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <div className="bg-sky-50 rounded-xl border border-sky-200 p-6 shadow-sm relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-sky-100 rounded-full -mr-16 -mt-16 opacity-60" />
                    <p className="text-sm font-semibold text-sky-800 mb-1 relative z-10">Output Tax Liability</p>
                    <p className="text-3xl font-bold text-sky-900 relative z-10">{fmtInr(outTotalTax)}</p>
                    <p className="text-xs text-sky-700/80 mt-2 relative z-10">On outward pharmacy supplies</p>
                </div>

                <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-slate-50 rounded-full -mr-16 -mt-16 opacity-60" />
                    <p className="text-sm font-medium text-slate-500 mb-1 relative z-10">ITC Claimed</p>
                    <p className="text-3xl font-bold text-slate-800 relative z-10">{fmtInr(itcTotal)}</p>
                    <p className="text-xs text-slate-500 mt-2 relative z-10 font-bold">From {purchases.length} purchase invoices</p>
                </div>

                <div className={`rounded-xl border p-6 shadow-sm relative overflow-hidden ${netPayable > 0 ? "bg-rose-50 border-rose-200" : "bg-emerald-50 border-emerald-200"}`}>
                    <div className={`absolute top-0 right-0 w-32 h-32 rounded-full -mr-16 -mt-16 opacity-60 ${netPayable > 0 ? "bg-rose-100" : "bg-emerald-100"}`} />
                    <p className={`text-sm font-semibold mb-1 relative z-10 ${netPayable > 0 ? "text-rose-800" : "text-emerald-800"}`}>
                        {netPayable > 0 ? "Net Tax Payable" : "Excess ITC (Carry Forward)"}
                    </p>
                    <p className={`text-3xl font-bold relative z-10 ${netPayable > 0 ? "text-rose-900" : "text-emerald-900"}`}>
                        {fmtInr(netPayable > 0 ? netPayable : excessItc)}
                    </p>
                    <p className={`text-xs mt-2 relative z-10 font-bold ${netPayable > 0 ? "text-rose-600" : "text-emerald-600"}`}>
                        {netPayable > 0 ? "Tax to be deposited" : "Credit available next period"}
                    </p>
                </div>

                <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-slate-50 rounded-full -mr-16 -mt-16 opacity-60" />
                    <p className="text-sm font-medium text-slate-500 mb-1 relative z-10">Exempt / Nil-rated</p>
                    <p className="text-3xl font-bold text-slate-800 relative z-10">{fmtInr(totalExempt)}</p>
                    <p className="text-xs text-slate-500 mt-2 relative z-10 font-bold">OPD + Lab + Nil-rated</p>
                </div>
            </div>

            {/* ── Table 3.1: Outward Supplies ── */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="p-4 border-b border-slate-200 bg-slate-50">
                    <h2 className="font-semibold text-slate-800">3.1 — Tax on Outward Supplies</h2>
                    <p className="text-xs text-slate-500 mt-0.5">Details of tax liability on outward supplies and advances</p>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="text-xs text-slate-500 uppercase bg-slate-50/50 border-b border-slate-200">
                            <tr>
                                <th className="px-6 py-4 font-medium">Nature of Supplies</th>
                                <th className="px-6 py-4 font-medium text-right">Taxable Value (₹)</th>
                                <th className="px-6 py-4 font-medium text-right">CGST (₹)</th>
                                <th className="px-6 py-4 font-medium text-right">SGST (₹)</th>
                                <th className="px-6 py-4 font-medium text-right">IGST (₹)</th>
                                <th className="px-6 py-4 font-medium text-right">Cess (₹)</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            <tr className="hover:bg-slate-50/50">
                                <td className="px-6 py-4 font-semibold text-slate-800">(a) Outward taxable supplies (other than zero rated, nil rated and exempted)</td>
                                <td className="px-6 py-4 text-right font-bold text-slate-800">{fmtInr(outTaxable)}</td>
                                <td className="px-6 py-4 text-right text-slate-700">{fmtInr(outCgst)}</td>
                                <td className="px-6 py-4 text-right text-slate-700">{fmtInr(outSgst)}</td>
                                <td className="px-6 py-4 text-right text-slate-400">₹0.00</td>
                                <td className="px-6 py-4 text-right text-slate-400">₹0.00</td>
                            </tr>
                            <tr className="hover:bg-slate-50/50">
                                <td className="px-6 py-4 font-semibold text-slate-800">(b) Outward taxable supplies (zero rated)</td>
                                <td className="px-6 py-4 text-right text-slate-400">₹0.00</td>
                                <td className="px-6 py-4 text-right text-slate-400">₹0.00</td>
                                <td className="px-6 py-4 text-right text-slate-400">₹0.00</td>
                                <td className="px-6 py-4 text-right text-slate-400">₹0.00</td>
                                <td className="px-6 py-4 text-right text-slate-400">₹0.00</td>
                            </tr>
                            <tr className="hover:bg-slate-50/50">
                                <td className="px-6 py-4 font-semibold text-slate-800">(c) Other outward supplies (nil rated, exempted)</td>
                                <td className="px-6 py-4 text-right font-bold text-slate-800">{fmtInr(totalExempt)}</td>
                                <td className="px-6 py-4 text-right text-slate-400">₹0.00</td>
                                <td className="px-6 py-4 text-right text-slate-400">₹0.00</td>
                                <td className="px-6 py-4 text-right text-slate-400">₹0.00</td>
                                <td className="px-6 py-4 text-right text-slate-400">₹0.00</td>
                            </tr>
                            <tr className="hover:bg-slate-50/50">
                                <td className="px-6 py-4 font-semibold text-slate-800">(d) Inward supplies (liable to reverse charge)</td>
                                <td className="px-6 py-4 text-right text-slate-400">₹0.00</td>
                                <td className="px-6 py-4 text-right text-slate-400">₹0.00</td>
                                <td className="px-6 py-4 text-right text-slate-400">₹0.00</td>
                                <td className="px-6 py-4 text-right text-slate-400">₹0.00</td>
                                <td className="px-6 py-4 text-right text-slate-400">₹0.00</td>
                            </tr>
                            <tr className="hover:bg-slate-50/50">
                                <td className="px-6 py-4 font-semibold text-slate-800">(e) Non-GST outward supplies</td>
                                <td className="px-6 py-4 text-right text-slate-400">₹0.00</td>
                                <td className="px-6 py-4 text-right text-slate-400">₹0.00</td>
                                <td className="px-6 py-4 text-right text-slate-400">₹0.00</td>
                                <td className="px-6 py-4 text-right text-slate-400">₹0.00</td>
                                <td className="px-6 py-4 text-right text-slate-400">₹0.00</td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </div>

            {/* ── Table 4: Eligible ITC ── */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="p-4 border-b border-slate-200 bg-slate-50">
                    <h2 className="font-semibold text-slate-800">4 — Eligible Input Tax Credit (ITC)</h2>
                    <p className="text-xs text-slate-500 mt-0.5">ITC available from registered supplier purchases</p>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="text-xs text-slate-500 uppercase bg-slate-50/50 border-b border-slate-200">
                            <tr>
                                <th className="px-6 py-4 font-medium">Details</th>
                                <th className="px-6 py-4 font-medium text-right">CGST (₹)</th>
                                <th className="px-6 py-4 font-medium text-right">SGST (₹)</th>
                                <th className="px-6 py-4 font-medium text-right">IGST (₹)</th>
                                <th className="px-6 py-4 font-medium text-right">Cess (₹)</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            <tr className="hover:bg-slate-50/50">
                                <td className="px-6 py-4 font-semibold text-slate-800">(A) ITC Available (whether in full or part)</td>
                                <td className="px-6 py-4 text-right font-bold text-slate-800">{fmtInr(itcCgst)}</td>
                                <td className="px-6 py-4 text-right font-bold text-slate-800">{fmtInr(itcSgst)}</td>
                                <td className="px-6 py-4 text-right text-slate-400">₹0.00</td>
                                <td className="px-6 py-4 text-right text-slate-400">₹0.00</td>
                            </tr>
                            <tr className="hover:bg-slate-50/50 bg-slate-50/30">
                                <td className="px-6 py-4 text-slate-600 pl-10">(1) Import of goods</td>
                                <td className="px-6 py-4 text-right text-slate-400">₹0.00</td>
                                <td className="px-6 py-4 text-right text-slate-400">₹0.00</td>
                                <td className="px-6 py-4 text-right text-slate-400">₹0.00</td>
                                <td className="px-6 py-4 text-right text-slate-400">₹0.00</td>
                            </tr>
                            <tr className="hover:bg-slate-50/50 bg-slate-50/30">
                                <td className="px-6 py-4 text-slate-600 pl-10">(2) Import of services</td>
                                <td className="px-6 py-4 text-right text-slate-400">₹0.00</td>
                                <td className="px-6 py-4 text-right text-slate-400">₹0.00</td>
                                <td className="px-6 py-4 text-right text-slate-400">₹0.00</td>
                                <td className="px-6 py-4 text-right text-slate-400">₹0.00</td>
                            </tr>
                            <tr className="hover:bg-slate-50/50 bg-slate-50/30">
                                <td className="px-6 py-4 text-slate-600 pl-10">(3) Inward supplies liable to reverse charge</td>
                                <td className="px-6 py-4 text-right text-slate-400">₹0.00</td>
                                <td className="px-6 py-4 text-right text-slate-400">₹0.00</td>
                                <td className="px-6 py-4 text-right text-slate-400">₹0.00</td>
                                <td className="px-6 py-4 text-right text-slate-400">₹0.00</td>
                            </tr>
                            <tr className="hover:bg-slate-50/50 bg-slate-50/30">
                                <td className="px-6 py-4 text-slate-600 pl-10">(4) Inward supplies from ISD</td>
                                <td className="px-6 py-4 text-right text-slate-400">₹0.00</td>
                                <td className="px-6 py-4 text-right text-slate-400">₹0.00</td>
                                <td className="px-6 py-4 text-right text-slate-400">₹0.00</td>
                                <td className="px-6 py-4 text-right text-slate-400">₹0.00</td>
                            </tr>
                            <tr className="hover:bg-slate-50/50 bg-slate-50/30">
                                <td className="px-6 py-4 font-medium text-slate-700 pl-10">(5) All other ITC</td>
                                <td className="px-6 py-4 text-right font-bold text-violet-700">{fmtInr(itcCgst)}</td>
                                <td className="px-6 py-4 text-right font-bold text-violet-700">{fmtInr(itcSgst)}</td>
                                <td className="px-6 py-4 text-right text-slate-400">₹0.00</td>
                                <td className="px-6 py-4 text-right text-slate-400">₹0.00</td>
                            </tr>
                            <tr className="hover:bg-slate-50/50">
                                <td className="px-6 py-4 font-semibold text-slate-800">(B) ITC Reversed</td>
                                <td className="px-6 py-4 text-right text-slate-400">₹0.00</td>
                                <td className="px-6 py-4 text-right text-slate-400">₹0.00</td>
                                <td className="px-6 py-4 text-right text-slate-400">₹0.00</td>
                                <td className="px-6 py-4 text-right text-slate-400">₹0.00</td>
                            </tr>
                            <tr className="hover:bg-slate-50/50">
                                <td className="px-6 py-4 font-semibold text-slate-800">(C) Net ITC Available (A) - (B)</td>
                                <td className="px-6 py-4 text-right font-bold text-violet-700">{fmtInr(itcCgst)}</td>
                                <td className="px-6 py-4 text-right font-bold text-violet-700">{fmtInr(itcSgst)}</td>
                                <td className="px-6 py-4 text-right text-slate-400">₹0.00</td>
                                <td className="px-6 py-4 text-right text-slate-400">₹0.00</td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </div>

            {/* ── Table 6: Tax Payable ── */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="p-4 border-b border-slate-200 bg-slate-50">
                    <h2 className="font-semibold text-slate-800">6.1 — Payment of Tax</h2>
                    <p className="text-xs text-slate-500 mt-0.5">Net tax payable after adjusting ITC</p>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="text-xs text-slate-500 uppercase bg-slate-50/50 border-b border-slate-200">
                            <tr>
                                <th className="px-6 py-4 font-medium">Description</th>
                                <th className="px-6 py-4 font-medium text-right">CGST (₹)</th>
                                <th className="px-6 py-4 font-medium text-right">SGST (₹)</th>
                                <th className="px-6 py-4 font-medium text-right">IGST (₹)</th>
                                <th className="px-6 py-4 font-medium text-right">Cess (₹)</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            <tr className="hover:bg-slate-50/50">
                                <td className="px-6 py-4 font-semibold text-slate-800">(i) Tax payable</td>
                                <td className="px-6 py-4 text-right font-bold text-slate-800">{fmtInr(outCgst)}</td>
                                <td className="px-6 py-4 text-right font-bold text-slate-800">{fmtInr(outSgst)}</td>
                                <td className="px-6 py-4 text-right text-slate-400">₹0.00</td>
                                <td className="px-6 py-4 text-right text-slate-400">₹0.00</td>
                            </tr>
                            <tr className="hover:bg-slate-50/50">
                                <td className="px-6 py-4 font-semibold text-slate-800">(ii) Paid through ITC</td>
                                <td className="px-6 py-4 text-right font-bold text-violet-700">{fmtInr(Math.min(itcCgst, outCgst))}</td>
                                <td className="px-6 py-4 text-right font-bold text-violet-700">{fmtInr(Math.min(itcSgst, outSgst))}</td>
                                <td className="px-6 py-4 text-right text-slate-400">₹0.00</td>
                                <td className="px-6 py-4 text-right text-slate-400">₹0.00</td>
                            </tr>
                            <tr className={`${netPayable > 0 ? "bg-rose-50/50" : "bg-emerald-50/50"}`}>
                                <td className={`px-6 py-4 font-bold ${netPayable > 0 ? "text-rose-800" : "text-emerald-800"}`}>
                                    (iii) Tax payable in cash
                                </td>
                                <td className={`px-6 py-4 text-right font-bold ${netPayable > 0 ? "text-rose-700" : "text-emerald-700"}`}>
                                    {fmtInr(netCgst)}
                                </td>
                                <td className={`px-6 py-4 text-right font-bold ${netPayable > 0 ? "text-rose-700" : "text-emerald-700"}`}>
                                    {fmtInr(netSgst)}
                                </td>
                                <td className="px-6 py-4 text-right text-slate-400">₹0.00</td>
                                <td className="px-6 py-4 text-right text-slate-400">₹0.00</td>
                            </tr>
                        </tbody>
                        <tfoot className="bg-slate-50/80 border-t-2 border-slate-200 font-bold text-slate-800">
                            <tr>
                                <td className="px-6 py-4">Net Tax Payable in Cash</td>
                                <td colSpan={4} className={`px-6 py-4 text-right text-lg ${netPayable > 0 ? "text-rose-700" : "text-emerald-700"}`}>
                                    {fmtInr(netPayable)}
                                </td>
                            </tr>
                            {excessItc > 0 && (
                                <tr>
                                    <td className="px-6 py-4 text-emerald-700">ITC Carry Forward to Next Period</td>
                                    <td colSpan={4} className="px-6 py-4 text-right text-lg text-emerald-700">
                                        {fmtInr(excessItc)}
                                    </td>
                                </tr>
                            )}
                        </tfoot>
                    </table>
                </div>
            </div>
        </div>
    )
}
