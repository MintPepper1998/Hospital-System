"use client"

import { PrintSettingsData } from "@/app/actions/print-settings"
import { HospitalSettingsData } from "@/app/actions/settings"
import { Building2, CheckCircle2 } from "lucide-react"

export function LiveInvoicePreview({ settings, hospitalSettings }: { settings: PrintSettingsData, hospitalSettings: HospitalSettingsData }) {
  // A helper for format based on settings
  const formatAmt = (amt: number) => {
    let str = settings.printAmountGrouped 
      ? amt.toLocaleString("en-IN") // indian scale
      : amt.toString()

    if (settings.showAmountDecimal) {
      if (!str.includes('.')) str += ".00"
    } else {
      str = str.split('.')[0]
    }
    return str
  }

  const isPortrait = settings.orientation === "Portrait"

  const dispName = settings.useCustomCompanyInfo && settings.customName ? settings.customName : hospitalSettings.name
  const dispAddress = settings.useCustomCompanyInfo && settings.customAddress ? settings.customAddress : hospitalSettings.address
  const dispPhone = settings.useCustomCompanyInfo && settings.customPhone ? settings.customPhone : hospitalSettings.phone
  const dispEmail = settings.useCustomCompanyInfo && settings.customEmail ? settings.customEmail : hospitalSettings.email
  const dispGstin = settings.useCustomCompanyInfo ? settings.customGstin : hospitalSettings.gstNo

  const headerSizeClass = 
    settings.companyNameSize === "Small" ? "text-lg" :
    settings.companyNameSize === "Large" ? "text-3xl" : "text-xl"

  const textSizeClass = 
    settings.invoiceTextSize === "Small" ? "text-[8px]" :
    settings.invoiceTextSize === "Large" ? "text-[12px]" : "text-[10px]"

  // Simulated Medical Bill Data
  const services = [
    { name: "ROOM RENT", amount: 4000.00 },
    { name: "PHARMACY", amount: 2765.54 },
    { name: "MEDICAL EQUIPMENT", amount: 1000.00 },
    { name: "CONSULTATIONS", amount: 2400.00 },
    { name: "CONSUMABLES", amount: 2118.00 },
    { name: "INVESTIGATIONS", amount: 2860.00 },
  ]
  const totalAmount = services.reduce((acc, curr) => acc + curr.amount, 0)
  const deposit = 5000.00

  return (
    <div 
      className={`bg-white shadow-2xl overflow-y-auto flex flex-col transition-all duration-300 ${isPortrait ? 'w-[210mm]' : 'w-[297mm]'}`}
      style={{ padding: '0' }}
    >
      {/* Top Banner indicating preview */}
      <div className="bg-gray-800 text-white text-xs py-1 px-4 text-center tracking-widest font-mono flex items-center justify-center gap-2 print:hidden">
        <CheckCircle2 className="h-3 w-3 text-green-400" />
        LIVE PREVIEW ({settings.paperSize} {settings.orientation})
      </div>

      <div className={`p-8 pb-12 ${textSizeClass} flex-1 flex flex-col mx-auto w-full max-w-5xl`}>
        {/* HEADER */}
        {settings.printHeaderRepeat && (
          <div className="flex justify-between items-center border-[1.5px] border-gray-400 mb-4 p-2 py-2">
            <div className="flex gap-4 items-center pl-2">
              {hospitalSettings.logoUrl ? (
                <img src={hospitalSettings.logoUrl} alt="Logo" className="max-w-[120px] max-h-[70px] object-contain" />
              ) : (
                <div 
                  className="w-16 h-16 bg-gray-200 flex items-center justify-center"
                  style={{ backgroundColor: `${settings.themeColor}20` }}
                >
                  <Building2 style={{ color: settings.themeColor }} className="h-10 w-10" />
                </div>
              )}
            </div>
            
            <div className="text-center flex-1">
              <h1 className={`${headerSizeClass} font-bold tracking-wide uppercase`} style={{ color: settings.themeColor }}>
                {dispName}
              </h1>
              <p className="text-gray-700 mt-1 leading-tight font-medium">
                {dispAddress}
              </p>
              <div className="flex items-center justify-center gap-2 mt-1 text-gray-700">
                {dispPhone && <span>Tel.: {dispPhone}</span>}
                {dispEmail && <span>| Email: {dispEmail}</span>}
              </div>
              {dispGstin && <p className="text-gray-500 font-medium mt-0.5">GSTIN: {dispGstin}</p>}
              {settings.showQualityAccreditations && settings.accreditationText && (
                <p className="text-[10px] font-bold text-green-700 mt-1">✓ {settings.accreditationText}</p>
              )}
            </div>

            <div className="w-40 flex justify-end">
               {settings.showEmergencyBanner ? (
                 <div className="bg-red-600 text-white font-bold px-2 py-1 text-center text-[10px] mr-2 w-full border-[1.5px] border-black">
                    {settings.emergencyContactText}
                 </div>
               ) : (
                 <div className="bg-blue-600 text-white font-bold px-2 py-1 text-center text-sm mr-2 w-full border-[1.5px] border-black">
                    INPATIENT BILL
                 </div>
               )}
            </div>
          </div>
        )}

        <div className="text-center font-bold text-sm mb-2 uppercase">
          INPATIENT BILL
        </div>

        {/* PATIENT DETAILS GRID */}
        <div className="border-[1.5px] border-gray-400 text-gray-800 grid grid-cols-2 text-[11px] mb-4">
          <div className="p-3 border-r-[1.5px] border-gray-400 flex flex-col gap-2">
            <p className="font-bold border-b border-gray-300 pb-1 mb-1 text-xs">PATIENT DETAILS</p>
            <p className="font-bold text-sm">Saravana kumar V</p>
            <p>A2 Nagesan nagar</p>
            <p>Vadalur</p>
            <p>Cuddalore taluk</p>
            <p>TamilNadu</p>
          </div>
          <div className="p-3 flex flex-col gap-2 text-[10.5px]">
             <div className="grid grid-cols-[100px_1fr] flex-1">
               <span className="text-gray-600">IP No. :</span> <span className="font-bold text-xs">97101 / 0000246611</span>
             </div>
             <div className="grid grid-cols-[100px_1fr] flex-1">
               <span className="text-gray-600">Bill No. :</span> <span className="font-bold">ICR33504</span>
             </div>
             <div className="grid grid-cols-[100px_1fr] flex-1">
               <span className="text-gray-600">Bill Dt./Time :</span> <span className="font-bold">13-Jan-2024 10:06 AM</span>
             </div>
             <div className="grid grid-cols-[100px_1fr] flex-1">
               <span className="text-gray-600">Admission Dt. :</span> <span className="font-bold">10-Jan-2024 7:22 AM</span>
             </div>
             <div className="grid grid-cols-[100px_1fr] flex-1">
               <span className="text-gray-600">Discharge Dt. :</span> <span className="font-bold">13-Jan-2024 10:06 AM</span>
             </div>
          </div>
        </div>

        {/* DETAILS HEADER */}
        <div className="text-center font-bold text-sm mb-1 uppercase">
          DETAILS
        </div>

        {/* ITEMS SECTION */}
        <div className="w-full text-gray-800">
           {/* Top Border rules for header */}
           <div className="grid grid-cols-[1fr_150px] border-t-2 border-b-2 border-black border-dashed py-1 font-bold text-[11px]">
             <div>Service Name</div>
             <div className="text-right">Amount(Rs.)</div>
           </div>

           {/* Items List */}
           <div className="py-2 space-y-1 min-h-[100px]">
              {services.map((svc, idx) => (
                <div key={idx} className="grid grid-cols-[1fr_150px] text-[11px] uppercase text-gray-700">
                  <div>{svc.name}</div>
                  <div className="text-right">{formatAmt(svc.amount)}</div>
                </div>
              ))}
           </div>

           {/* Totals Section */}
           <div className="mt-4 mb-4 border-t border-black border-dashed pt-3 grid grid-cols-[1fr_150px] text-[12px]">
              <div className="text-right font-bold pr-8">Bill Amount</div>
              <div className="text-right font-bold border-b border-black border-dashed pb-2">{formatAmt(totalAmount)}</div>
           </div>
        </div>

        {/* BOTTOM SECTION */}
        <div className="mt-2 flex flex-col gap-2 text-[10.5px] text-gray-800">
            {settings.amountInWords !== "None" && (
                <div>
                  <p className="font-bold">In Words :</p>
                  <p>
                    {settings.amountInWords === "Indian" 
                      ? "Fifteen Thousand One Hundred Forty Three Rupees and Fifty Four Paise" 
                      : "Fifteen Thousand One Hundred Forty Three Point Fifty Four"}
                  </p>
                </div>
            )}

            <div className="grid grid-cols-[300px_1fr] mt-2 font-bold">
               <span>Refundable Deposit As On 13-Jan-2024 10:05 AM</span>
               <span>Rs.{deposit}</span>
            </div>

            <div className="mt-1 space-y-2">
              <p>This is a computer generated statement and requires no signature.</p>
              
              <p>This Receipt is valid for an employer or insurer, who is contractually obligated to reimburse the medical expenses covered by MediSave and/or MediShield.</p>
              
              {settings.showTermsAndConditions && settings.termsText && (
                <p>For billing and general enquiries, please mail: {dispEmail || "care@hospital.com"} <br/> {settings.termsText}</p>
              )}
              
              {settings.showPrintDescription && settings.printDescriptionText && (
                <p className="border mt-2 p-2">{settings.printDescriptionText}</p>
              )}

              <p className="mt-4">© {dispName} 2024, All Rights reserved</p>
            </div>

            {settings.showSignature && (
              <div className="flex flex-col items-end justify-end mt-8 mb-2 pr-10">
                <div className="border-t border-gray-800 w-48 mb-1"></div>
                <p className="font-semibold text-gray-700 text-center w-48">{settings.signatureLabel}</p>
              </div>
            )}
        </div>

      </div>
    </div>
  )
}
