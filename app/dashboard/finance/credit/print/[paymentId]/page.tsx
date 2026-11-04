import { notFound, redirect } from "next/navigation"
import { prisma } from "@/lib/prisma"
import { format } from "date-fns"
import { getHospitalSettings } from "@/app/actions/settings"
import { getPrintSettings } from "@/app/actions/print-settings"
import { PrintTrigger } from "@/app/dashboard/clinical/opd/print/[appointmentId]/print-trigger"

const METHOD_LABELS: Record<string, string> = {
  CASH: "Cash",
  UPI: "UPI",
  CARD: "Card",
  BANK_TRANSFER: "Bank Transfer",
  CREDIT: "Credit",
}

interface PrintCreditPaymentPageProps {
  params: Promise<{ paymentId: string }>
}

function formatINR(amount: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 2,
  }).format(amount)
}

export default async function PrintCreditPaymentPage({ params }: PrintCreditPaymentPageProps) {
  const { paymentId } = await params

  // Fetch payment and associated credit entry
  const payment = await prisma.creditPayment.findUnique({
    where: { id: paymentId },
    include: {
      creditEntry: true,
    },
  })

  if (!payment) {
    notFound()
  }

  // Fetch linked billing record if exists
  let linkedBillNumber = null
  if (payment.creditEntry.referenceType === "BILLING" && payment.creditEntry.referenceId) {
    const billing = await prisma.billing.findUnique({
      where: { id: payment.creditEntry.referenceId },
      select: { billNumber: true, type: true },
    })
    if (billing?.type === "PHARMACY") {
      redirect(`/dashboard/pharmacy/invoice/${payment.creditEntry.referenceId}`)
    }
    linkedBillNumber = billing?.billNumber || null
  }

  // Get hospital settings for dynamic name
  const hospitalSettings = await getHospitalSettings()
  // Get print settings
  const settings = await getPrintSettings()

  const isPortrait = settings.orientation === "Portrait"
  const themeColor = settings.themeColor || "#0066CC"

  const headerSizeClass =
    settings.companyNameSize === "Small" ? "text-lg" :
    settings.companyNameSize === "Large" ? "text-3xl" : "text-xl"

  const textSizeClass =
    settings.invoiceTextSize === "Small" ? "text-xs" :
    settings.invoiceTextSize === "Large" ? "text-base" : "text-sm"

  return (
    <>
      <PrintTrigger />
      <div className="bg-white min-h-screen print:min-h-0 text-black font-sans">
        <div className={`mx-auto bg-white p-8 print:p-6 ${isPortrait ? 'max-w-[210mm]' : 'max-w-[297mm]'}`}>
          
          {/* HEADER */}
          {settings.printHeaderRepeat && (
            <div className="flex items-start justify-between border-b-2 pb-4 mb-6" style={{ borderColor: themeColor }}>
              <div className="flex items-start gap-3">
                {hospitalSettings.logoUrl && (
                  <img src={hospitalSettings.logoUrl} alt="Logo" className="h-20 w-20 object-contain flex-shrink-0" />
                )}
                <div className="text-left mt-2">
                  <h1 className={`${headerSizeClass} font-bold tracking-wide uppercase`} style={{ color: themeColor }}>
                    {settings.useCustomCompanyInfo ? (settings.customName || hospitalSettings.name) : hospitalSettings.name}
                  </h1>
                  <p className="text-sm text-gray-600 mt-1">
                    {settings.useCustomCompanyInfo ? (settings.customAddress || hospitalSettings.address) : hospitalSettings.address}
                  </p>
                </div>
              </div>
              <div className="text-right text-sm text-gray-500 mt-2">
                <p>{settings.useCustomCompanyInfo ? (settings.customPhone || hospitalSettings.phone) : hospitalSettings.phone}</p>
                <p>{settings.useCustomCompanyInfo ? (settings.customEmail || hospitalSettings.email) : hospitalSettings.email}</p>
                {settings.useCustomCompanyInfo ? (
                  settings.customGstin && <p className="font-semibold text-gray-700">GSTIN: {settings.customGstin}</p>
                ) : (
                  hospitalSettings.gstNo && <p className="font-semibold text-gray-700">GSTIN: {hospitalSettings.gstNo}</p>
                )}
              </div>
            </div>
          )}

          {/* RECEIPT TITLE */}
          <div className="text-center mb-6">
            <h2 className={`font-bold uppercase tracking-widest ${textSizeClass}`} style={{ color: themeColor }}>
              {payment.creditEntry.type === "RECEIVABLE" ? "DUE PAYMENT RECEIPT" : "PAYMENT RECEIPT"}
            </h2>
            <div className="w-16 h-1 mx-auto mt-2" style={{ backgroundColor: themeColor }}></div>
          </div>

          {/* RECEIPT DETAILS */}
          <div className={`mb-8 border rounded-lg p-6 ${textSizeClass}`}>
            <div className="grid grid-cols-2 gap-y-4">
              <div>
                <p className="text-gray-500 font-medium">Receipt No / Ref:</p>
                <p className="font-bold">{payment.reference || payment.id.slice(-6).toUpperCase()}</p>
              </div>
              <div className="text-right">
                <p className="text-gray-500 font-medium">Date & Time:</p>
                <p className="font-bold">{format(new Date(payment.paymentDate), "dd MMM yyyy, hh:mm a")}</p>
              </div>

              <div>
                <p className="text-gray-500 font-medium">Party Name:</p>
                <p className="font-bold text-gray-900">{payment.creditEntry.partyName}</p>
              </div>
              <div className="text-right">
                <p className="text-gray-500 font-medium">Party Type:</p>
                <p className="font-bold text-gray-900">{payment.creditEntry.partyType}</p>
              </div>

              {linkedBillNumber && (
                <div>
                  <p className="text-gray-500 font-medium">Linked Bill:</p>
                  <p className="font-mono font-bold">{linkedBillNumber}</p>
                </div>
              )}
            </div>
          </div>

          {/* PAYMENT BREAKDOWN */}
          <div className={`mb-8 ${textSizeClass}`}>
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b-2" style={{ borderColor: themeColor }}>
                  <th className="py-2 text-gray-600 font-semibold uppercase tracking-wider">Description</th>
                  <th className="py-2 text-right text-gray-600 font-semibold uppercase tracking-wider">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                <tr>
                  <td className="py-3 font-medium">Original Due Amount</td>
                  <td className="py-3 text-right">{formatINR(payment.creditEntry.totalAmount)}</td>
                </tr>
                <tr className="bg-green-50/50">
                  <td className="py-3 font-bold text-green-700">Payment Received Now</td>
                  <td className="py-3 text-right font-bold text-green-700">{formatINR(payment.amount)}</td>
                </tr>
                <tr>
                  <td className="py-3 font-medium">Total Paid (Including this)</td>
                  <td className="py-3 text-right">{formatINR(payment.creditEntry.paidAmount)}</td>
                </tr>
                <tr>
                  <td className="py-3 font-medium">Remaining Balance</td>
                  <td className="py-3 text-right font-bold text-gray-900">
                    {payment.creditEntry.balanceAmount <= 0.01 ? (
                      <span className="text-green-600 bg-green-100 px-2 py-0.5 rounded text-xs ml-2">FULLY SETTLED</span>
                    ) : (
                      formatINR(payment.creditEntry.balanceAmount)
                    )}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <div className={`flex justify-between items-center bg-gray-50 p-4 rounded-lg border ${textSizeClass}`}>
            <div>
              <p className="text-gray-500 font-medium text-sm">Payment Method</p>
              <p className="font-bold text-gray-900">{METHOD_LABELS[payment.paymentMethod] || payment.paymentMethod}</p>
            </div>
            {payment.notes && (
              <div className="text-right">
                <p className="text-gray-500 font-medium text-sm">Notes</p>
                <p className="text-gray-900 italic">{payment.notes}</p>
              </div>
            )}
          </div>

          {/* SIGNATURE AREA */}
          <div className="mt-20 flex justify-between items-end">
            <div className="text-center">
              <div className="w-48 border-t border-gray-400 pt-2 text-gray-600 text-sm">Customer Signature</div>
            </div>
            <div className="text-center">
              <div className="w-48 border-t border-gray-400 pt-2 text-gray-600 text-sm">Authorized Signatory</div>
            </div>
          </div>

          {/* FOOTER */}
          <div className="mt-10 pt-4 border-t border-gray-200 text-center text-xs text-gray-500">
            <p>Thank you for your payment.</p>
            <p>This is a computer-generated receipt and does not require a physical signature.</p>
          </div>
        </div>
      </div>
    </>
  )
}
