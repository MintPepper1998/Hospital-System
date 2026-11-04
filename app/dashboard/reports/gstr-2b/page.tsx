import { prisma } from "@/lib/prisma"
import { requireAuth } from "@/lib/auth-guard"
import { Gstr2bClient } from "./gstr2b-client"

function getMonthBoundaries(month: number, year: number) {
    const startIst = `${year}-${String(month).padStart(2, '0')}-01T00:00:00+05:30`
    const lastDay = new Date(year, month, 0).getDate()
    const endIst = `${year}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}T23:59:59.999+05:30`
    return { start: new Date(startIst), end: new Date(endIst) }
}

interface SupplierItcBucket {
    supplierId: string
    supplierName: string
    gstin: string
    invoiceCount: number
    taxableValue: number
    cgst: number
    sgst: number
    totalItc: number
}

interface RateItcBucket {
    rate: number
    taxableValue: number
    cgst: number
    sgst: number
    totalItc: number
}

export default async function Gstr2bPage({
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

    // ── Fetch purchase invoices with supplier & items ──
    const purchases = await prisma.purchaseInvoice.findMany({
        where: {
            date: { gte: start, lte: end },
        },
        include: {
            supplier: true,
            items: true,
        },
        orderBy: { date: "asc" },
    })

    // ── Aggregate by supplier ──
    const supplierMap = new Map<string, SupplierItcBucket>()
    const rateMap = new Map<number, RateItcBucket>()

    let grandTaxable = 0
    let grandCgst = 0
    let grandSgst = 0
    let grandItc = 0

    // INTEGRITY CHECK: Fetch inventory batches to validate medicine purchase items
    const allBatches = await prisma.inventoryBatch.findMany({
        select: { medicineId: true, batchNumber: true, invoiceNumber: true, supplierId: true },
    })

    for (const inv of purchases) {
        // Supplier bucket
        if (!supplierMap.has(inv.supplierId)) {
            supplierMap.set(inv.supplierId, {
                supplierId: inv.supplierId,
                supplierName: inv.supplier.name,
                gstin: inv.supplier.gstNumber || "UNREGISTERED",
                invoiceCount: 0,
                taxableValue: 0,
                cgst: 0,
                sgst: 0,
                totalItc: 0,
            })
        }
        const sb = supplierMap.get(inv.supplierId)!
        sb.invoiceCount += 1

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
            const cgst = taxAmt / 2
            const sgst = taxAmt / 2

            sb.taxableValue += taxableVal
            sb.cgst += cgst
            sb.sgst += sgst
            sb.totalItc += taxAmt

            // Rate bucket
            if (!rateMap.has(item.taxPercent)) {
                rateMap.set(item.taxPercent, { rate: item.taxPercent, taxableValue: 0, cgst: 0, sgst: 0, totalItc: 0 })
            }
            const rb = rateMap.get(item.taxPercent)!
            rb.taxableValue += taxableVal
            rb.cgst += cgst
            rb.sgst += sgst
            rb.totalItc += taxAmt

            grandTaxable += taxableVal
            grandCgst += cgst
            grandSgst += sgst
            grandItc += taxAmt
        }
    }

    const supplierBuckets = Array.from(supplierMap.values()).sort((a, b) => b.totalItc - a.totalItc)
    const rateBuckets = Array.from(rateMap.values()).sort((a, b) => a.rate - b.rate)
    const registeredSuppliers = supplierBuckets.filter(s => s.gstin !== "UNREGISTERED")
    const unregisteredSuppliers = supplierBuckets.filter(s => s.gstin === "UNREGISTERED")

    const monthLabel = new Date(selectedYear, selectedMonth - 1).toLocaleString("en-IN", { month: "long", year: "numeric" })

    return (
        <div className="p-6 md:p-8 max-w-7xl mx-auto space-y-8 bg-slate-50/50 min-h-[calc(100vh-4rem)]">
            <Gstr2bClient initialMonth={selectedMonth} initialYear={selectedYear} />

            {/* GSTIN Banner */}
            <div className="bg-violet-50 rounded-xl border border-violet-200 p-5 shadow-sm flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                <div>
                    <p className="text-xs font-semibold text-violet-700 uppercase tracking-wider">GSTIN (Recipient)</p>
                    <p className="text-lg font-bold text-violet-900 font-mono tracking-wide">{gstin}</p>
                </div>
                <div className="text-right">
                    <p className="text-xs font-semibold text-violet-700 uppercase tracking-wider">ITC Period</p>
                    <p className="text-lg font-bold text-violet-900">{monthLabel}</p>
                    <p className="text-xs text-violet-600">Auto-drafted from supplier purchase invoices</p>
                </div>
            </div>

            {/* Read-only notice */}
            <div className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 text-sm text-amber-800 flex items-start gap-2">
                <span className="font-bold text-amber-600 mt-0.5">Note:</span>
                <span>GSTR-2B is a <strong>read-only, auto-drafted</strong> statement. It is not filed but used to reconcile Input Tax Credit (ITC) claimed in GSTR-3B. Data shown is based on purchase invoices recorded in the system.</span>
            </div>

            {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <div className="bg-violet-50 rounded-xl border border-violet-200 p-6 shadow-sm relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-violet-100 rounded-full -mr-16 -mt-16 opacity-60" />
                    <p className="text-sm font-semibold text-violet-800 mb-1 relative z-10">Total ITC Available</p>
                    <p className="text-3xl font-bold text-violet-900 relative z-10">
                        ₹{grandItc.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                    </p>
                    <p className="text-xs text-violet-700/80 mt-2 relative z-10">From {purchases.length} purchase invoices</p>
                </div>

                <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-slate-50 rounded-full -mr-16 -mt-16 opacity-60" />
                    <p className="text-sm font-medium text-slate-500 mb-1 relative z-10">CGST Credit</p>
                    <p className="text-3xl font-bold text-slate-800 relative z-10">
                        ₹{grandCgst.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                    </p>
                    <p className="text-xs text-slate-500 mt-2 relative z-10 font-bold">Central GST input</p>
                </div>

                <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-slate-50 rounded-full -mr-16 -mt-16 opacity-60" />
                    <p className="text-sm font-medium text-slate-500 mb-1 relative z-10">SGST Credit</p>
                    <p className="text-3xl font-bold text-slate-800 relative z-10">
                        ₹{grandSgst.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                    </p>
                    <p className="text-xs text-slate-500 mt-2 relative z-10 font-bold">State GST input</p>
                </div>

                <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-slate-50 rounded-full -mr-16 -mt-16 opacity-60" />
                    <p className="text-sm font-medium text-slate-500 mb-1 relative z-10">Total Purchase Value</p>
                    <p className="text-3xl font-bold text-slate-800 relative z-10">
                        ₹{grandTaxable.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                    </p>
                    <p className="text-xs text-violet-600 mt-2 relative z-10 font-bold">{supplierBuckets.length} suppliers</p>
                </div>
            </div>

            {/* ITC by Rate Table */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="p-4 border-b border-slate-200 bg-slate-50">
                    <h2 className="font-semibold text-slate-800">ITC Summary by Tax Rate</h2>
                    <p className="text-xs text-slate-500 mt-0.5">Input tax credit grouped by GST rate slab</p>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="text-xs text-slate-500 uppercase bg-slate-50/50 border-b border-slate-200">
                            <tr>
                                <th className="px-6 py-4 font-medium">GST Rate (%)</th>
                                <th className="px-6 py-4 font-medium text-right">Taxable Value (₹)</th>
                                <th className="px-6 py-4 font-medium text-right">CGST (₹)</th>
                                <th className="px-6 py-4 font-medium text-right">SGST (₹)</th>
                                <th className="px-6 py-4 font-medium text-right">Total ITC (₹)</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {rateBuckets.length === 0 ? (
                                <tr><td colSpan={5} className="px-6 py-12 text-center text-slate-500">No purchase data for this period.</td></tr>
                            ) : rateBuckets.map(rb => (
                                <tr key={rb.rate} className="hover:bg-slate-50/50 transition-colors">
                                    <td className="px-6 py-4">
                                        <span className="inline-flex items-center px-3 py-1 rounded-md text-xs font-bold bg-violet-50 text-violet-700 border border-violet-100">{rb.rate}%</span>
                                    </td>
                                    <td className="px-6 py-4 text-right font-bold text-slate-800">₹{rb.taxableValue.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</td>
                                    <td className="px-6 py-4 text-right text-slate-700">₹{rb.cgst.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</td>
                                    <td className="px-6 py-4 text-right text-slate-700">₹{rb.sgst.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</td>
                                    <td className="px-6 py-4 text-right font-bold text-violet-700">₹{rb.totalItc.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</td>
                                </tr>
                            ))}
                        </tbody>
                        {rateBuckets.length > 0 && (
                            <tfoot className="bg-slate-50/80 border-t-2 border-slate-200 font-bold text-slate-800">
                                <tr>
                                    <td className="px-6 py-4">Total</td>
                                    <td className="px-6 py-4 text-right">₹{grandTaxable.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</td>
                                    <td className="px-6 py-4 text-right">₹{grandCgst.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</td>
                                    <td className="px-6 py-4 text-right">₹{grandSgst.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</td>
                                    <td className="px-6 py-4 text-right text-violet-700">₹{grandItc.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</td>
                                </tr>
                            </tfoot>
                        )}
                    </table>
                </div>
            </div>

            {/* Supplier-wise ITC — Registered */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="p-4 border-b border-slate-200 bg-slate-50">
                    <h2 className="font-semibold text-slate-800">ITC from Registered Suppliers (B2B)</h2>
                    <p className="text-xs text-slate-500 mt-0.5">Eligible ITC from suppliers with valid GSTIN</p>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="text-xs text-slate-500 uppercase bg-slate-50/50 border-b border-slate-200">
                            <tr>
                                <th className="px-6 py-4 font-medium">#</th>
                                <th className="px-6 py-4 font-medium">Supplier Name</th>
                                <th className="px-6 py-4 font-medium hidden md:table-cell">GSTIN</th>
                                <th className="px-6 py-4 font-medium text-center">Invoices</th>
                                <th className="px-6 py-4 font-medium text-right">Taxable Value (₹)</th>
                                <th className="px-6 py-4 font-medium text-right hidden sm:table-cell">CGST (₹)</th>
                                <th className="px-6 py-4 font-medium text-right hidden sm:table-cell">SGST (₹)</th>
                                <th className="px-6 py-4 font-medium text-right">Total ITC (₹)</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {registeredSuppliers.length === 0 ? (
                                <tr><td colSpan={8} className="px-6 py-12 text-center text-slate-500">No purchases from registered suppliers.</td></tr>
                            ) : registeredSuppliers.map((sb, idx) => (
                                <tr key={sb.supplierId} className="hover:bg-slate-50/50 transition-colors">
                                    <td className="px-6 py-4 text-slate-400 font-medium">{idx + 1}</td>
                                    <td className="px-6 py-4 font-bold text-slate-800">{sb.supplierName}</td>
                                    <td className="px-6 py-4 font-mono text-xs text-slate-600 hidden md:table-cell">{sb.gstin}</td>
                                    <td className="px-6 py-4 text-center font-semibold text-slate-700">{sb.invoiceCount}</td>
                                    <td className="px-6 py-4 text-right font-bold text-slate-800">₹{sb.taxableValue.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</td>
                                    <td className="px-6 py-4 text-right text-slate-700 hidden sm:table-cell">₹{sb.cgst.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</td>
                                    <td className="px-6 py-4 text-right text-slate-700 hidden sm:table-cell">₹{sb.sgst.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</td>
                                    <td className="px-6 py-4 text-right font-bold text-violet-700">₹{sb.totalItc.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Unregistered Suppliers (if any) */}
            {unregisteredSuppliers.length > 0 && (
                <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                    <div className="p-4 border-b border-slate-200 bg-slate-50">
                        <h2 className="font-semibold text-slate-800">Purchases from Unregistered Suppliers</h2>
                        <p className="text-xs text-rose-500 mt-0.5">ITC not eligible — supplier GSTIN missing. Reverse charge may apply.</p>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left">
                            <thead className="text-xs text-slate-500 uppercase bg-slate-50/50 border-b border-slate-200">
                                <tr>
                                    <th className="px-6 py-4 font-medium">#</th>
                                    <th className="px-6 py-4 font-medium">Supplier Name</th>
                                    <th className="px-6 py-4 font-medium text-center">Invoices</th>
                                    <th className="px-6 py-4 font-medium text-right">Purchase Value (₹)</th>
                                    <th className="px-6 py-4 font-medium text-right">Tax Paid (₹)</th>
                                    <th className="px-6 py-4 font-medium text-center">ITC Eligible</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {unregisteredSuppliers.map((sb, idx) => (
                                    <tr key={sb.supplierId} className="hover:bg-slate-50/50 transition-colors">
                                        <td className="px-6 py-4 text-slate-400 font-medium">{idx + 1}</td>
                                        <td className="px-6 py-4 font-bold text-slate-800">{sb.supplierName}</td>
                                        <td className="px-6 py-4 text-center font-semibold text-slate-700">{sb.invoiceCount}</td>
                                        <td className="px-6 py-4 text-right font-bold text-slate-800">₹{sb.taxableValue.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</td>
                                        <td className="px-6 py-4 text-right text-slate-700">₹{sb.totalItc.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</td>
                                        <td className="px-6 py-4 text-center">
                                            <span className="inline-flex items-center px-2 py-1 rounded text-[10px] font-bold uppercase bg-rose-50 text-rose-600 border border-rose-100">No</span>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </div>
    )
}
