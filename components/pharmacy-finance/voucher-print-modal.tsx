"use client"

import { useState } from "react"
import { format } from "date-fns"
import { Printer, X, FileText, CheckCircle2 } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { numberToWordsRupees } from "@/lib/number-to-words"

export interface VoucherData {
  id: string
  voucherNumber: string
  type: string
  date: Date | string
  amount: number
  account?: { name: string; type?: string } | null
  contraAccount?: { name: string; type?: string } | null
  partyName?: string | null
  particulars: string
  notes?: string | null
  status?: string
}

export interface HospitalSettingsInfo {
  name?: string | null
  address?: string | null
  phone?: string | null
  email?: string | null
  gstNo?: string | null
  logoUrl?: string | null
}

interface VoucherPrintModalProps {
  isOpen: boolean
  onClose: () => void
  voucher: VoucherData | null
  hospitalSettings?: HospitalSettingsInfo | null
}

export function VoucherPrintModal({
  isOpen,
  onClose,
  voucher,
  hospitalSettings,
}: VoucherPrintModalProps) {
  const [isPrinting, setIsPrinting] = useState(false)

  if (!voucher) return null

  const hospitalName = hospitalSettings?.name || "SHREE KAMAL HOSPITAL"
  const hospitalAddress = hospitalSettings?.address || "At/PO - Jagatpur, Cuttack, Odisha - 754021"
  const hospitalPhone = hospitalSettings?.phone || "+91 671 230 1234"
  const hospitalEmail = hospitalSettings?.email || "info@shreekamal.com"
  const hospitalGst = hospitalSettings?.gstNo || null

  const formattedDate = format(new Date(voucher.date), "dd-MMM-yyyy, hh:mm a")
  const amountWords = numberToWordsRupees(voucher.amount)

  const handlePrint = () => {
    setIsPrinting(true)

    const printableHtml = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Voucher - ${voucher.voucherNumber}</title>
  <style>
    @page {
      size: 80mm auto;
      margin: 4mm;
    }
    @media print {
      body {
        margin: 0;
        padding: 0;
        background: #ffffff;
        width: 80mm;
      }
    }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      width: 74mm;
      max-width: 74mm;
      margin: 0 auto;
      padding: 2mm 1mm;
      font-size: 11px;
      line-height: 1.35;
      color: #0f172a;
      background: #ffffff;
    }
    .text-center { text-align: center; }
    .text-right { text-align: right; }
    .font-bold { font-weight: 700; }
    .header {
      text-align: center;
      padding-bottom: 4px;
      margin-bottom: 5px;
      border-bottom: 2px solid #0f172a;
    }
    .h-name {
      font-size: 14px;
      font-weight: 800;
      color: #1e3a8a;
      letter-spacing: 0.5px;
      text-transform: uppercase;
      margin-bottom: 2px;
    }
    .h-sub {
      font-size: 9px;
      color: #475569;
      font-weight: 600;
    }
    .h-contact {
      font-size: 8.5px;
      color: #64748b;
      margin-top: 1px;
    }
    .doc-badge-container {
      text-align: center;
      margin: 5px 0;
    }
    .doc-badge {
      display: inline-block;
      font-size: 10px;
      font-weight: 700;
      letter-spacing: 1px;
      padding: 2px 10px;
      border: 1px solid #0f172a;
      border-radius: 4px;
      text-transform: uppercase;
    }
    .badge-payment { background: #fee2e2; color: #991b1b; border-color: #f87171; }
    .badge-receipt { background: #dcfce7; color: #166534; border-color: #86efac; }
    .badge-contra { background: #dbeafe; color: #1e40af; border-color: #93c5fd; }
    
    .meta-table {
      width: 100%;
      margin: 5px 0;
      border-collapse: collapse;
      font-size: 9.5px;
    }
    .meta-table td {
      padding: 2px 0;
      vertical-align: top;
    }
    .meta-table .lbl {
      color: #64748b;
      font-weight: 500;
      width: 38%;
    }
    .meta-table .val {
      font-weight: 600;
      color: #0f172a;
      text-align: right;
      width: 62%;
    }
    .dashed-line {
      border-top: 1px dashed #cbd5e1;
      margin: 5px 0;
    }
    .particulars-box {
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 4px;
      padding: 5px;
      margin: 5px 0;
      font-size: 9.5px;
    }
    .particulars-lbl {
      font-size: 8.5px;
      color: #64748b;
      font-weight: 600;
      text-transform: uppercase;
      margin-bottom: 2px;
    }
    .particulars-txt {
      font-weight: 600;
      color: #1e293b;
    }
    .amount-box {
      border: 1.5px solid #0f172a;
      background: #f8fafc;
      border-radius: 4px;
      text-align: center;
      padding: 6px 4px;
      margin: 7px 0;
    }
    .amount-num {
      font-size: 17px;
      font-weight: 800;
      letter-spacing: 0.5px;
      font-family: monospace;
      color: #0f172a;
    }
    .amount-words {
      font-size: 9px;
      color: #334155;
      font-style: italic;
      margin-top: 2px;
    }
    .signatures {
      display: flex;
      justify-content: space-between;
      margin-top: 24px;
      padding-top: 4px;
      font-size: 8px;
    }
    .sig-col {
      text-align: center;
      width: 30%;
      border-top: 1px dotted #94a3b8;
      padding-top: 3px;
      font-weight: 500;
      color: #475569;
    }
    .footer {
      text-align: center;
      font-size: 7.5px;
      color: #94a3b8;
      margin-top: 8px;
    }
  </style>
</head>
<body>
  <div class="header">
    <div class="h-name">${hospitalName}</div>
    <div class="h-sub">PHARMACY DEPARTMENT</div>
    <div class="h-contact">${hospitalAddress}</div>
    <div class="h-contact">Phone: ${hospitalPhone}${hospitalGst ? ` | GSTIN: ${hospitalGst}` : ""}</div>
  </div>

  <div class="doc-badge-container">
    <div class="doc-badge ${
      voucher.type === "PAYMENT"
        ? "badge-payment"
        : voucher.type === "RECEIPT"
        ? "badge-receipt"
        : "badge-contra"
    }">
      ${voucher.type} VOUCHER
    </div>
  </div>

  <table class="meta-table">
    <tr>
      <td class="lbl">Voucher No:</td>
      <td class="val">${voucher.voucherNumber}</td>
    </tr>
    <tr>
      <td class="lbl">Date:</td>
      <td class="val">${formattedDate}</td>
    </tr>
    ${
      voucher.type === "CONTRA"
        ? `
    <tr>
      <td class="lbl">From Account:</td>
      <td class="val">${voucher.account?.name || "N/A"}</td>
    </tr>
    <tr>
      <td class="lbl">To Account:</td>
      <td class="val">${voucher.contraAccount?.name || "N/A"}</td>
    </tr>
    `
        : `
    <tr>
      <td class="lbl">${voucher.type === "PAYMENT" ? "Paid From:" : "Deposited To:"}</td>
      <td class="val">${voucher.account?.name || "N/A"}</td>
    </tr>
    ${
      voucher.partyName
        ? `
    <tr>
      <td class="lbl">${voucher.type === "PAYMENT" ? "Paid To:" : "Received From:"}</td>
      <td class="val">${voucher.partyName}</td>
    </tr>`
        : ""
    }
    `
    }
  </table>

  <div class="particulars-box">
    <div class="particulars-lbl">Particulars / Narration</div>
    <div class="particulars-txt">${voucher.particulars}</div>
    ${voucher.notes ? `<div style="font-size: 8.5px; color: #64748b; margin-top: 3px;">Notes: ${voucher.notes}</div>` : ""}
  </div>

  <div class="amount-box">
    <div class="amount-num">₹${voucher.amount.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
    <div class="amount-words">${amountWords}</div>
  </div>

  <div class="signatures">
    <div class="sig-col">Prepared By</div>
    <div class="sig-col">Checked By</div>
    <div class="sig-col">${voucher.type === "PAYMENT" ? "Receiver's Sign" : "Authorized Sign"}</div>
  </div>

  <div class="footer">
    Computer Generated Voucher • Printed: ${format(new Date(), "dd-MMM-yyyy hh:mm a")}
  </div>
</body>
</html>`

    const iframe = document.createElement("iframe")
    iframe.style.position = "fixed"
    iframe.style.top = "-10000px"
    iframe.style.left = "-10000px"
    iframe.style.width = "400px"
    iframe.style.height = "600px"
    iframe.style.border = "none"
    document.body.appendChild(iframe)

    const doc = iframe.contentWindow?.document
    if (doc) {
      doc.open()
      doc.write(printableHtml)
      doc.close()

      setTimeout(() => {
        try {
          iframe.contentWindow?.focus()
          iframe.contentWindow?.print()
        } catch (e) {
          console.error("Print error:", e)
        } finally {
          setIsPrinting(false)
          setTimeout(() => {
            if (iframe.parentNode) document.body.removeChild(iframe)
          }, 1000)
        }
      }, 350)
    } else {
      setIsPrinting(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent showCloseButton={false} className="sm:max-w-[460px] max-w-[94vw] p-6 bg-white rounded-2xl shadow-2xl border border-zinc-200">
        <DialogHeader className="pb-3 border-b">
          <div className="flex items-center justify-between">
            <DialogTitle className="text-base font-bold text-zinc-900 flex items-center gap-2">
              <FileText className="h-4 w-4 text-blue-600" /> Voucher Preview & Print
            </DialogTitle>
            <Button variant="ghost" size="icon" onClick={onClose} className="h-7 w-7 text-zinc-400 hover:text-zinc-700">
              <X className="h-4 w-4" />
            </Button>
          </div>
        </DialogHeader>

        {/* Voucher Preview Card (matches print slip) */}
        <div className="border border-zinc-200 rounded-xl p-4 bg-zinc-50/50 space-y-3 font-sans text-xs">
          {/* Hospital Header */}
          <div className="text-center pb-2 border-b-2 border-zinc-800">
            <h3 className="font-extrabold text-sm text-blue-900 tracking-wide uppercase">{hospitalName}</h3>
            <p className="text-[10px] text-zinc-500 font-medium">PHARMACY DEPARTMENT</p>
            <p className="text-[10px] text-zinc-500 mt-0.5">{hospitalAddress}</p>
            <p className="text-[9.5px] text-zinc-400">Phone: {hospitalPhone} {hospitalGst ? `| GSTIN: ${hospitalGst}` : ""}</p>
          </div>

          {/* Badge */}
          <div className="text-center py-0.5">
            <Badge
              variant="outline"
              className={`text-[10px] font-bold px-3 py-0.5 uppercase tracking-wider ${
                voucher.type === "PAYMENT"
                  ? "bg-rose-100 text-rose-800 border-rose-300"
                  : voucher.type === "RECEIPT"
                  ? "bg-emerald-100 text-emerald-800 border-emerald-300"
                  : "bg-blue-100 text-blue-800 border-blue-300"
              }`}
            >
              {voucher.type} VOUCHER
            </Badge>
          </div>

          {/* Metadata */}
          <div className="space-y-1.5 text-[11px] pt-1">
            <div className="flex justify-between">
              <span className="text-zinc-500 font-medium">Voucher No:</span>
              <span className="font-bold text-zinc-900 font-mono">{voucher.voucherNumber}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-zinc-500 font-medium">Date:</span>
              <span className="font-semibold text-zinc-800">{formattedDate}</span>
            </div>
            {voucher.type === "CONTRA" ? (
              <>
                <div className="flex justify-between">
                  <span className="text-zinc-500 font-medium">From Account:</span>
                  <span className="font-semibold text-zinc-800">{voucher.account?.name || "N/A"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-500 font-medium">To Account:</span>
                  <span className="font-semibold text-zinc-800">{voucher.contraAccount?.name || "N/A"}</span>
                </div>
              </>
            ) : (
              <>
                <div className="flex justify-between">
                  <span className="text-zinc-500 font-medium">
                    {voucher.type === "PAYMENT" ? "Paid From:" : "Deposited To:"}
                  </span>
                  <span className="font-semibold text-zinc-800">{voucher.account?.name || "N/A"}</span>
                </div>
                {voucher.partyName && (
                  <div className="flex justify-between">
                    <span className="text-zinc-500 font-medium">
                      {voucher.type === "PAYMENT" ? "Paid To:" : "Received From:"}
                    </span>
                    <span className="font-semibold text-zinc-800">{voucher.partyName}</span>
                  </div>
                )}
              </>
            )}
          </div>

          {/* Particulars */}
          <div className="bg-white border border-zinc-200 rounded-lg p-2.5">
            <p className="text-[10px] uppercase font-bold text-zinc-400">Particulars / Narration</p>
            <p className="font-semibold text-zinc-800 mt-0.5 text-[11.5px]">{voucher.particulars}</p>
            {voucher.notes && (
              <p className="text-[10px] text-zinc-500 mt-1 border-t pt-1">Notes: {voucher.notes}</p>
            )}
          </div>

          {/* Amount Box */}
          <div className="border border-zinc-800 bg-zinc-100 rounded-lg p-2.5 text-center">
            <div className="text-lg font-black font-mono text-zinc-900">
              ₹{voucher.amount.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
            <p className="text-[10px] italic text-zinc-600 mt-0.5">{amountWords}</p>
          </div>

          {/* Signatures */}
          <div className="flex justify-between pt-6 text-[9px] text-zinc-500">
            <div className="text-center w-1/3 border-t border-dotted border-zinc-400 pt-1">Prepared By</div>
            <div className="text-center w-1/3 border-t border-dotted border-zinc-400 pt-1">Checked By</div>
            <div className="text-center w-1/3 border-t border-dotted border-zinc-400 pt-1">
              {voucher.type === "PAYMENT" ? "Receiver's Sign" : "Authorized Sign"}
            </div>
          </div>
        </div>

        <DialogFooter className="flex items-center justify-between gap-2 pt-2">
          <Button variant="outline" onClick={onClose} size="sm" className="rounded-xl">
            Close
          </Button>
          <Button
            onClick={handlePrint}
            disabled={isPrinting}
            size="sm"
            className="rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold flex items-center gap-2"
          >
            <Printer className="h-4 w-4" />
            {isPrinting ? "Printing..." : "Print Voucher Slip"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
