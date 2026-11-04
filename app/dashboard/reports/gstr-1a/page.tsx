import { prisma } from "@/lib/prisma"
import { requireAuth } from "@/lib/auth-guard"
import { Gstr1aClient } from "./gstr1a-client"

function getMonthBoundaries(month: number, year: number) {
    const startIst = `${year}-${String(month).padStart(2, '0')}-01T00:00:00+05:30`
    const lastDay = new Date(year, month, 0).getDate()
    const endIst = `${year}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}T23:59:59.999+05:30`
    return { start: new Date(startIst), end: new Date(endIst) }
}

export default async function Gstr1aPage({
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

    // ── Cancelled invoices (need to be reported as amendments) ──
    const cancelledBills = await prisma.billing.findMany({
        where: {
            type: "PHARMACY",
            billDate: { gte: start, lte: end },
            status: "CANCELLED",
        },
        include: {
            items: true,
            patient: { include: { user: true } },
        },
        orderBy: { billDate: "asc" },
    })

    // ── Refunded invoices (credit notes) ──
    const refundedBills = await prisma.billing.findMany({
        where: {
            type: "PHARMACY",
            billDate: { gte: start, lte: end },
            status: "REFUNDED",
        },
        include: {
            items: true,
            patient: { include: { user: true } },
        },
        orderBy: { billDate: "asc" },
    })

    // ── Amended invoices: bills updated after creation (updatedAt > createdAt + 1 min) ──
    const allPharmacyBills = await prisma.billing.findMany({
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

    // Bills where updatedAt is significantly after createdAt (likely edited)
    const amendedBills = allPharmacyBills.filter(b => {
        const diffMs = new Date(b.updatedAt).getTime() - new Date(b.createdAt).getTime()
        return diffMs > 60000 // More than 1 minute difference
    })

    // ── Summary Metrics ──
    const cancelledTaxable = cancelledBills.reduce((s, b) =>
        s + b.items.reduce((is, i) => is + i.amount, 0), 0)
    const cancelledTax = cancelledBills.reduce((s, b) =>
        s + b.items.reduce((is, i) => is + i.gstAmount, 0), 0)

    const refundedTaxable = refundedBills.reduce((s, b) =>
        s + b.items.reduce((is, i) => is + i.amount, 0), 0)
    const refundedTax = refundedBills.reduce((s, b) =>
        s + b.items.reduce((is, i) => is + i.gstAmount, 0), 0)

    const amendedTaxable = amendedBills.reduce((s, b) =>
        s + b.items.reduce((is, i) => is + i.amount, 0), 0)

    const monthLabel = new Date(selectedYear, selectedMonth - 1).toLocaleString("en-IN", { month: "long", year: "numeric" })

    return (
        <div className="p-6 md:p-8 max-w-7xl mx-auto space-y-8 bg-slate-50/50 min-h-[calc(100vh-4rem)]">
            <Gstr1aClient initialMonth={selectedMonth} initialYear={selectedYear} />

            {/* GSTIN Banner */}
            <div className="bg-orange-50 rounded-xl border border-orange-200 p-5 shadow-sm flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                <div>
                    <p className="text-xs font-semibold text-orange-700 uppercase tracking-wider">GSTIN</p>
                    <p className="text-lg font-bold text-orange-900 font-mono tracking-wide">{gstin}</p>
                </div>
                <div className="text-right">
                    <p className="text-xs font-semibold text-orange-700 uppercase tracking-wider">Amendment Period</p>
                    <p className="text-lg font-bold text-orange-900">{monthLabel}</p>
                    <p className="text-xs text-orange-600">Corrections to GSTR-1 before GSTR-3B filing</p>
                </div>
            </div>

            {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-orange-50 rounded-xl border border-orange-200 p-6 shadow-sm relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-orange-100 rounded-full -mr-16 -mt-16 opacity-60" />
                    <p className="text-sm font-semibold text-orange-800 mb-1 relative z-10">Cancelled Invoices</p>
                    <p className="text-3xl font-bold text-orange-900 relative z-10">{cancelledBills.length}</p>
                    <p className="text-xs text-orange-700/80 mt-2 relative z-10">
                        Taxable: ₹{cancelledTaxable.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                    </p>
                </div>

                <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-slate-50 rounded-full -mr-16 -mt-16 opacity-60" />
                    <p className="text-sm font-medium text-slate-500 mb-1 relative z-10">Credit Notes (Refunds)</p>
                    <p className="text-3xl font-bold text-slate-800 relative z-10">{refundedBills.length}</p>
                    <p className="text-xs text-slate-500 mt-2 relative z-10 font-bold">
                        Taxable: ₹{refundedTaxable.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                    </p>
                </div>

                <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-slate-50 rounded-full -mr-16 -mt-16 opacity-60" />
                    <p className="text-sm font-medium text-slate-500 mb-1 relative z-10">Amended Invoices</p>
                    <p className="text-3xl font-bold text-slate-800 relative z-10">{amendedBills.length}</p>
                    <p className="text-xs text-orange-600 mt-2 relative z-10 font-bold">
                        Taxable: ₹{amendedTaxable.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                    </p>
                </div>
            </div>

            {/* Cancelled Invoices Table */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="p-4 border-b border-slate-200 bg-slate-50">
                    <h2 className="font-semibold text-slate-800">Cancelled Invoices</h2>
                    <p className="text-xs text-slate-500 mt-0.5">Invoices voided during the period — to be excluded from GSTR-1 outward supplies</p>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="text-xs text-slate-500 uppercase bg-slate-50/50 border-b border-slate-200">
                            <tr>
                                <th className="px-6 py-4 font-medium">Invoice No</th>
                                <th className="px-6 py-4 font-medium">Date</th>
                                <th className="px-6 py-4 font-medium hidden md:table-cell">Patient / Customer</th>
                                <th className="px-6 py-4 font-medium text-right">Taxable Value (₹)</th>
                                <th className="px-6 py-4 font-medium text-right">CGST (₹)</th>
                                <th className="px-6 py-4 font-medium text-right">SGST (₹)</th>
                                <th className="px-6 py-4 font-medium text-right">Invoice Value (₹)</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {cancelledBills.length === 0 ? (
                                <tr><td colSpan={7} className="px-6 py-12 text-center text-slate-500">No cancelled invoices in this period.</td></tr>
                            ) : cancelledBills.map(bill => {
                                const txVal = bill.items.reduce((s, i) => s + i.amount, 0)
                                const gstAmt = bill.items.reduce((s, i) => s + i.gstAmount, 0)
                                return (
                                    <tr key={bill.id} className="hover:bg-slate-50/50 transition-colors">
                                        <td className="px-6 py-4 font-mono font-bold text-slate-800">{bill.billNumber}</td>
                                        <td className="px-6 py-4 text-slate-500">{new Date(bill.billDate).toLocaleDateString("en-IN")}</td>
                                        <td className="px-6 py-4 text-slate-700 hidden md:table-cell">{bill.patient?.user?.name || "Walk-In"}</td>
                                        <td className="px-6 py-4 text-right font-bold text-slate-800">₹{txVal.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</td>
                                        <td className="px-6 py-4 text-right text-slate-700">₹{(gstAmt / 2).toLocaleString("en-IN", { minimumFractionDigits: 2 })}</td>
                                        <td className="px-6 py-4 text-right text-slate-700">₹{(gstAmt / 2).toLocaleString("en-IN", { minimumFractionDigits: 2 })}</td>
                                        <td className="px-6 py-4 text-right font-bold text-rose-600">₹{bill.netAmount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</td>
                                    </tr>
                                )
                            })}
                        </tbody>
                        {cancelledBills.length > 0 && (
                            <tfoot className="bg-slate-50/80 border-t-2 border-slate-200 font-bold text-slate-800">
                                <tr>
                                    <td colSpan={3} className="px-6 py-4 text-right">Total</td>
                                    <td className="px-6 py-4 text-right">₹{cancelledTaxable.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</td>
                                    <td className="px-6 py-4 text-right">₹{(cancelledTax / 2).toLocaleString("en-IN", { minimumFractionDigits: 2 })}</td>
                                    <td className="px-6 py-4 text-right">₹{(cancelledTax / 2).toLocaleString("en-IN", { minimumFractionDigits: 2 })}</td>
                                    <td className="px-6 py-4 text-right text-rose-600">₹{cancelledBills.reduce((s, b) => s + b.netAmount, 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}</td>
                                </tr>
                            </tfoot>
                        )}
                    </table>
                </div>
            </div>

            {/* Credit Notes / Refunds Table */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="p-4 border-b border-slate-200 bg-slate-50">
                    <h2 className="font-semibold text-slate-800">Credit Notes (Refunds)</h2>
                    <p className="text-xs text-slate-500 mt-0.5">Refunded invoices to be reported as credit notes in GSTR-1</p>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="text-xs text-slate-500 uppercase bg-slate-50/50 border-b border-slate-200">
                            <tr>
                                <th className="px-6 py-4 font-medium">Original Invoice No</th>
                                <th className="px-6 py-4 font-medium">Date</th>
                                <th className="px-6 py-4 font-medium hidden md:table-cell">Patient / Customer</th>
                                <th className="px-6 py-4 font-medium text-right">Taxable Value (₹)</th>
                                <th className="px-6 py-4 font-medium text-right">CGST (₹)</th>
                                <th className="px-6 py-4 font-medium text-right">SGST (₹)</th>
                                <th className="px-6 py-4 font-medium text-right">Credit Note Value (₹)</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {refundedBills.length === 0 ? (
                                <tr><td colSpan={7} className="px-6 py-12 text-center text-slate-500">No credit notes in this period.</td></tr>
                            ) : refundedBills.map(bill => {
                                const txVal = bill.items.reduce((s, i) => s + i.amount, 0)
                                const gstAmt = bill.items.reduce((s, i) => s + i.gstAmount, 0)
                                return (
                                    <tr key={bill.id} className="hover:bg-slate-50/50 transition-colors">
                                        <td className="px-6 py-4 font-mono font-bold text-slate-800">{bill.billNumber}</td>
                                        <td className="px-6 py-4 text-slate-500">{new Date(bill.billDate).toLocaleDateString("en-IN")}</td>
                                        <td className="px-6 py-4 text-slate-700 hidden md:table-cell">{bill.patient?.user?.name || "Walk-In"}</td>
                                        <td className="px-6 py-4 text-right font-bold text-slate-800">₹{txVal.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</td>
                                        <td className="px-6 py-4 text-right text-slate-700">₹{(gstAmt / 2).toLocaleString("en-IN", { minimumFractionDigits: 2 })}</td>
                                        <td className="px-6 py-4 text-right text-slate-700">₹{(gstAmt / 2).toLocaleString("en-IN", { minimumFractionDigits: 2 })}</td>
                                        <td className="px-6 py-4 text-right font-bold text-rose-600">₹{bill.netAmount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</td>
                                    </tr>
                                )
                            })}
                        </tbody>
                        {refundedBills.length > 0 && (
                            <tfoot className="bg-slate-50/80 border-t-2 border-slate-200 font-bold text-slate-800">
                                <tr>
                                    <td colSpan={3} className="px-6 py-4 text-right">Total</td>
                                    <td className="px-6 py-4 text-right">₹{refundedTaxable.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</td>
                                    <td className="px-6 py-4 text-right">₹{(refundedTax / 2).toLocaleString("en-IN", { minimumFractionDigits: 2 })}</td>
                                    <td className="px-6 py-4 text-right">₹{(refundedTax / 2).toLocaleString("en-IN", { minimumFractionDigits: 2 })}</td>
                                    <td className="px-6 py-4 text-right text-rose-600">₹{refundedBills.reduce((s, b) => s + b.netAmount, 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}</td>
                                </tr>
                            </tfoot>
                        )}
                    </table>
                </div>
            </div>

            {/* Amended Invoices Table */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="p-4 border-b border-slate-200 bg-slate-50">
                    <h2 className="font-semibold text-slate-800">Amended Invoices</h2>
                    <p className="text-xs text-slate-500 mt-0.5">Invoices modified after creation — revised values to be filed</p>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="text-xs text-slate-500 uppercase bg-slate-50/50 border-b border-slate-200">
                            <tr>
                                <th className="px-6 py-4 font-medium">Invoice No</th>
                                <th className="px-6 py-4 font-medium">Invoice Date</th>
                                <th className="px-6 py-4 font-medium hidden md:table-cell">Last Modified</th>
                                <th className="px-6 py-4 font-medium hidden md:table-cell">Patient / Customer</th>
                                <th className="px-6 py-4 font-medium text-right">Current Taxable (₹)</th>
                                <th className="px-6 py-4 font-medium text-right">Current Tax (₹)</th>
                                <th className="px-6 py-4 font-medium text-right">Current Value (₹)</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {amendedBills.length === 0 ? (
                                <tr><td colSpan={7} className="px-6 py-12 text-center text-slate-500">No amended invoices in this period.</td></tr>
                            ) : amendedBills.map(bill => {
                                const txVal = bill.items.reduce((s, i) => s + i.amount, 0)
                                const gstAmt = bill.items.reduce((s, i) => s + i.gstAmount, 0)
                                return (
                                    <tr key={bill.id} className="hover:bg-slate-50/50 transition-colors">
                                        <td className="px-6 py-4 font-mono font-bold text-slate-800">{bill.billNumber}</td>
                                        <td className="px-6 py-4 text-slate-500">{new Date(bill.billDate).toLocaleDateString("en-IN")}</td>
                                        <td className="px-6 py-4 text-orange-600 hidden md:table-cell">{new Date(bill.updatedAt).toLocaleDateString("en-IN")}</td>
                                        <td className="px-6 py-4 text-slate-700 hidden md:table-cell">{bill.patient?.user?.name || "Walk-In"}</td>
                                        <td className="px-6 py-4 text-right font-bold text-slate-800">₹{txVal.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</td>
                                        <td className="px-6 py-4 text-right text-slate-700">₹{gstAmt.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</td>
                                        <td className="px-6 py-4 text-right font-bold text-orange-700">₹{bill.netAmount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</td>
                                    </tr>
                                )
                            })}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    )
}
