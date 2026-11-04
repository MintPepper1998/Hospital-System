"use client"

import { PrintTemplateSettingsData } from "@/lib/print-template-types"
import { HospitalSettingsData } from "@/app/actions/settings"
import { Building2, CheckCircle2 } from "lucide-react"

export function LiveMedicineBillPreview({ 
  settings, 
  hospitalSettings 
}: { 
  settings: PrintTemplateSettingsData
  hospitalSettings: HospitalSettingsData 
}) {
  const isPortrait = (settings.orientation || "Portrait") === "Portrait"
  const themeColor = settings.themeColor || "#0066CC"

  const headerSizeClass =
    (settings.companyNameSize || "Large") === "Small" ? "text-lg" :
    (settings.companyNameSize || "Large") === "Large" ? "text-3xl" : "text-xl"

  const formatAmt = (amt: number) => {
    let str = settings.printAmountGrouped ? amt.toLocaleString("en-IN") : amt.toString()
    if (settings.showAmountDecimal) {
      if (!str.includes('.')) str += ".00"
    } else {
      str = str.split('.')[0]
    }
    return str
  }

  const medicines = [
    { name: "Tab. DOLO 650mg", batch: "DL24A012", expiry: "Mar 2026", mrp: 35.50, qty: 10, rate: 32.00, amount: 320.00 },
    { name: "Tab. CETIRIZINE 10mg", batch: "CT24B045", expiry: "Jul 2026", mrp: 18.00, qty: 5, rate: 16.50, amount: 82.50 },
    { name: "Syr. ASCORIL-LS 100ml", batch: "AS24C078", expiry: "Dec 2025", mrp: 142.00, qty: 1, rate: 135.00, amount: 135.00 },
    { name: "Tab. PANTOP 40mg", batch: "PT24D091", expiry: "Aug 2026", mrp: 125.00, qty: 10, rate: 110.00, amount: 1100.00 },
    { name: "Cap. VITAMIN D3 60K", batch: "VD24E034", expiry: "Jan 2027", mrp: 45.00, qty: 4, rate: 42.00, amount: 168.00 },
  ]
  const totalAmount = medicines.reduce((acc, m) => acc + m.amount, 0)
  const gstAmount = totalAmount * 0.05

  return (
    <div className={`bg-white shadow-2xl overflow-y-auto flex flex-col transition-all duration-300 ${isPortrait ? 'w-[210mm]' : 'w-[297mm]'}`}>
      {/* Preview Banner */}
      <div className="bg-gray-800 text-white text-xs py-1 px-4 text-center tracking-widest font-mono flex items-center justify-center gap-2">
        <CheckCircle2 className="h-3 w-3 text-green-400" />
        MEDICINE BILL PREVIEW ({settings.paperSize || "A4"} {settings.orientation || "Portrait"})
      </div>

      <div className="p-8 pb-12 text-[10px] flex-1 flex flex-col mx-auto w-full max-w-5xl">
        
        {/* HEADER */}
        {settings.printHeaderRepeat && (
          <div className="flex justify-between items-center border-[1.5px] border-gray-400 mb-4 p-2 py-2">
            <div className="flex gap-4 items-center pl-2">
              {hospitalSettings.logoUrl ? (
                <img src={hospitalSettings.logoUrl} alt="Logo" className="max-w-[120px] max-h-[70px] object-contain" />
              ) : (
                <div className="w-16 h-16 bg-gray-200 flex items-center justify-center" style={{ backgroundColor: `${themeColor}20` }}>
                  <Building2 style={{ color: themeColor }} className="h-10 w-10" />
                </div>
              )}
            </div>
            <div className="text-center flex-1">
              <h1 className={`${headerSizeClass} font-bold tracking-wide uppercase`} style={{ color: themeColor }}>
                {hospitalSettings.name}
              </h1>
              <p className="text-[10px] font-medium text-gray-700">PHARMACY DIVISION</p>
              <p className="text-gray-600 mt-0.5 leading-tight text-[9px]">{hospitalSettings.address}</p>
              {hospitalSettings.gstNo && <p className="text-gray-500 font-medium mt-0.5 text-[9px]">GSTIN: {hospitalSettings.gstNo}</p>}
            </div>
            <div className="w-36">
              <div className="font-bold px-2 py-1 text-center text-[10px] w-full border-[1.5px] border-black text-white" style={{ backgroundColor: themeColor }}>
                MEDICINE BILL
              </div>
            </div>
          </div>
        )}

        <div className="text-center font-bold text-sm mb-3 uppercase">PHARMACY BILL / TAX INVOICE</div>

        {/* PATIENT + BILL INFO */}
        <div className="border-[1.5px] border-gray-400 grid grid-cols-2 text-[11px] mb-4">
          <div className="p-3 border-r-[1.5px] border-gray-400 flex flex-col gap-1.5">
            <p className="font-bold text-xs border-b border-gray-300 pb-1">PATIENT / CUSTOMER</p>
            <p className="font-bold text-sm">Subham Biswal</p>
            <p>Mobile: +91 9777929827</p>
            <p className="text-gray-600">UHID: PID-002341</p>
            <p className="text-gray-600 mt-1">Dr. Rajesh Sharma (Referral)</p>
          </div>
          <div className="p-3 flex flex-col gap-1.5">
            <div className="grid grid-cols-[90px_1fr]"><span className="text-gray-600">Bill No. :</span> <span className="font-bold">PHR-2025-04521</span></div>
            <div className="grid grid-cols-[90px_1fr]"><span className="text-gray-600">Bill Date :</span> <span className="font-bold">23-Jun-2025 11:45 AM</span></div>
            <div className="grid grid-cols-[90px_1fr]"><span className="text-gray-600">Payment :</span> <span className="font-bold text-green-700">PAID (UPI)</span></div>
            <div className="grid grid-cols-[90px_1fr]"><span className="text-gray-600">DL No. :</span> <span className="font-bold">20B-OR-2024-001234</span></div>
          </div>
        </div>

        {/* MEDICINE TABLE */}
        <table className="w-full border-collapse text-[10px] mb-4">
          <thead>
            <tr className="border-t-2 border-b-2 border-black border-dashed text-[10px] font-bold text-gray-800">
              <th className="text-left py-1.5 w-[5%]">#</th>
              <th className="text-left py-1.5 w-[30%]">Medicine Name</th>
              {settings.showBatchNumber && <th className="text-center py-1.5 w-[12%]">Batch</th>}
              {settings.showExpiryDate && <th className="text-center py-1.5 w-[10%]">Expiry</th>}
              {settings.showMRP && <th className="text-right py-1.5 w-[10%]">MRP</th>}
              <th className="text-center py-1.5 w-[7%]">Qty</th>
              <th className="text-right py-1.5 w-[10%]">Rate</th>
              <th className="text-right py-1.5 w-[12%]">Amount</th>
            </tr>
          </thead>
          <tbody>
            {medicines.map((med, idx) => (
              <tr key={idx} className="border-b border-gray-200 text-gray-700">
                <td className="py-1.5 text-gray-500">{idx + 1}</td>
                <td className="py-1.5 font-semibold uppercase text-gray-900">{med.name}</td>
                {settings.showBatchNumber && <td className="py-1.5 text-center font-mono text-[9px]">{med.batch}</td>}
                {settings.showExpiryDate && <td className="py-1.5 text-center text-[9px]">{med.expiry}</td>}
                {settings.showMRP && <td className="py-1.5 text-right text-gray-500">{formatAmt(med.mrp)}</td>}
                <td className="py-1.5 text-center font-semibold">{med.qty}</td>
                <td className="py-1.5 text-right">{formatAmt(med.rate)}</td>
                <td className="py-1.5 text-right font-bold">{formatAmt(med.amount)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* TOTALS */}
        <div className="mt-2 mb-4 border-t border-black border-dashed pt-3 flex flex-col gap-1 items-end text-[11px]">
          <div className="grid grid-cols-[140px_100px]">
            <div className="text-right font-bold pr-4">Sub Total</div>
            <div className="text-right">{formatAmt(totalAmount)}</div>
          </div>
          {settings.showTaxDetails && (
            <div className="grid grid-cols-[140px_100px]">
              <div className="text-right font-bold pr-4">GST (5%)</div>
              <div className="text-right">{formatAmt(gstAmount)}</div>
            </div>
          )}
          {settings.showDiscountDetails && (
            <div className="grid grid-cols-[140px_100px]">
              <div className="text-right font-bold pr-4">Discount</div>
              <div className="text-right">-{formatAmt(50)}</div>
            </div>
          )}
          <div className="grid grid-cols-[140px_100px] mt-1">
            <div className="text-right font-bold pr-4">Net Amount</div>
            <div className="text-right font-bold border-b-2 border-black border-dashed pb-1">
              {formatAmt(totalAmount + gstAmount - 50)}
            </div>
          </div>
        </div>

        {/* AMOUNT IN WORDS */}
        {settings.amountInWords !== "None" && (
          <div className="text-[10.5px] mb-4">
            <p className="font-bold">In Words :</p>
            <p>One Thousand Eight Hundred Fifty Five Rupees and Fifty Paise Only</p>
          </div>
        )}

        {/* FOOTER */}
        <div className="mt-auto space-y-2 text-[10px] text-gray-600">
          <p>This is a computer generated bill. Returns accepted within 7 days with original bill.</p>
          {settings.showTermsAndConditions && settings.termsText && <p>{settings.termsText}</p>}
        </div>

        {/* SIGNATURES */}
        <div className="mt-8 flex justify-between items-end">
          <div className="text-[10px] text-gray-500">
            <p>Patient/Customer Signature</p>
          </div>
          {settings.showPharmacistSign && (
            <div className="text-center">
              <div className="border-t border-gray-800 w-44 pt-1">
                <p className="font-semibold text-gray-700 text-[11px]">Pharmacist</p>
                <p className="text-[9px] text-gray-500">B.Pharm / D.Pharm</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
