"use client"

import { useState } from "react"
import { format } from "date-fns"
import { Printer, X, FileText } from "lucide-react"
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
import type { HospitalSettingsData } from "@/app/actions/settings"

export interface DuesBillItem {
  index: number
  id: string
  billId?: string
  billNumber: string
  billDate: Date | string
  totalAmount: number
  paidAmount: number
  balanceAmount: number
  ageDays: number
  status: string
  notes?: string | null
}

export interface PatientDuesData {
  patientInfo: {
    name: string
    phone?: string | null
    uhid?: string | null
    address?: string | null
  }
  items: DuesBillItem[]
  totals: {
    totalInvoiced: number
    totalPaid: number
    totalDue: number
    count: number
  }
  generatedAt?: string
}

interface PatientDuesBillModalProps {
  isOpen: boolean
  onClose: () => void
  duesData: PatientDuesData | null
  hospitalSettings?: HospitalSettingsData | null
}

export function PatientDuesBillModal({
  isOpen,
  onClose,
  duesData,
  hospitalSettings,
}: PatientDuesBillModalProps) {
  const [isPrinting, setIsPrinting] = useState(false)

  if (!duesData) return null

  const { patientInfo, items, totals } = duesData

  const hospitalName = hospitalSettings?.name || "SHREE KAMAL HOSPITAL"
  const hospitalAddress = hospitalSettings?.address || "At/PO - Jagatpur, Cuttack, Odisha - 754021"
  const hospitalPhone = hospitalSettings?.phone || "+91 671 230 1234"
  const hospitalEmail = hospitalSettings?.email || "info@shreekamal.com"
  const hospitalGst = hospitalSettings?.gstNo || ""
  const hospitalLogo = hospitalSettings?.logoUrl || ""

  const statementDate = duesData.generatedAt ? new Date(duesData.generatedAt) : new Date()
  const statementNumber = `PHARM-DUE-${format(statementDate, "yyyyMMdd")}-${patientInfo.name.replace(/[^a-zA-Z0-9]/g, "").slice(0, 5).toUpperCase()}`

  const amountInWords = numberToWordsRupees(totals.totalDue)

  const handlePrint = () => {
    setIsPrinting(true)

    // Build standalone HTML for the printed bill
    const printContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Pharmacy Dues Bill - ${patientInfo.name}</title>
  <style>
    @page {
      size: A4 portrait;
      margin: 10mm 12mm;
    }
    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      color: #0f172a;
      background: #fff;
      font-size: 11px;
      line-height: 1.4;
      padding: 10px;
    }
    .bill-wrapper {
      width: 100%;
      max-width: 800px;
      margin: 0 auto;
      border: 1.5px solid #0f172a;
      padding: 16px 20px;
    }
    .header-table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 12px;
      border-bottom: 2px solid #0f172a;
      padding-bottom: 10px;
    }
    .logo-cell {
      width: 100px;
      vertical-align: middle;
      text-align: left;
    }
    .logo-img {
      max-width: 95px;
      max-height: 70px;
      object-fit: contain;
    }
    .logo-placeholder {
      width: 65px;
      height: 65px;
      border: 1.5px solid #0f172a;
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: bold;
      font-size: 10px;
      text-align: center;
    }
    .header-info-cell {
      vertical-align: middle;
      text-align: center;
      padding: 0 10px;
    }
    .hosp-name {
      font-size: 18px;
      font-weight: 800;
      letter-spacing: 0.5px;
      text-transform: uppercase;
      color: #0f172a;
      margin-bottom: 2px;
    }
    .pharm-dept {
      font-size: 12px;
      font-weight: 700;
      color: #1e3a8a;
      letter-spacing: 1px;
      text-transform: uppercase;
      margin-bottom: 3px;
    }
    .hosp-meta {
      font-size: 10px;
      color: #334155;
      line-height: 1.3;
    }
    .title-banner {
      background: #0f172a;
      color: #ffffff;
      padding: 6px 12px;
      text-align: center;
      font-size: 12px;
      font-weight: 800;
      letter-spacing: 0.5px;
      text-transform: uppercase;
      margin-bottom: 12px;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .info-grid {
      width: 100%;
      border: 1px solid #cbd5e1;
      border-collapse: collapse;
      margin-bottom: 14px;
      background: #fafafa;
    }
    .info-grid td {
      padding: 6px 10px;
      vertical-align: top;
      font-size: 10.5px;
      border-right: 1px solid #e2e8f0;
      border-bottom: 1px solid #e2e8f0;
    }
    .info-label {
      color: #64748b;
      font-size: 9.5px;
      text-transform: uppercase;
      font-weight: 600;
      margin-bottom: 2px;
    }
    .info-val {
      font-weight: 700;
      color: #0f172a;
    }
    .table-container {
      width: 100%;
      margin-bottom: 14px;
    }
    .dues-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 10.5px;
    }
    .dues-table th {
      background: #0f172a;
      color: #ffffff;
      padding: 6px 8px;
      text-align: left;
      font-weight: 700;
      text-transform: uppercase;
      font-size: 9.5px;
      letter-spacing: 0.3px;
      border: 1px solid #0f172a;
    }
    .dues-table th.text-right,
    .dues-table td.text-right {
      text-align: right;
    }
    .dues-table th.text-center,
    .dues-table td.text-center {
      text-align: center;
    }
    .dues-table td {
      padding: 5.5px 8px;
      border: 1px solid #cbd5e1;
      color: #1e293b;
    }
    .dues-table tr:nth-child(even) td {
      background: #f8fafc;
    }
    .dues-table tr.total-row td {
      background: #f1f5f9;
      font-weight: 800;
      border-top: 2px solid #0f172a;
      border-bottom: 2px solid #0f172a;
    }
    .total-due-cell {
      font-size: 13px;
      font-weight: 900;
      color: #b91c1c !important;
    }
    .words-box {
      border: 1px dashed #64748b;
      background: #f8fafc;
      padding: 7px 10px;
      margin-bottom: 14px;
      font-size: 10px;
    }
    .words-title {
      font-weight: 700;
      color: #475569;
      text-transform: uppercase;
      font-size: 9px;
      margin-bottom: 2px;
    }
    .words-content {
      font-weight: 700;
      color: #0f172a;
      font-style: italic;
    }
    .notice-box {
      font-size: 9px;
      color: #475569;
      line-height: 1.4;
      margin-bottom: 25px;
      padding: 6px 8px;
      background: #fffbeb;
      border-left: 3px solid #d97706;
    }
    .signatures-row {
      display: flex;
      justify-content: space-between;
      margin-top: 35px;
      padding-top: 8px;
    }
    .sig-box {
      text-align: center;
      width: 28%;
      border-top: 1px solid #0f172a;
      padding-top: 5px;
      font-size: 9.5px;
      font-weight: 700;
      color: #1e293b;
    }
    @media print {
      body {
        padding: 0;
      }
      .bill-wrapper {
        border: none;
        padding: 0;
      }
    }
  </style>
</head>
<body>
  <div class="bill-wrapper">
    <!-- Hospital & Pharmacy Header -->
    <table class="header-table">
      <tr>
        <td class="logo-cell">
          ${
            hospitalLogo
              ? `<img src="${hospitalLogo}" alt="Hospital Logo" class="logo-img" />`
              : `<div class="logo-placeholder">SHREE<br/>KAMAL</div>`
          }
        </td>
        <td class="header-info-cell">
          <div class="hosp-name">${hospitalName}</div>
          <div class="pharm-dept">PHARMACY DEPARTMENT / DISPENSARY</div>
          <div class="hosp-meta">${hospitalAddress}</div>
          <div class="hosp-meta">
            <span>Tel: ${hospitalPhone}</span>
            ${hospitalEmail ? ` | <span>Email: ${hospitalEmail}</span>` : ""}
            ${hospitalGst ? ` | <span>GSTIN: <strong>${hospitalGst}</strong></span>` : ""}
          </div>
        </td>
      </tr>
    </table>

    <!-- Banner -->
    <div class="title-banner">
      <span>CONSOLIDATED PHARMACY PENDING DUES BILL</span>
      <span>${items.length} UNPAID BILL(S)</span>
    </div>

    <!-- Patient & Statement Meta -->
    <table class="info-grid">
      <tr>
        <td style="width: 50%;">
          <div class="info-label">Patient / Customer Name</div>
          <div class="info-val" style="font-size: 13px;">${patientInfo.name}</div>
        </td>
        <td style="width: 25%;">
          <div class="info-label">Statement Ref No</div>
          <div class="info-val" style="font-family: monospace;">${statementNumber}</div>
        </td>
        <td style="width: 25%;">
          <div class="info-label">Statement Date & Time</div>
          <div class="info-val">${format(statementDate, "dd-MMM-yyyy hh:mm a")}</div>
        </td>
      </tr>
      <tr>
        <td>
          <div class="info-label">Contact Phone / UHID</div>
          <div class="info-val">
            ${patientInfo.phone || "N/A"} 
            ${patientInfo.uhid ? ` &bull; UHID: ${patientInfo.uhid}` : ""}
          </div>
        </td>
        <td colspan="2">
          <div class="info-label">Patient Address / Notes</div>
          <div class="info-val" style="font-weight: normal; color: #475569;">
            ${patientInfo.address || "Counter Credit Account (In-House Pharmacy)"}
          </div>
        </td>
      </tr>
    </table>

    <!-- Itemized Dues Table -->
    <div class="table-container">
      <table class="dues-table">
        <thead>
          <tr>
            <th class="text-center" style="width: 32px;">#</th>
            <th>Bill Number</th>
            <th>Bill Date</th>
            <th class="text-center">Age (Days)</th>
            <th class="text-right">Total Invoiced (₹)</th>
            <th class="text-right">Amount Paid (₹)</th>
            <th class="text-right">Pending Balance (₹)</th>
          </tr>
        </thead>
        <tbody>
          ${items
            .map(
              (item) => `
            <tr>
              <td class="text-center font-bold">${item.index}</td>
              <td style="font-family: monospace; font-weight: 700;">${item.billNumber}</td>
              <td>${format(new Date(item.billDate), "dd-MMM-yyyy")}</td>
              <td class="text-center">${item.ageDays} d</td>
              <td class="text-right">${item.totalAmount.toFixed(2)}</td>
              <td class="text-right">${item.paidAmount.toFixed(2)}</td>
              <td class="text-right font-bold" style="color: #991b1b;">₹${item.balanceAmount.toFixed(2)}</td>
            </tr>
          `
            )
            .join("")}

          <!-- Totals Row -->
          <tr class="total-row">
            <td colspan="4" class="text-right font-bold" style="letter-spacing: 0.5px;">GRAND TOTAL OUTSTANDING:</td>
            <td class="text-right font-bold">₹${totals.totalInvoiced.toFixed(2)}</td>
            <td class="text-right font-bold">₹${totals.totalPaid.toFixed(2)}</td>
            <td class="text-right total-due-cell">₹${totals.totalDue.toFixed(2)}</td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Amount in Words -->
    <div class="words-box">
      <div class="words-title">Total Outstanding Balance in Words:</div>
      <div class="words-content">${amountInWords}</div>
    </div>

    <!-- Notice -->
    <div class="notice-box">
      <strong>Notice:</strong> This is a consolidated statement of all pending pharmacy credit dues recorded against the above patient/customer. Kindly settle the outstanding balance at the Pharmacy Billing Counter. For any queries, contact the Billing Desk.
    </div>

    <!-- Signatures -->
    <div class="signatures-row">
      <div class="sig-box">Pharmacist / Prepared By</div>
      <div class="sig-box">Authorized Billing Signatory</div>
      <div class="sig-box">Patient / Customer Signature</div>
    </div>
  </div>
</body>
</html>
`

    // Create an invisible iframe for printing
    const iframe = document.createElement("iframe")
    iframe.style.position = "fixed"
    iframe.style.right = "0"
    iframe.style.bottom = "0"
    iframe.style.width = "0"
    iframe.style.height = "0"
    iframe.style.border = "0"
    document.body.appendChild(iframe)

    const doc = iframe.contentWindow?.document
    if (!doc) {
      setIsPrinting(false)
      return
    }

    doc.open()
    doc.write(printContent)
    doc.close()

    // Wait for content (and images) to load, then trigger print
    iframe.onload = () => {
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
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      {/* 
        Key fix: Explicit sm:max-w-4xl lg:max-w-5xl overrides default sm:max-w-lg (512px) 
        and showCloseButton={false} prevents absolute close button from colliding with header controls 
      */}
      <DialogContent
        showCloseButton={false}
        className="w-[96vw] max-w-5xl sm:max-w-4xl lg:max-w-5xl max-h-[92vh] overflow-hidden p-0 rounded-2xl border border-border shadow-2xl flex flex-col bg-background"
      >
        {/* Modal Header */}
        <div className="border-b border-border bg-card/95 px-6 py-3.5 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="p-2 rounded-xl bg-blue-50 text-blue-700 border border-blue-200 shrink-0">
              <FileText className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <DialogTitle className="text-base font-bold text-foreground truncate">
                Consolidated Pharmacy Dues Bill
              </DialogTitle>
              <p className="text-xs text-muted-foreground truncate">
                Statement of all pending credit dues for{" "}
                <span className="font-semibold text-foreground">{patientInfo.name}</span>
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Button
              variant="outline"
              size="sm"
              onClick={onClose}
              className="h-8 text-xs text-muted-foreground hover:text-foreground"
            >
              <X className="h-3.5 w-3.5 mr-1" />
              Close
            </Button>
            <Button
              size="sm"
              onClick={handlePrint}
              disabled={isPrinting}
              className="gap-1.5 h-8 text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white shadow-xs"
            >
              <Printer className="h-3.5 w-3.5" />
              {isPrinting ? "Opening Print..." : "Print Bill"}
            </Button>
          </div>
        </div>

        {/* Live Bill Preview (Scrollable container with spacious paper preview) */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 bg-slate-100/80 flex justify-center">
          <div className="w-full max-w-4xl bg-white border border-slate-300 shadow-md rounded-xl p-6 sm:p-8 text-slate-800 text-xs">
            {/* Header: Hospital Logo & Details */}
            <div className="flex items-center justify-between pb-5 border-b-2 border-slate-900 gap-4">
              <div className="w-28 shrink-0 flex items-center justify-center">
                {hospitalLogo ? (
                  <img
                    src={hospitalLogo}
                    alt="Hospital Logo"
                    className="max-h-20 max-w-full object-contain"
                  />
                ) : (
                  <div className="h-16 w-16 rounded-lg bg-slate-100 border-2 border-slate-400 flex items-center justify-center text-slate-700 font-extrabold text-xs text-center leading-tight">
                    SHREE<br />KAMAL
                  </div>
                )}
              </div>
              <div className="text-center flex-1 space-y-1">
                <h2 className="text-xl font-extrabold uppercase tracking-wide text-slate-900">
                  {hospitalName}
                </h2>
                <p className="text-xs font-bold text-blue-900 uppercase tracking-widest">
                  PHARMACY DEPARTMENT / DISPENSARY
                </p>
                <p className="text-xs text-slate-600 leading-tight">{hospitalAddress}</p>
                <div className="text-[11px] text-slate-500 flex flex-wrap justify-center gap-3 pt-0.5">
                  <span>Tel: <strong>{hospitalPhone}</strong></span>
                  {hospitalEmail && <span>| Email: <strong>{hospitalEmail}</strong></span>}
                  {hospitalGst && <span>| GSTIN: <strong>{hospitalGst}</strong></span>}
                </div>
              </div>
              {/* Symmetrical placeholder for clean balance */}
              <div className="w-28 shrink-0 hidden sm:block text-right">
                <div className="text-[10px] uppercase font-bold text-slate-400">Date</div>
                <div className="text-xs font-semibold text-slate-800">
                  {format(statementDate, "dd-MMM-yyyy")}
                </div>
              </div>
            </div>

            {/* Document Title Strip */}
            <div className="bg-slate-900 text-white px-4 py-2 rounded-lg my-4 flex items-center justify-between shadow-xs">
              <span className="font-extrabold text-xs uppercase tracking-wider">
                Consolidated Pharmacy Pending Dues Bill
              </span>
              <span className="text-rose-100 bg-rose-600 font-bold px-2.5 py-0.5 rounded-full text-[11px] uppercase tracking-wide">
                {items.length} Unpaid Bill{items.length === 1 ? "" : "s"}
              </span>
            </div>

            {/* Patient & Statement Info Box */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 border border-slate-200 rounded-lg p-4 bg-slate-50/80 mb-5 text-xs">
              <div className="space-y-1">
                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  Patient / Customer Name
                </div>
                <div className="font-extrabold text-slate-900 text-sm">{patientInfo.name}</div>
                <div className="text-slate-600 text-xs flex flex-wrap items-center gap-3 pt-0.5">
                  <span>Phone: <strong className="text-slate-800">{patientInfo.phone || "N/A"}</strong></span>
                  {patientInfo.uhid && (
                    <span>UHID: <strong className="font-mono text-slate-800">{patientInfo.uhid}</strong></span>
                  )}
                </div>
                {patientInfo.address && (
                  <div className="text-slate-500 text-[11px]">
                    Address: {patientInfo.address}
                  </div>
                )}
              </div>
              <div className="space-y-1 md:text-right border-t md:border-t-0 pt-2 md:pt-0 border-slate-200">
                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  Statement Reference & Timestamp
                </div>
                <div className="font-mono font-bold text-slate-800 text-xs">
                  {statementNumber}
                </div>
                <div className="text-slate-600 text-xs">
                  Date: <strong className="text-slate-800">{format(statementDate, "dd-MMM-yyyy, hh:mm a")}</strong>
                </div>
                <div className="text-xs pt-0.5">
                  Status: <span className="font-bold text-rose-600 uppercase">UNSETTLED / PENDING DUES</span>
                </div>
              </div>
            </div>

            {/* Itemized Pending Bills Table */}
            <div className="border border-slate-300 rounded-lg overflow-x-auto mb-4">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-slate-900 text-white text-[10px] uppercase font-bold tracking-wider">
                  <tr>
                    <th className="py-2.5 px-3 text-center w-10">#</th>
                    <th className="py-2.5 px-3 whitespace-nowrap">Bill No</th>
                    <th className="py-2.5 px-3 whitespace-nowrap">Bill Date</th>
                    <th className="py-2.5 px-2 text-center whitespace-nowrap">Age</th>
                    <th className="py-2.5 px-3 text-right whitespace-nowrap">Invoiced (₹)</th>
                    <th className="py-2.5 px-3 text-right whitespace-nowrap">Paid (₹)</th>
                    <th className="py-2.5 px-3 text-right whitespace-nowrap">Pending Due (₹)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {items.map((item) => (
                    <tr key={item.id} className="hover:bg-slate-50">
                      <td className="py-2.5 px-3 text-center font-bold text-slate-500">
                        {item.index}
                      </td>
                      <td className="py-2.5 px-3 font-mono font-bold text-slate-900 whitespace-nowrap">
                        {item.billNumber}
                      </td>
                      <td className="py-2.5 px-3 text-slate-600 whitespace-nowrap">
                        {format(new Date(item.billDate), "dd MMM yyyy")}
                      </td>
                      <td className="py-2.5 px-2 text-center text-slate-500 whitespace-nowrap">
                        {item.ageDays} d
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono text-slate-700 whitespace-nowrap">
                        ₹{item.totalAmount.toFixed(2)}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono text-slate-500 whitespace-nowrap">
                        ₹{item.paidAmount.toFixed(2)}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono font-bold text-rose-700 whitespace-nowrap">
                        ₹{item.balanceAmount.toFixed(2)}
                      </td>
                    </tr>
                  ))}
                  {/* Grand Totals */}
                  <tr className="bg-slate-100 font-bold border-t-2 border-slate-900">
                    <td colSpan={4} className="py-3 px-3 text-right uppercase tracking-wider text-slate-900 font-extrabold text-xs">
                      Grand Total Outstanding:
                    </td>
                    <td className="py-3 px-3 text-right font-mono text-slate-800 whitespace-nowrap font-bold">
                      ₹{totals.totalInvoiced.toFixed(2)}
                    </td>
                    <td className="py-3 px-3 text-right font-mono text-slate-600 whitespace-nowrap font-bold">
                      ₹{totals.totalPaid.toFixed(2)}
                    </td>
                    <td className="py-3 px-3 text-right font-mono text-sm sm:text-base font-black text-rose-700 whitespace-nowrap">
                      ₹{totals.totalDue.toFixed(2)}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Amount in Words */}
            <div className="bg-slate-50 border border-dashed border-slate-400 p-3 rounded-lg mb-4 text-xs">
              <span className="font-bold text-slate-600 uppercase">Amount in Words: </span>
              <span className="font-bold italic text-slate-900">{amountInWords}</span>
            </div>

            {/* Notice */}
            <div className="bg-amber-50 border-l-4 border-amber-500 p-2.5 text-xs text-amber-900 mb-8 rounded-r">
              <strong>Notice:</strong> This is a consolidated statement of pending credit dues issued by Shree Kamal Hospital Pharmacy. Kindly clear the pending balance at the Pharmacy Billing Counter.
            </div>

            {/* Signature Area */}
            <div className="grid grid-cols-3 gap-6 pt-8 border-t border-slate-300 text-center text-xs font-semibold text-slate-700">
              <div className="border-t border-slate-800 pt-1.5">
                Pharmacist / Prepared By
              </div>
              <div className="border-t border-slate-800 pt-1.5">
                Authorized Billing Signatory
              </div>
              <div className="border-t border-slate-800 pt-1.5">
                Patient / Customer Signature
              </div>
            </div>
          </div>
        </div>

        {/* Footer actions */}
        <DialogFooter className="border-t border-border bg-card px-6 py-3 flex items-center justify-between shrink-0">
          <Button variant="outline" size="sm" onClick={onClose} className="text-xs">
            Close Preview
          </Button>
          <Button
            size="sm"
            onClick={handlePrint}
            disabled={isPrinting}
            className="gap-1.5 text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white"
          >
            <Printer className="h-3.5 w-3.5" />
            {isPrinting ? "Opening Print..." : "Print Bill Now"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
