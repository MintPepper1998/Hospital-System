import { format, differenceInYears } from "date-fns"
import { Building2 } from "lucide-react"

// Types
import type { HospitalSettingsData } from "@/app/actions/settings"
import type { PrintTemplateSettingsData } from "@/lib/print-template-types"

export function MedicineBillTemplate({ 
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

  const formatAmt = (amt: number | undefined | null) => {
    const safeAmt = Number(amt) || 0;
    let str = printSettings.printAmountGrouped ? safeAmt.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : safeAmt.toFixed(2)
    return str
  }

  // Calculate taxes
  const totalTaxAmount = billing.taxAmount || 0
  const taxableAmount = billing.totalAmount - totalTaxAmount
  const cgstAmount = totalTaxAmount / 2
  const sgstAmount = totalTaxAmount / 2
  const basicAmount = taxableAmount + totalTaxAmount // which is equal to billing.totalAmount
  const billLevelDiscount = billing.discountAmount || 0
  const roundOff = billing.roundOff || 0
  const netAmount = billing.netAmount || 0

  // Calculate total item-level discount (MRP×Qty - Amount, summed across items)
  const totalItemDiscount = billing.items?.reduce((sum: number, item: any) => {
    const grossAmount = (item.unitPrice || 0) * (item.quantity || 0)
    const lineTotal = item.totalAmount || 0
    return sum + Math.max(0, grossAmount - lineTotal)
  }, 0) || 0
  const totalDiscount = totalItemDiscount + billLevelDiscount

  // Determine paper size: A5 for ≤5 items, A4 for more
  const itemCount = billing.items?.length || 0
  const useA5 = itemCount <= 5
  const paperClass = useA5 ? "medicine-bill-a5" : "medicine-bill-a4"

  return (
    <>
      {/* Print-specific styles for medicine bill */}
      <style>{`
        @media print {
          /* ── Global print reset ── */
          body {
            margin: 0 !important;
            padding: 0 !important;
            background: white !important;
          }

          /* Hide sidebar, header, nav, and non-bill UI */
          nav, aside, header,
          [class*="sidebar"], [class*="Sidebar"],
          .print\\:hidden {
            display: none !important;
          }

          /* ── A5 paper: 148mm × 210mm ── */
          .medicine-bill-a5 {
            width: 100% !important;
            max-width: none !important;
            margin: 0 !important;
            padding: 2mm !important;
            page: medicine-a5;
            font-size: 8px !important;
          }
          /* Scale down all text inside A5 bill */
          .medicine-bill-a5 * {
            font-size: inherit;
          }
          .medicine-bill-a5 .bill-header-name {
            font-size: 14px !important;
          }
          .medicine-bill-a5 .bill-title {
            font-size: 10px !important;
          }
          .medicine-bill-a5 .bill-table-header,
          .medicine-bill-a5 .bill-table-row {
            grid-template-columns: 18px 1fr 28px 50px 36px 24px 42px 28px 28px 50px !important;
            font-size: 7.5px !important;
          }
          .medicine-bill-a5 .bill-customer-grid {
            font-size: 8px !important;
          }
          .medicine-bill-a5 .bill-footer-totals {
            font-size: 8px !important;
          }
          .medicine-bill-a5 .bill-footer-net {
            font-size: 10px !important;
          }
          .medicine-bill-a5 .bill-terms {
            font-size: 7px !important;
          }
          @page medicine-a5 {
            size: 148mm 210mm !important;
            margin: 4mm 5mm !important;
          }

          /* ── A4 paper: 210mm × 297mm ── */
          .medicine-bill-a4 {
            width: 100% !important;
            max-width: none !important;
            margin: 0 !important;
            padding: 4mm !important;
            page: medicine-a4;
          }
          @page medicine-a4 {
            size: 210mm 297mm !important;
            margin: 5mm 8mm !important;
          }
        }
      `}</style>
      <div className={`bg-white shadow-md print:shadow-none overflow-hidden flex flex-col mx-auto ${paperClass} ${isPortrait ? 'w-[210mm] max-w-full' : 'w-[297mm] max-w-full'} p-8 print:border-none`}>
      <div className={`flex-1 flex flex-col ${textSizeClass}`}>
        
        {/* HEADER */}
        {printSettings.printHeaderRepeat && (
          <div className="flex justify-between items-center border-[1.5px] border-black mb-4 p-2 min-h-[5rem] py-2 print:h-auto print:mb-2">
            <div className="flex gap-4 items-center pl-2">
              {hospitalSettings.logoUrl ? (
                <img src={hospitalSettings.logoUrl} alt="Logo" className="max-w-[100px] max-h-[60px] object-contain" />
              ) : (
                <div 
                  className="w-12 h-12 flex items-center justify-center print:border print:border-black"
                >
                  <Building2 className="h-8 w-8 print:text-black" />
                </div>
              )}
            </div>
            
            <div className="text-center flex-1">
              <h1 className={`bill-header-name ${headerSizeClass} font-bold tracking-wide uppercase print:text-black`} style={{ color: printSettings.themeColor || undefined }}>
                {dispName}
              </h1>
              <p className="text-black leading-tight font-medium print:text-black">
                {dispAddress}
              </p>
              <div className="flex items-center justify-center gap-2 text-black print:text-black">
                {dispPhone && <span>Tel.: {dispPhone}</span>}
                {dispEmail && <span>| Email: {dispEmail}</span>}
              </div>
            </div>
          </div>
        )}

        <div className="bill-title text-center font-bold text-sm mb-2 uppercase text-black print:text-black">
          TAX INVOICE / CASH MEMO
        </div>

        {/* CUSTOMER & BILL DETAILS GRID */}
        <div className="bill-customer-grid border-[1.5px] border-black text-black print:text-black grid grid-cols-[60%_40%] text-[10px] print:text-[10px] mb-4 print:mb-2 leading-tight">
          <div className="p-2 border-r-[1.5px] border-black flex flex-col gap-1">
            {/* Priority: pharmacyCustomer > PHARMACY-CUSTOMER patient > regular patient > walk-in */}
            {billing.pharmacyCustomer ? (
              <>
                <div className="grid grid-cols-[70px_1fr]"><span className="font-semibold">Customer:</span> <span>{billing.pharmacyCustomer.name}</span></div>
                {billing.pharmacyCustomer.phone && (
                  <div className="grid grid-cols-[70px_1fr]"><span className="font-semibold">Mob No:</span> <span>{billing.pharmacyCustomer.phone}</span></div>
                )}
                {billing.pharmacyCustomer.address && (
                  <div className="grid grid-cols-[70px_1fr]"><span className="font-semibold">Address:</span> <span>{billing.pharmacyCustomer.address}</span></div>
                )}
              </>
            ) : patient?.patientId === "PHARMACY-CUSTOMER" ? (
              <>
                <div className="grid grid-cols-[70px_1fr]"><span className="font-semibold">Customer:</span> <span>{patient?.user?.name || "Unknown"}</span></div>
                <div className="grid grid-cols-[70px_1fr]"><span className="font-semibold">Mob No:</span> <span>{patient?.phone || (patient?.user as any)?.phone || "-"}</span></div>
                {patient?.address && (
                  <div className="grid grid-cols-[70px_1fr]"><span className="font-semibold">Address:</span> <span>{patient.address}</span></div>
                )}
              </>
            ) : patient?.patientId === "PAT-WALKIN" ? (
              <div className="grid grid-cols-[70px_1fr]"><span className="font-semibold">Patient Name:</span> <span>Walk-In Customer</span></div>
            ) : (
              <>
                <div className="grid grid-cols-[70px_1fr]"><span className="font-semibold">Patient Name:</span> <span>{patient?.user?.name || "Unknown"}</span></div>
                <div className="grid grid-cols-[70px_1fr]"><span className="font-semibold">Age / Sex:</span> <span>{age !== "-" ? `${age}Y` : "-"} / {patient?.gender || "-"}</span></div>
                <div className="grid grid-cols-[70px_1fr]"><span className="font-semibold">Address:</span> <span>{patient?.address || "-"}</span></div>
                <div className="grid grid-cols-[70px_1fr]"><span className="font-semibold">Mob No:</span> <span>{(patient?.user as any)?.phone || "-"}</span></div>
              </>
            )}
            {doctor && (
              <div className="grid grid-cols-[70px_1fr]"><span className="font-semibold">Dr. Name:</span> <span>Dr. {doctor.user.name}</span></div>
            )}
            <div className="grid grid-cols-[70px_1fr]"><span className="font-semibold">GSTIN / UIN:</span> <span>{dispGstin || "-"}</span></div>
            <div className="grid grid-cols-[70px_1fr]"><span className="font-semibold">D.L. No:</span> <span>20B-12345 / 21B-12345</span></div>
          </div>
          <div className="p-2 flex flex-col gap-1">
            <div className="grid grid-cols-[70px_1fr]"><span className="font-semibold">Inv. No:</span> <span className="font-bold">{billing.billNumber}</span></div>
            <div className="grid grid-cols-[70px_1fr]"><span className="font-semibold">Inv. Date:</span> <span>{format(new Date(billing.billDate), "dd-MM-yyyy")}</span></div>
            <div className="grid grid-cols-[70px_1fr]"><span className="font-semibold">Time:</span> <span>{format(new Date(billing.billDate), "hh:mm a")}</span></div>
            <div className="grid grid-cols-[70px_1fr]"><span className="font-semibold">Pay Mode:</span> <span className="uppercase">{billing.paymentMethod || "CASH"}</span></div>
            {!billing.pharmacyCustomer && patient?.patientId !== "PAT-WALKIN" && patient?.patientId !== "PHARMACY-CUSTOMER" && (
              <div className="grid grid-cols-[70px_1fr]"><span className="font-semibold">Patient ID:</span> <span>{patient?.patientId || "-"}</span></div>
            )}
          </div>
        </div>

        {/* ITEMS SECTION */}
        <div className={`w-full text-black print:text-black border-[1.5px] border-black mb-0 flex flex-col ${useA5 ? 'min-h-[120px]' : 'min-h-[300px]'}`}>
           {/* Table Header */}
           <div className="bill-table-header grid grid-cols-[25px_1fr_40px_60px_45px_35px_55px_35px_35px_65px] border-b-[1.5px] border-black py-1 font-bold text-[10px] print:text-[10px] text-center bg-gray-100 print:bg-transparent">
             <div className="border-r border-black">SL</div>
             <div className="border-r border-black text-left pl-1">Medicine Name</div>
             <div className="border-r border-black">UOM</div>
             <div className="border-r border-black">Batch</div>
             <div className="border-r border-black">Expiry</div>
             <div className="border-r border-black">Qty</div>
             <div className="border-r border-black">M.R.P</div>
             <div className="border-r border-black">Disc%</div>
             <div className="border-r border-black">GST%</div>
             <div>Amount</div>
           </div>

           {/* Items List */}
           <div className="flex-1">
              {billing.items && billing.items.map((item: any, idx: number) => {
                // Determine UOM from description loosely or fallback
                let uom = "TAB"
                const descUpper = item.description?.toUpperCase() || ""
                if (descUpper.includes("SYRUP")) uom = "BOTT"
                else if (descUpper.includes("INJ")) uom = "AMP"
                else if (descUpper.includes("CREAM") || descUpper.includes("OINTMENT")) uom = "TUBE"
                else if (descUpper.includes("DROP")) uom = "DROP"

                // We need to parse out batch number which might be in description, but we saved it cleanly in actions
                // Actually in actions we save: description: `${item.medicineName} (Batch: ${item.batchNumber})`
                // Let's just use it cleanly. Wait, the DB saves it as one string. We can try to regex it out, but it's ok to display as is if we can't.
                // Wait, PharmacyPOSClient sets `item.batchNumber` in the UI but `processPharmacySale` does not save batchNumber field in billingItem, it just puts it in description!
                // Let me extract it for better display.
                let medName = item.description
                let batch = item.referenceId || "—" // We saved batchId in referenceId, but not the string.
                // Regex to match "MedicineName (Batch: XYZ) - Qty unit(s)"
                const match = item.description?.match(/^(.*?)\s*\(Batch:\s*(.*?)\)/i)
                if (match) {
                    medName = match[1]
                    batch = match[2]
                }

                // If it's a lab test
                if (medName.startsWith("Lab Test:")) {
                    uom = "TEST"
                    batch = "—"
                }

                // Calculate per-item discount %
                const grossAmt = (item.unitPrice || 0) * (item.quantity || 0)
                const itemDiscPct = grossAmt > 0 ? ((grossAmt - (item.totalAmount || 0)) / grossAmt * 100) : 0

                return (
                  <div key={idx} className="bill-table-row grid grid-cols-[25px_1fr_40px_60px_45px_35px_55px_35px_35px_65px] text-[10px] print:text-[10px] text-center border-b border-gray-300 print:border-black border-dotted last:border-b-0 py-0.5">
                    <div className="border-r border-black border-dotted">{idx + 1}</div>
                    <div className="border-r border-black border-dotted text-left pl-1 truncate" title={medName}>{medName}</div>
                    <div className="border-r border-black border-dotted">{uom}</div>
                    <div className="border-r border-black border-dotted">{batch}</div>
                    <div className="border-r border-black border-dotted">{item.expiryDate ? format(new Date(item.expiryDate), "MM/yy") : "—"}</div>
                    <div className="border-r border-black border-dotted">{item.quantity}</div>
                    <div className="border-r border-black border-dotted text-right pr-1">{formatAmt(item.unitPrice)}</div>
                    <div className="border-r border-black border-dotted">{itemDiscPct > 0 ? itemDiscPct.toFixed(1) : "—"}</div>
                    <div className="border-r border-black border-dotted">{item.gstRate || 0}</div>
                    <div className="text-right pr-1 font-semibold">{formatAmt(item.totalAmount)}</div>
                  </div>
                )
              })}
           </div>
        </div>

        {/* FOOTER TOTALS */}
        <div className="bill-footer-totals border-l-[1.5px] border-r-[1.5px] border-b-[1.5px] border-black text-[10px] print:text-[10px] flex">
            {/* Left side Taxes */}
            <div className="flex-1 p-2 border-r-[1.5px] border-black">
                <div className="grid grid-cols-[100px_1fr] font-medium leading-tight">
                    <span>Taxable Amt</span><span>: {formatAmt(taxableAmount)}</span>
                </div>
                <div className="grid grid-cols-[100px_1fr] font-medium leading-tight">
                    <span>CGST Amt</span><span>: {formatAmt(cgstAmount)}</span>
                </div>
                <div className="grid grid-cols-[100px_1fr] font-medium leading-tight">
                    <span>SGST Amt</span><span>: {formatAmt(sgstAmount)}</span>
                </div>
            </div>
            {/* Right side Totals */}
            <div className="w-[200px] p-2 flex flex-col font-medium leading-tight justify-end text-right gap-1">
                <div className="flex justify-between"><span>Basic</span><span>: {formatAmt(basicAmount)}</span></div>
                {totalItemDiscount > 0 && (
                  <div className="flex justify-between"><span>Item Disc.</span><span>: -{formatAmt(totalItemDiscount)}</span></div>
                )}
                {billLevelDiscount > 0 && (
                  <div className="flex justify-between"><span>Bill Disc.</span><span>: -{formatAmt(billLevelDiscount)}</span></div>
                )}
                {totalDiscount > 0 && totalItemDiscount > 0 && billLevelDiscount > 0 && (
                  <div className="flex justify-between text-[9px] text-gray-600 print:text-black"><span>Total Disc.</span><span>: -{formatAmt(totalDiscount)}</span></div>
                )}
                {totalDiscount === 0 && (
                  <div className="flex justify-between"><span>Discount</span><span>: {formatAmt(0)}</span></div>
                )}
                <div className="flex justify-between"><span>Round Off</span><span>: {formatAmt(roundOff)}</span></div>
                <div className="bill-footer-net flex justify-between font-bold text-[12px] print:text-[12px] pt-1 border-t border-black"><span>Net Amount</span><span>: {formatAmt(netAmount)}</span></div>
            </div>
        </div>

        {/* BOTTOM SECTION */}
        <div className="mt-2 flex flex-col gap-2 text-[10px] print:text-[10px] text-black print:text-black pt-1">
            <div className="font-semibold">
                Rupees {numberToWords(netAmount)} Only
            </div>
            
            {billing.paymentMethod === "SPLIT" && billing.notes && billing.notes.includes("SPLIT") && (
              <div className="text-[9px] font-medium text-gray-700 print:text-black border border-gray-300 print:border-black p-1 inline-block w-fit">
                Payment Details: {billing.notes.split("] ").pop() || billing.notes}
              </div>
            )}

            <div className="bill-terms mt-1">
                <span className="font-bold underline decoration-1 underline-offset-2">Terms & Conditions</span>
                <ol className="list-decimal pl-4 mt-1 space-y-0.5 text-[9px] print:text-[9px]">
                    <li>Medicines without Batch No, and Exp Date will not be taken back.</li>
                    <li>Medicines will be taken back within 7 days with valid Bill.</li>
                    <li>Cut/loose medicines and items requiring cold storage will not be taken back.</li>
                </ol>
            </div>
            {printSettings.showSignature && (
              <div className="flex flex-col items-end justify-end mt-4 mb-2 pr-4">
                <p className="font-bold text-black print:text-black text-center">For {dispName}</p>
                <div className="mt-6">
                    <p className="font-semibold text-black print:text-black text-center">Authorized Signatory</p>
                </div>
              </div>
            )}
        </div>

      </div>
    </div>
    </>
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
