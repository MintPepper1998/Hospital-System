import { format, differenceInYears } from "date-fns"
import { Building2 } from "lucide-react"

// Types
import type { HospitalSettingsData } from "@/app/actions/settings"
import type { PrintTemplateSettingsData } from "@/lib/print-template-types"

export function MedicalBillTemplate({ 
  billing, 
  hospitalSettings, 
  printSettings 
}: { 
  billing: any
  hospitalSettings: HospitalSettingsData
  printSettings: PrintTemplateSettingsData 
}) {
  const patient = billing.patient
  const doctor = billing.appointment?.doctor
  const age = patient?.dateOfBirth ? differenceInYears(new Date(), new Date(patient.dateOfBirth)) : "-"
  
  const isPortrait = printSettings.orientation === "Portrait"

  const dispName = hospitalSettings.name
  const dispAddress = hospitalSettings.address
  const dispPhone = hospitalSettings.phone
  const dispEmail = hospitalSettings.email
  const dispGstin = hospitalSettings.gstNo

  const headerSizeClass = 
    printSettings.companyNameSize === "Small" ? "text-lg print:text-base" :
    printSettings.companyNameSize === "Large" ? "text-3xl print:text-2xl" : "text-xl print:text-lg"

  const textSizeClass = 
    printSettings.invoiceTextSize === "Small" ? "text-[8px] print:text-[8px]" :
    printSettings.invoiceTextSize === "Large" ? "text-[12px] print:text-[12px]" : "text-[10px] print:text-[10px]"

  const formatAmt = (amt: number) => {
    let str = printSettings.printAmountGrouped ? amt.toLocaleString("en-IN") : amt.toString()
    if (printSettings.showAmountDecimal) {
      if (!str.includes('.')) str += ".00"
    } else {
      str = str.split('.')[0]
    }
    return str
  }

  return (
    <div className={`bg-white shadow-md print:shadow-none overflow-hidden flex flex-col mx-auto ${isPortrait ? 'w-[210mm] max-w-full' : 'w-[297mm] max-w-full'} p-8 print:p-[10mm] print:border-none print:w-full`}>
      <div className={`flex-1 flex flex-col ${textSizeClass}`}>
        
        {/* HEADER */}
        {printSettings.printHeaderRepeat && (
          <div className="flex justify-between items-center border-[1.5px] border-gray-400 mb-6 p-2 min-h-[6rem] py-3 print:h-auto print:mb-4">
            <div className="flex gap-4 items-center pl-2">
              {hospitalSettings.logoUrl ? (
                <img src={hospitalSettings.logoUrl} alt="Logo" className="max-w-[120px] max-h-[70px] object-contain" />
              ) : (
                <div 
                  className="w-16 h-16 bg-gray-200 flex items-center justify-center print:border print:border-gray-300"
                  style={{ backgroundColor: `${printSettings.themeColor || '#000000'}20` }}
                >
                  <Building2 style={{ color: printSettings.themeColor || undefined }} className="h-10 w-10 print:text-black" />
                </div>
              )}
            </div>
            
            <div className="text-center flex-1">
              <h1 className={`${headerSizeClass} font-bold tracking-wide uppercase print:text-black`} style={{ color: printSettings.themeColor || undefined }}>
                {dispName}
              </h1>
              <p className="text-gray-700 mt-1 leading-tight font-medium print:text-black">
                {dispAddress}
              </p>
              <div className="flex items-center justify-center gap-2 mt-1 text-gray-700 print:text-black">
                {dispPhone && <span>Tel.: {dispPhone}</span>}
                {dispEmail && <span>| Email: {dispEmail}</span>}
              </div>
              {dispGstin && <p className="text-gray-500 font-medium mt-0.5 print:text-black">GSTIN: {dispGstin}</p>}
              {printSettings.showQualityAccreditations && (printSettings as any).accreditationText && (
                <p className="text-[10px] font-bold text-green-700 print:text-black mt-1">✓ {(printSettings as any).accreditationText}</p>
              )}
            </div>

            <div className="w-40 flex justify-end">
               {printSettings.showEmergencyBanner ? (
                 <div className="bg-red-600 text-white font-bold p-2 text-center text-[10px] mr-2 w-full print:border-[1.5px] print:border-black print:text-black print:bg-transparent">
                    {(printSettings as any).emergencyContactText || "24/7 Emergency Line"}
                 </div>
               ) : (
                 <div className="bg-blue-600 text-white font-bold p-2 text-center text-sm mr-2 w-full print:border-[1.5px] print:border-black print:text-black print:bg-transparent">
                    {billing.type === "OPD" ? "OPD BILL" : "INPATIENT BILL"}
                 </div>
               )}
            </div>
          </div>
        )}

        <div className="text-center font-bold text-sm mb-3 uppercase">
          {billing.type === "OPD" ? "OPD BILL / RECEIPT" : "TAX INVOICE"}
        </div>

        {/* PATIENT DETAILS GRID */}
        <div className="border-[1.5px] border-gray-400 text-gray-800 print:text-black grid grid-cols-2 text-[11px] print:text-[10px] mb-6 print:mb-4">
          <div className="p-3 border-r-[1.5px] border-gray-400 flex flex-col gap-2">
            <p className="font-bold border-b border-gray-300 pb-1 mb-1 text-xs uppercase">Patient Details</p>
            <p className="font-bold text-sm uppercase">{patient?.user?.name || "Unknown Patient"}</p>
            {age !== "-" && <p>{age}Y / {patient?.gender || "-"}</p>}
            {patient?.phone && <p>Phone: {patient.phone}</p>}
            {patient?.address && <p>{patient.address}</p>}
            {doctor && (
              <p className="mt-2 font-medium border-t border-gray-200 print:border-gray-300 pt-1">Consulting Dr: {doctor.user.name}</p>
            )}
          </div>
          <div className="p-3 flex flex-col gap-2">
             <div className="grid grid-cols-[100px_1fr] flex-1">
               <span className="text-gray-600 print:text-black">Patient ID :</span> <span className="font-bold text-xs">{patient?.patientId || "-"}</span>
             </div>
             <div className="grid grid-cols-[100px_1fr] flex-1">
               <span className="text-gray-600 print:text-black">Bill No. :</span> <span className="font-bold">{billing.billNumber}</span>
             </div>
             <div className="grid grid-cols-[100px_1fr] flex-1">
               <span className="text-gray-600 print:text-black">Bill Dt./Time :</span> <span className="font-bold">{format(new Date(billing.billDate), "dd-MMM-yyyy hh:mm a")}</span>
             </div>
             <div className="grid grid-cols-[100px_1fr] flex-1">
               <span className="text-gray-600 print:text-black">Status :</span> <span className="font-bold uppercase">{billing.status}</span>
             </div>
             {billing.admissionId && (
               <div className="grid grid-cols-[100px_1fr] flex-1 mt-1 border-t border-gray-200 print:border-gray-300 pt-1.5">
                 <span className="text-gray-600 print:text-black">Admission :</span> <span className="font-bold uppercase">Linked to IPD</span>
               </div>
             )}
          </div>
        </div>

        {/* DETAILS HEADER */}
        <div className="text-center font-bold text-sm mb-1 uppercase">
          {printSettings.showItemizedBreakdown ? "ITEMIZED SERVICES" : "DETAILS"}
        </div>

        {/* ITEMS SECTION */}
        <div className="w-full text-gray-800 print:text-black">
           {/* Top Border rules for header */}
           {billing.type === "IPD" ? (
             <div className="grid grid-cols-[1fr_80px_50px_100px] border-t-[1.5px] border-b-[1.5px] border-black border-dashed py-1.5 font-bold text-[11px] print:text-[10px]">
               <div>Service Description</div>
               <div className="text-right">Rate(Rs.)</div>
               <div className="text-center">Qty</div>
               <div className="text-right">Amount(Rs.)</div>
             </div>
           ) : (
             <div className="grid grid-cols-[1fr_150px] border-t-[1.5px] border-b-[1.5px] border-black border-dashed py-1.5 font-bold text-[11px] print:text-[10px]">
               <div>Service Description</div>
               <div className="text-right">Amount(Rs.)</div>
             </div>
           )}

           {/* Items List */}
           <div className="py-4 space-y-2 min-h-[150px] print:min-h-[100px]">
              {billing.items && billing.items.map((item: any, idx: number) => {
                const isGrouped = (printSettings as any).ipdBillLayoutStrategy === "GROUPED_BY_CATEGORY";
                const colClass = billing.type === "IPD" ? "grid-cols-[1fr_80px_50px_100px]" : "grid-cols-[1fr_150px]";
                
                return (
                  <div key={idx} className="flex flex-col mb-1 text-[11px] print:text-[10px] text-gray-800 print:text-black">
                    <div className={`grid ${colClass} uppercase font-semibold`}>
                      <div>
                        {item.description}
                      </div>
                      {billing.type === "IPD" ? (
                        <>
                          <div className="text-right">{item.unitPrice > 0 ? formatAmt(item.unitPrice) : "—"}</div>
                          <div className="text-center">{item.quantity > 0 ? item.quantity : "—"}</div>
                        </>
                      ) : null}
                      <div className="text-right">{formatAmt(item.totalAmount)}</div>
                    </div>
                    {isGrouped && (item.serviceCategory || item.performedBy || item.serviceDate) && (
                      <div className={`grid ${colClass} text-[9px] print:text-[8px] text-gray-600 print:text-gray-800 mt-[2px]`}>
                        <div className="flex gap-3">
                          {item.serviceCategory && <span>Dept: {item.serviceCategory}</span>}
                          {item.serviceDate && <span>Date: {format(new Date(item.serviceDate), "dd-MMM-yy")}</span>}
                          {item.performedBy && <span>By: {item.performedBy}</span>}
                        </div>
                        <div />
                      </div>
                    )}
                  </div>
                )
              })}
           </div>

           {/* Totals Section */}
           <div className="mt-8 mb-6 border-t border-black border-dashed pt-4 flex flex-col gap-1 items-end text-[12px] print:text-[11px]">
              {billing.discountAmount > 0 && printSettings.showDiscountDetails && (
                <div className="grid grid-cols-[150px_100px]">
                  <div className="text-right font-bold pr-4">Discount</div>
                  <div className="text-right border-b border-gray-300 pb-1">-{formatAmt(billing.discountAmount)}</div>
                </div>
              )}
              {billing.taxAmount > 0 && printSettings.showTaxDetails && (
                <div className="grid grid-cols-[150px_100px]">
                  <div className="text-right font-bold pr-4">GST on Medicines</div>
                  <div className="text-right border-b border-gray-300 pb-1">+{formatAmt(billing.taxAmount)}</div>
                </div>
              )}
              <div className="grid grid-cols-[150px_100px] mt-1">
                <div className="text-right font-bold pr-4">Bill Amount</div>
                <div className="text-right font-bold border-b-2 border-black border-dashed pb-1">{formatAmt(billing.netAmount)}</div>
              </div>
              {printSettings.showReceivedAmount && (
                <div className="grid grid-cols-[150px_100px] mt-1 print:mt-2">
                  <div className="text-right font-bold pr-4">Received Amount</div>
                  <div className="text-right font-bold border-b border-gray-300 pb-1">{formatAmt(billing.paidAmount)}</div>
                </div>
              )}
              {printSettings.showBalanceAmount && billing.balanceAmount > 0 && (
                <div className="grid grid-cols-[150px_100px] mt-1">
                  <div className="text-right font-bold pr-4">Balance Due</div>
                  <div className="text-right font-bold border-b border-gray-300 pb-1">{formatAmt(billing.balanceAmount)}</div>
                </div>
              )}
           </div>
        </div>

        {/* BOTTOM SECTION */}
        <div className="mt-4 flex flex-col gap-4 text-[10.5px] print:text-[9.5px] text-gray-800 print:text-black border-t border-black border-dashed pt-4">
            {printSettings.amountInWords !== "None" && (
                <div>
                  <p className="font-bold">In Words :</p>
                  <p className="uppercase">{numberToWords(billing.netAmount)} Rupees Only</p>
                </div>
            )}

            <div className="mt-2 space-y-3">
              <p>This is a computer generated statement and requires no signature.</p>
              
              {printSettings.showTermsAndConditions && printSettings.termsText && (
                <p>For billing and general enquiries, please mail: {dispEmail || "care@hospital.com"} <br/> {printSettings.termsText}</p>
              )}
              
              {printSettings.showPrintDescription && printSettings.printDescriptionText && (
                <p className="border border-gray-300 mt-2 p-2">{printSettings.printDescriptionText}</p>
              )}
            </div>

            {printSettings.showSignature && (
              <div className="flex flex-col items-end justify-end mt-12 mb-4 pr-10">
                <div className="border-t border-gray-800 print:border-black w-48 mb-1"></div>
                <p className="font-semibold text-gray-700 print:text-black text-center w-48">{printSettings.signatureLabel}</p>
              </div>
            )}
        </div>

      </div>
    </div>
  )
}

function numberToWords(num: number): string {
  const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine',
    'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen']
  const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety']

  const n = Math.floor(num)
  if (n === 0) return 'Zero'
  if (n < 20) return ones[n]
  if (n < 100) return tens[Math.floor(n / 10)] + (n % 10 ? ' ' + ones[n % 10] : '')
  if (n < 1000) return ones[Math.floor(n / 100)] + ' Hundred' + (n % 100 ? ' and ' + numberToWords(n % 100) : '')
  if (n < 100000) return numberToWords(Math.floor(n / 1000)) + ' Thousand' + (n % 1000 ? ' ' + numberToWords(n % 1000) : '')
  if (n < 10000000) return numberToWords(Math.floor(n / 100000)) + ' Lakh' + (n % 100000 ? ' ' + numberToWords(n % 100000) : '')
  return numberToWords(Math.floor(n / 10000000)) + ' Crore' + (n % 10000000 ? ' ' + numberToWords(n % 10000000) : '')
}
