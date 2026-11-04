"use client"

import { useRef, useState } from "react"
import Link from "next/link"
import { format } from "date-fns"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ArrowLeft, Printer, CreditCard, FileText, Package, Calendar, Building2, Hash, Pencil } from "lucide-react"
import { RecordPaymentDialog } from "./record-payment-dialog"
import { useRouter } from "next/navigation"

// ============================================
// NEOMORPHIC TOKENS
// ============================================

const neo = {
  card: "rounded-2xl bg-[#e0e5ec] border-none",
  shadow: "shadow-[6px_6px_12px_#bec3c9,-6px_-6px_12px_#ffffff]",
  shadowSm: "shadow-[3px_3px_6px_#bec3c9,-3px_-3px_6px_#ffffff]",
  inset: "shadow-[inset_3px_3px_6px_#bec3c9,inset_-3px_-3px_6px_#ffffff]",
}

// ============================================
// HELPERS
// ============================================

function formatINR(n: number): string {
  return `₹${n.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

function StatusBadge({ status }: { status: string }) {
  const config: Record<string, { bg: string; text: string; dot: string; label: string }> = {
    PAID: { bg: "bg-emerald-100/80", text: "text-emerald-700", dot: "bg-emerald-500", label: "Paid" },
    PARTIAL: { bg: "bg-amber-100/80", text: "text-amber-700", dot: "bg-amber-500", label: "Partially Paid" },
    UNPAID: { bg: "bg-red-100/80", text: "text-red-600", dot: "bg-red-500", label: "Unpaid" },
  }
  const c = config[status] || config.UNPAID
  return (
    <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold tracking-wide ${c.bg} ${c.text}`}>
      <span className={`w-2 h-2 rounded-full ${c.dot} animate-pulse`} />
      {c.label}
    </span>
  )
}

function InfoChip({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className={`${neo.card} ${neo.shadowSm} px-4 py-3 flex items-center gap-3 transition-all duration-300 hover:translate-y-[-1px]`}>
      <div className={`w-8 h-8 rounded-lg ${neo.card} ${neo.inset} flex items-center justify-center`}>
        {icon}
      </div>
      <div>
        <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">{label}</p>
        <p className="text-sm font-bold text-slate-700">{value}</p>
      </div>
    </div>
  )
}

// ============================================
// COMPONENT
// ============================================

export function PurchaseInvoiceDetailClient({ 
  invoice,
  canEdit = false
}: { 
  invoice: any
  canEdit?: boolean
}) {
  const router = useRouter()
  const printRef = useRef<HTMLDivElement>(null)
  const [showPayment, setShowPayment] = useState(false)

  const returnsTotal = (invoice.purchaseReturns || []).reduce((s: number, r: any) => s + (r.totalAmount || 0), 0)
  const balanceDue = Math.max(0, (invoice.grandTotal || 0) - (invoice.amountPaid || 0) - returnsTotal)
  const paymentProgress = invoice.grandTotal > 0 ? Math.min((invoice.amountPaid / invoice.grandTotal) * 100, 100) : 0

  const handlePrint = () => {
    const content = printRef.current
    if (!content) return

    const printHTML = `
      <!DOCTYPE html><html><head>
      <title>Purchase Invoice - ${invoice.invoiceNumber}</title>
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: 'Segoe UI', system-ui, sans-serif; padding: 30px; font-size: 12px; color: #334155; }
        .header { text-align: center; margin-bottom: 24px; padding-bottom: 16px; border-bottom: 2px solid #1e293b; }
        .header h1 { font-size: 20px; font-weight: 800; letter-spacing: 2px; color: #1e293b; }
        .header .subtitle { font-size: 10px; color: #94a3b8; letter-spacing: 1px; margin-top: 4px; }
        .info-row { display: flex; justify-content: space-between; margin-bottom: 20px; }
        .info-block h3 { font-size: 9px; font-weight: 700; text-transform: uppercase; letter-spacing: 1.5px; color: #94a3b8; margin-bottom: 6px; }
        .info-block p { font-size: 12px; margin-bottom: 3px; color: #475569; }
        .info-block strong { color: #1e293b; }
        table { width: 100%; border-collapse: collapse; margin: 16px 0; }
        thead tr { background: #f1f5f9; }
        th { text-align: left; padding: 10px 8px; font-size: 9px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; color: #64748b; border-bottom: 2px solid #e2e8f0; }
        td { padding: 8px; font-size: 11px; border-bottom: 1px solid #f1f5f9; color: #475569; }
        .text-right { text-align: right; }
        .text-center { text-align: center; }
        .totals { float: right; width: 260px; margin-top: 16px; }
        .totals td { border: none; padding: 5px 8px; font-size: 12px; }
        .totals .total-row td { font-weight: 800; font-size: 14px; border-top: 2px solid #1e293b; padding-top: 10px; color: #1e293b; }
        .payment-bar { margin-top: 24px; clear: both; padding: 16px 0; border-top: 1px dashed #cbd5e1; }
        .payment-bar table td { border: none; padding: 4px 8px; }
        @media print { body { padding: 15px; } }
      </style></head><body>${content.innerHTML}</body></html>
    `

    // Try window.open first (works in browser), fall back to iframe (works in Tauri)
    const printWindow = window.open("", "_blank")
    if (printWindow) {
      printWindow.document.write(printHTML)
      printWindow.document.close()
      printWindow.focus()
      setTimeout(() => printWindow.print(), 300)
    } else {
      // Tauri fallback: use a hidden iframe
      const existingFrame = document.getElementById("print-iframe") as HTMLIFrameElement | null
      if (existingFrame) existingFrame.remove()

      const iframe = document.createElement("iframe")
      iframe.id = "print-iframe"
      iframe.style.position = "fixed"
      iframe.style.top = "-10000px"
      iframe.style.left = "-10000px"
      iframe.style.width = "210mm"
      iframe.style.height = "297mm"
      iframe.style.border = "none"
      document.body.appendChild(iframe)

      const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document
      if (!iframeDoc) return

      iframeDoc.open()
      iframeDoc.write(printHTML)
      iframeDoc.close()

      setTimeout(() => {
        iframe.contentWindow?.focus()
        iframe.contentWindow?.print()
        // Clean up after printing
        setTimeout(() => { try { iframe.remove() } catch {} }, 2000)
      }, 500)
    }
  }

  return (
    <>
      {/* ── Action Bar ── */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/dashboard/pharmacy/purchase-invoices">
            <div className={`w-10 h-10 rounded-xl ${neo.card} ${neo.shadowSm} flex items-center justify-center hover:translate-y-[-1px] transition-all duration-200`}>
              <ArrowLeft className="h-4 w-4 text-slate-600" />
            </div>
          </Link>
          <div>
            <h1 className="text-2xl font-extrabold text-slate-800 tracking-tight">Purchase Invoice</h1>
            <p className="text-sm text-slate-400 mt-0.5">#{invoice.invoiceNumber}</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {canEdit && (
            <Button
              variant="outline"
              asChild
              className={`gap-2 rounded-xl ${neo.card} ${neo.shadowSm} border-none hover:translate-y-[-1px] transition-all duration-200`}
            >
              <Link href={`/dashboard/pharmacy/purchase-invoices/${invoice.id}/edit`}>
                <Pencil className="h-4 w-4 text-amber-500" /> Edit Invoice
              </Link>
            </Button>
          )}
          {invoice.status !== "PAID" && (
            <Button
              variant="outline"
              onClick={() => setShowPayment(true)}
              className={`gap-2 rounded-xl ${neo.card} ${neo.shadowSm} border-none hover:translate-y-[-1px] transition-all duration-200`}
            >
              <CreditCard className="h-4 w-4 text-indigo-500" /> Record Payment
            </Button>
          )}
          <Button
            onClick={handlePrint}
            className="gap-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white shadow-md hover:translate-y-[-1px] transition-all duration-200"
          >
            <Printer className="h-4 w-4" /> Print
          </Button>
        </div>
      </div>

      {/* ── Info Chips Row ── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <InfoChip
          icon={<Hash className="h-3.5 w-3.5 text-indigo-500" />}
          label="Invoice No."
          value={invoice.invoiceNumber}
        />
        <InfoChip
          icon={<Building2 className="h-3.5 w-3.5 text-blue-500" />}
          label="Supplier"
          value={invoice.supplier?.name || "—"}
        />
        <InfoChip
          icon={<Calendar className="h-3.5 w-3.5 text-emerald-500" />}
          label="Date"
          value={format(new Date(invoice.date), "dd MMM yyyy")}
        />
        <InfoChip
          icon={<Package className="h-3.5 w-3.5 text-amber-500" />}
          label="Total Items"
          value={(() => {
            const total = invoice.items?.length || 0
            const freeGoods = (invoice.items || []).filter((i: any) => i.isFreeGood).length
            return freeGoods > 0 ? `${total} (${freeGoods} free)` : total.toString()
          })()}
        />
      </div>

      {/* ── Payment Progress Card ── */}
      <div className={`${neo.card} ${neo.shadow} p-6`}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-bold text-slate-700 uppercase tracking-wider">Payment Status</h3>
          <StatusBadge status={invoice.status} />
        </div>
        <div className="grid grid-cols-3 gap-6 mb-5">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 mb-1">Grand Total</p>
            <p className="text-2xl font-extrabold text-slate-800 tabular-nums">{formatINR(invoice.grandTotal || 0)}</p>
          </div>
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 mb-1">Amount Paid</p>
            <p className="text-2xl font-extrabold text-emerald-600 tabular-nums">{formatINR(invoice.amountPaid || 0)}</p>
          </div>
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 mb-1">Balance Due</p>
            <p className={`text-2xl font-extrabold tabular-nums ${balanceDue > 0.01 ? "text-red-600" : "text-emerald-600"}`}>
              {formatINR(Math.max(balanceDue, 0))}
            </p>
          </div>
        </div>
        {/* Progress bar */}
        <div className={`h-3 rounded-full ${neo.inset} overflow-hidden`}>
          <div
            className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-emerald-500 transition-all duration-700 ease-out"
            style={{ width: `${paymentProgress}%` }}
          />
        </div>
        <p className="text-[11px] text-slate-400 mt-2 text-right">{paymentProgress.toFixed(0)}% paid</p>
      </div>

      {/* ── Printable Invoice ── */}
      <div className={`${neo.card} ${neo.shadow} p-8`}>
        <div ref={printRef}>
          {/* Header */}
          <div style={{ textAlign: "center", marginBottom: "24px", paddingBottom: "16px", borderBottom: "2px solid #1e293b" }}>
            <h1 style={{ fontSize: "20px", fontWeight: 800, letterSpacing: "2px", color: "#1e293b" }}>PURCHASE INVOICE</h1>
            <p style={{ fontSize: "10px", color: "#94a3b8", letterSpacing: "1px", marginTop: "4px" }}>TAX INVOICE / GOODS RECEIPT</p>
          </div>

          {/* Info Row */}
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "20px" }}>
            <div>
              <h3 style={{ fontSize: "9px", fontWeight: 700, textTransform: "uppercase" as const, letterSpacing: "1.5px", color: "#94a3b8", marginBottom: "6px" }}>Supplier Details</h3>
              <p style={{ fontSize: "13px", fontWeight: "bold", color: "#1e293b" }}>{invoice.supplier?.name || "—"}</p>
              {invoice.supplier?.phone && <p style={{ fontSize: "12px", color: "#475569" }}>Phone: {invoice.supplier.phone}</p>}
              {invoice.supplier?.gstNumber && <p style={{ fontSize: "12px", color: "#475569" }}>GSTIN: {invoice.supplier.gstNumber}</p>}
              {invoice.supplier?.address && <p style={{ fontSize: "12px", color: "#475569" }}>{invoice.supplier.address}</p>}
            </div>
            <div style={{ textAlign: "right" }}>
              <h3 style={{ fontSize: "9px", fontWeight: 700, textTransform: "uppercase" as const, letterSpacing: "1.5px", color: "#94a3b8", marginBottom: "6px" }}>Invoice Details</h3>
              <p style={{ fontSize: "12px", color: "#475569" }}>Invoice: <strong style={{ color: "#1e293b" }}>{invoice.invoiceNumber}</strong></p>
              <p style={{ fontSize: "12px", color: "#475569" }}>Date: <strong style={{ color: "#1e293b" }}>{format(new Date(invoice.date), "dd MMM yyyy")}</strong></p>
            </div>
          </div>

          {/* Items Table */}
          <table style={{ width: "100%", borderCollapse: "collapse", margin: "16px 0" }}>
            <thead>
              <tr style={{ background: "#f1f5f9" }}>
                <th style={{ textAlign: "left", padding: "10px 8px", fontSize: "9px", fontWeight: 700, textTransform: "uppercase" as const, letterSpacing: "1px", color: "#64748b", borderBottom: "2px solid #e2e8f0" }}>#</th>
                <th style={{ textAlign: "left", padding: "10px 8px", fontSize: "9px", fontWeight: 700, textTransform: "uppercase" as const, letterSpacing: "1px", color: "#64748b", borderBottom: "2px solid #e2e8f0" }}>Item Name</th>
                <th style={{ textAlign: "left", padding: "10px 8px", fontSize: "9px", fontWeight: 700, textTransform: "uppercase" as const, letterSpacing: "1px", color: "#64748b", borderBottom: "2px solid #e2e8f0" }}>Type</th>
                <th style={{ textAlign: "left", padding: "10px 8px", fontSize: "9px", fontWeight: 700, textTransform: "uppercase" as const, letterSpacing: "1px", color: "#64748b", borderBottom: "2px solid #e2e8f0" }}>Batch</th>
                <th style={{ textAlign: "left", padding: "10px 8px", fontSize: "9px", fontWeight: 700, textTransform: "uppercase" as const, letterSpacing: "1px", color: "#64748b", borderBottom: "2px solid #e2e8f0" }}>HSN</th>
                <th style={{ textAlign: "center", padding: "10px 8px", fontSize: "9px", fontWeight: 700, textTransform: "uppercase" as const, letterSpacing: "1px", color: "#64748b", borderBottom: "2px solid #e2e8f0" }}>Qty</th>
                <th style={{ textAlign: "center", padding: "10px 8px", fontSize: "9px", fontWeight: 700, textTransform: "uppercase" as const, letterSpacing: "1px", color: "#64748b", borderBottom: "2px solid #e2e8f0" }}>Free</th>
                <th style={{ textAlign: "center", padding: "10px 8px", fontSize: "9px", fontWeight: 700, textTransform: "uppercase" as const, letterSpacing: "1px", color: "#64748b", borderBottom: "2px solid #e2e8f0" }}>Pack</th>
                <th style={{ textAlign: "right", padding: "10px 8px", fontSize: "9px", fontWeight: 700, textTransform: "uppercase" as const, letterSpacing: "1px", color: "#64748b", borderBottom: "2px solid #e2e8f0" }}>Rate</th>
                <th style={{ textAlign: "center", padding: "10px 8px", fontSize: "9px", fontWeight: 700, textTransform: "uppercase" as const, letterSpacing: "1px", color: "#64748b", borderBottom: "2px solid #e2e8f0" }}>Disc%</th>
                <th style={{ textAlign: "center", padding: "10px 8px", fontSize: "9px", fontWeight: 700, textTransform: "uppercase" as const, letterSpacing: "1px", color: "#64748b", borderBottom: "2px solid #e2e8f0" }}>GST%</th>
                <th style={{ textAlign: "right", padding: "10px 8px", fontSize: "9px", fontWeight: 700, textTransform: "uppercase" as const, letterSpacing: "1px", color: "#64748b", borderBottom: "2px solid #e2e8f0" }}>MRP</th>
                <th style={{ textAlign: "right", padding: "10px 8px", fontSize: "9px", fontWeight: 700, textTransform: "uppercase" as const, letterSpacing: "1px", color: "#64748b", borderBottom: "2px solid #e2e8f0" }}>Expiry</th>
                <th style={{ textAlign: "right", padding: "10px 8px", fontSize: "9px", fontWeight: 700, textTransform: "uppercase" as const, letterSpacing: "1px", color: "#64748b", borderBottom: "2px solid #e2e8f0" }}>Amount</th>
              </tr>
            </thead>
            <tbody>
              {(invoice.items || []).map((item: any, idx: number) => {
                // Convert stored per-unit values back to strip-level for invoice display
                // The seller sells strips/packs, not individual tablets
                const packSize = item.packSize || 1
                const round2 = (n: number) => Number(n.toFixed(2))
                const displayQty = packSize > 1 ? Math.round(item.quantity / packSize) : item.quantity
                const displayFree = packSize > 1 ? Math.round((item.freeQuantity || 0) / packSize) : (item.freeQuantity || 0)
                const displayRate = round2((item.rate || 0) * packSize)           // per-unit rate × packSize = strip price
                const displayMRP = round2((item.sellPrice || 0) * packSize)       // per-unit MRP × packSize = strip MRP
                return (
                <tr key={item.id} style={{ borderBottom: "1px solid #f1f5f9", background: item.isFreeGood ? "#f5f3ff" : "transparent" }}>
                  <td style={{ padding: "8px", fontSize: "11px", color: "#94a3b8" }}>{idx + 1}</td>
                  <td style={{ padding: "8px", fontSize: "11px", fontWeight: 600, color: "#1e293b" }}>
                    {item.itemName}
                    {item.isFreeGood && (
                      <span style={{ marginLeft: "6px", padding: "1px 6px", borderRadius: "4px", fontSize: "9px", fontWeight: 700, background: "#ede9fe", color: "#7c3aed", letterSpacing: "0.5px" }}>FREE GOOD</span>
                    )}
                  </td>
                  <td style={{ padding: "8px", fontSize: "10px", color: "#64748b", textTransform: "capitalize" as const }}>{item.medicine?.type?.toLowerCase() || "—"}</td>
                  <td style={{ padding: "8px", fontSize: "11px", color: "#475569" }}>{item.batchNumber || "—"}</td>
                  <td style={{ padding: "8px", fontSize: "11px", color: "#475569" }}>{item.hsnCode || "—"}</td>
                  <td style={{ padding: "8px", fontSize: "11px", textAlign: "center", color: "#475569", fontWeight: 600 }}>{displayQty}</td>
                  <td style={{ padding: "8px", fontSize: "11px", textAlign: "center", color: displayFree > 0 ? "#059669" : "#94a3b8" }}>{displayFree || "—"}</td>
                  <td style={{ padding: "8px", fontSize: "11px", textAlign: "center", color: packSize > 1 ? "#6366f1" : "#94a3b8", fontWeight: packSize > 1 ? 600 : 400 }}>{packSize > 1 ? packSize : "—"}</td>
                  <td style={{ padding: "8px", fontSize: "11px", textAlign: "right", color: item.isFreeGood ? "#a1a1aa" : "#475569" }}>{item.isFreeGood ? "₹0" : `₹${displayRate.toFixed(2)}`}</td>
                  <td style={{ padding: "8px", fontSize: "11px", textAlign: "center", color: item.isFreeGood ? "#a1a1aa" : ((item.discountPercent || 0) > 0 ? "#059669" : "#94a3b8") }}>{item.isFreeGood ? "—" : ((item.discountPercent || 0) > 0 ? `${item.discountPercent}%` : "—")}</td>
                  <td style={{ padding: "8px", fontSize: "11px", textAlign: "center", color: item.isFreeGood ? "#a1a1aa" : "#475569" }}>{item.isFreeGood ? "—" : `${item.taxPercent}%`}</td>
                  <td style={{ padding: "8px", fontSize: "11px", textAlign: "right", color: "#475569" }}>{displayMRP > 0 ? `₹${displayMRP.toFixed(2)}` : "—"}</td>
                  <td style={{ padding: "8px", fontSize: "11px", textAlign: "right", color: "#475569" }}>{item.expiryDate ? format(new Date(item.expiryDate), "MMM yy") : "—"}</td>
                  <td style={{ padding: "8px", fontSize: "11px", textAlign: "right", fontWeight: 700, color: item.isFreeGood ? "#7c3aed" : "#1e293b" }}>{item.isFreeGood ? "FREE" : `₹${item.totalAmount?.toFixed(2)}`}</td>
                </tr>
              )})}
            </tbody>
          </table>

          {/* Totals */}
          <div style={{ float: "right", width: "260px", marginTop: "16px" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <tbody>
                <tr>
                  <td style={{ padding: "5px 8px", fontSize: "12px", color: "#64748b" }}>Subtotal</td>
                  <td style={{ padding: "5px 8px", fontSize: "12px", textAlign: "right", color: "#334155" }}>₹{(invoice.subTotal || 0).toFixed(2)}</td>
                </tr>
                {(invoice.discountAmount || 0) > 0 && (
                  <tr>
                    <td style={{ padding: "5px 8px", fontSize: "12px", color: "#64748b" }}>Discount</td>
                    <td style={{ padding: "5px 8px", fontSize: "12px", textAlign: "right", color: "#059669" }}>-₹{(invoice.discountAmount || 0).toFixed(2)}</td>
                  </tr>
                )}
                <tr>
                  <td style={{ padding: "5px 8px", fontSize: "12px", color: "#64748b" }}>Tax (GST)</td>
                  <td style={{ padding: "5px 8px", fontSize: "12px", textAlign: "right", color: "#334155" }}>₹{(invoice.taxTotal || 0).toFixed(2)}</td>
                </tr>
                <tr style={{ borderTop: "2px solid #1e293b" }}>
                  <td style={{ padding: "10px 8px", fontSize: "14px", fontWeight: 800, color: "#1e293b" }}>Grand Total</td>
                  <td style={{ padding: "10px 8px", fontSize: "14px", fontWeight: 800, textAlign: "right", color: "#1e293b" }}>₹{(invoice.grandTotal || 0).toFixed(2)}</td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Payment Summary */}
          <div style={{ clear: "both", marginTop: "24px", paddingTop: "16px", borderTop: "1px dashed #cbd5e1" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <tbody>
                <tr>
                  <td style={{ padding: "4px 8px", fontSize: "12px", color: "#64748b" }}>Amount Paid</td>
                  <td style={{ padding: "4px 8px", fontSize: "12px", textAlign: "right", color: "#059669", fontWeight: 700 }}>₹{(invoice.amountPaid || 0).toFixed(2)}</td>
                </tr>
                {returnsTotal > 0 && (
                  <tr>
                    <td style={{ padding: "4px 8px", fontSize: "12px", color: "#64748b" }}>Returns Credited</td>
                    <td style={{ padding: "4px 8px", fontSize: "12px", textAlign: "right", color: "#dc2626", fontWeight: 700 }}>-₹{returnsTotal.toFixed(2)}</td>
                  </tr>
                )}
                <tr>
                  <td style={{ padding: "4px 8px", fontSize: "13px", fontWeight: 800, color: "#1e293b" }}>Balance Due</td>
                  <td style={{ padding: "4px 8px", fontSize: "13px", textAlign: "right", color: balanceDue > 0.01 ? "#dc2626" : "#059669", fontWeight: 800 }}>
                    ₹{Math.max(balanceDue, 0).toFixed(2)}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* ── Payments & Returns History (Screen only) ── */}
      {invoice.supplierPayments && invoice.supplierPayments.length > 0 && (
        <div className={`p-6 rounded-2xl ${neo.card} ${neo.shadow} space-y-4`}>
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-bold text-slate-800 text-base">Payment History</h3>
              <p className="text-xs text-slate-500">Payments recorded against this invoice</p>
            </div>
            <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-700">
              {invoice.supplierPayments.length} payment{invoice.supplierPayments.length > 1 ? "s" : ""}
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-slate-400 text-xs text-left">
                  <th className="pb-2 font-semibold">Date</th>
                  <th className="pb-2 font-semibold">Method</th>
                  <th className="pb-2 font-semibold">Account</th>
                  <th className="pb-2 font-semibold">Reference / UTR</th>
                  <th className="pb-2 font-semibold">Notes</th>
                  <th className="pb-2 font-semibold text-right">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {invoice.supplierPayments.map((p: any) => (
                  <tr key={p.id} className="text-slate-700">
                    <td className="py-2.5 font-medium">{new Date(p.date).toLocaleDateString("en-IN")}</td>
                    <td className="py-2.5">
                      <span className="px-2 py-0.5 rounded text-xs font-medium bg-slate-100 text-slate-700">
                        {p.paymentMethod}
                      </span>
                    </td>
                    <td className="py-2.5 text-slate-600">{p.account?.name || "-"}</td>
                    <td className="py-2.5 font-mono text-xs text-slate-500">{p.referenceNo || "-"}</td>
                    <td className="py-2.5 text-slate-500 text-xs">{p.notes || "-"}</td>
                    <td className="py-2.5 text-right font-bold text-emerald-600">
                      ₹{p.amount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {invoice.purchaseReturns && invoice.purchaseReturns.length > 0 && (
        <div className={`p-6 rounded-2xl ${neo.card} ${neo.shadow} space-y-4`}>
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-bold text-slate-800 text-base">Purchase Returns</h3>
              <p className="text-xs text-slate-500">Items returned against this invoice</p>
            </div>
            <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-rose-100 text-rose-700">
              Total: ₹{returnsTotal.toFixed(2)}
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-slate-400 text-xs text-left">
                  <th className="pb-2 font-semibold">Date</th>
                  <th className="pb-2 font-semibold">Return #</th>
                  <th className="pb-2 font-semibold">Reason</th>
                  <th className="pb-2 font-semibold text-right">Total Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {invoice.purchaseReturns.map((r: any) => (
                  <tr key={r.id} className="text-slate-700">
                    <td className="py-2.5 font-medium">{new Date(r.date).toLocaleDateString("en-IN")}</td>
                    <td className="py-2.5 font-semibold text-indigo-600">{r.returnNumber}</td>
                    <td className="py-2.5 text-slate-500 text-xs">{r.reason || "-"}</td>
                    <td className="py-2.5 text-right font-bold text-rose-600">
                      ₹{r.totalAmount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── Payment Dialog ── */}
      {showPayment && (
        <RecordPaymentDialog
          invoice={invoice}
          open={showPayment}
          onClose={() => setShowPayment(false)}
          onSuccess={() => { setShowPayment(false); router.refresh() }}
        />
      )}
    </>
  )
}
