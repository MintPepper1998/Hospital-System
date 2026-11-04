"use client"

import { format } from "date-fns"
import { Building2, Phone, Mail } from "lucide-react"

interface BillItem {
  id: string
  description: string
  quantity: number
  unitPrice: number
  totalAmount: number
}

interface PrintDischargeBillProps {
  billNumber: string
  billDate: Date
  patientName: string
  patientAddress: string | null
  patientAge: number | null
  patientGender: string | null
  admissionDate: Date
  dischargeDate: Date
  daysAdmitted: number
  bedNumber: string
  wardName: string
  doctorName: string
  items: BillItem[]
  totalAmount: number
  discountAmount: number
  netAmount: number
  advancePaid: number
  balanceDue: number
  finalDiagnosis: string
}

export function PrintDischargeBill({
  billNumber,
  billDate,
  patientName,
  patientAddress,
  patientAge,
  patientGender,
  admissionDate,
  dischargeDate,
  daysAdmitted,
  bedNumber,
  wardName,
  doctorName,
  items,
  totalAmount,
  discountAmount,
  netAmount,
  advancePaid,
  balanceDue,
  finalDiagnosis
}: PrintDischargeBillProps) {
  return (
    <div className="hidden print:block">
      <div className="max-w-4xl mx-auto p-8 bg-white text-black">
        {/* Hospital Header */}
        <div className="text-center border-b-4 border-blue-600 pb-6 mb-6">
          <div className="flex items-center justify-center gap-3 mb-3">
            <Building2 className="h-12 w-12 text-blue-600" />
            <div>
              <h1 className="text-3xl font-bold text-blue-900">HOSPITAL ERP</h1>
              <p className="text-sm text-gray-600">Advanced Healthcare Management System</p>
            </div>
          </div>
          <div className="flex items-center justify-center gap-6 text-xs text-gray-700">
            <div className="flex items-center gap-1">
              <Phone className="h-3 w-3" />
              <span>+91 123-456-7890</span>
            </div>
            <div className="flex items-center gap-1">
              <Mail className="h-3 w-3" />
              <span>info@hospital.com</span>
            </div>
          </div>
        </div>

        {/* Bill Title */}
        <div className="text-center mb-6">
          <h2 className="text-2xl font-bold text-blue-800 mb-2">
            IPD DISCHARGE BILL
          </h2>
          <div className="flex justify-between items-center text-sm max-w-2xl mx-auto">
            <div>
              <span className="font-semibold">Bill No:</span> {billNumber}
            </div>
            <div>
              <span className="font-semibold">Date:</span> {format(new Date(billDate), "dd MMM yyyy")}
            </div>
          </div>
        </div>

        {/* Patient Information */}
        <div className="grid grid-cols-2 gap-6 mb-6 bg-gray-50 p-4 rounded border">
          <div>
            <h3 className="font-bold text-gray-800 mb-3 border-b pb-1">Patient Details</h3>
            <div className="space-y-2 text-sm">
              <div className="flex">
                <span className="font-semibold w-32">Name:</span>
                <span>{patientName}</span>
              </div>
              <div className="flex">
                <span className="font-semibold w-32">Age / Sex:</span>
                <span>{patientAge || "N/A"} years / {patientGender || "N/A"}</span>
              </div>
              <div className="flex">
                <span className="font-semibold w-32">Address:</span>
                <span className="flex-1">{patientAddress || "Not Provided"}</span>
              </div>
              <div className="flex">
                <span className="font-semibold w-32">Diagnosis:</span>
                <span className="flex-1">{finalDiagnosis}</span>
              </div>
            </div>
          </div>
          
          <div>
            <h3 className="font-bold text-gray-800 mb-3 border-b pb-1">Admission Details</h3>
            <div className="space-y-2 text-sm">
              <div className="flex">
                <span className="font-semibold w-36">Admission Date:</span>
                <span>{format(new Date(admissionDate), "dd MMM yyyy hh:mm a")}</span>
              </div>
              <div className="flex">
                <span className="font-semibold w-36">Discharge Date:</span>
                <span>{format(new Date(dischargeDate), "dd MMM yyyy hh:mm a")}</span>
              </div>
              <div className="flex">
                <span className="font-semibold w-36">Days Admitted:</span>
                <span className="font-bold text-blue-600">{daysAdmitted} {daysAdmitted === 1 ? 'day' : 'days'}</span>
              </div>
              <div className="flex">
                <span className="font-semibold w-36">Bed / Ward:</span>
                <span>{bedNumber} / {wardName}</span>
              </div>
              <div className="flex">
                <span className="font-semibold w-36">Consultant Doctor:</span>
                <span>Dr. {doctorName}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Bill Details Table */}
        <div className="mb-6">
          <h3 className="font-bold text-gray-800 mb-3">Bill Details</h3>
          <table className="w-full border-collapse border border-gray-300 text-sm">
            <thead>
              <tr className="bg-blue-100">
                <th className="border border-gray-300 p-2 text-left">Sr.</th>
                <th className="border border-gray-300 p-2 text-left">Description</th>
                <th className="border border-gray-300 p-2 text-right">Qty</th>
                <th className="border border-gray-300 p-2 text-right">Rate (₹)</th>
                <th className="border border-gray-300 p-2 text-right">Amount (₹)</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item, index) => (
                <tr key={item.id} className="hover:bg-gray-50">
                  <td className="border border-gray-300 p-2">{index + 1}</td>
                  <td className="border border-gray-300 p-2">{item.description}</td>
                  <td className="border border-gray-300 p-2 text-right">{item.quantity}</td>
                  <td className="border border-gray-300 p-2 text-right">
                    {item.unitPrice.toFixed(2)}
                  </td>
                  <td className="border border-gray-300 p-2 text-right font-semibold">
                    {item.totalAmount.toFixed(2)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Bill Summary */}
        <div className="flex justify-end mb-8">
          <div className="w-80 border border-gray-300 rounded">
            <div className="bg-blue-50 p-3 border-b border-gray-300">
              <h3 className="font-bold text-gray-800">Payment Summary</h3>
            </div>
            <div className="p-4 space-y-2 text-sm">
              <div className="flex justify-between pb-2">
                <span className="font-semibold">Subtotal:</span>
                <span className="font-semibold">₹ {totalAmount.toFixed(2)}</span>
              </div>
              {discountAmount > 0 && (
                <div className="flex justify-between pb-2 text-green-600">
                  <span className="font-semibold">Less: Discount:</span>
                  <span className="font-semibold">-₹ {discountAmount.toFixed(2)}</span>
                </div>
              )}
              <div className="flex justify-between pb-2 border-t pt-2">
                <span className="font-bold">Net Amount:</span>
                <span className="font-bold">₹ {netAmount.toFixed(2)}</span>
              </div>
              <div className="flex justify-between pb-2 text-blue-600">
                <span className="font-semibold">Less: Advance Paid:</span>
                <span className="font-semibold">-₹ {advancePaid.toFixed(2)}</span>
              </div>
              <div className={`flex justify-between pt-2 border-t-2 border-gray-400 ${
                balanceDue > 0 ? 'text-red-600' : 'text-green-600'
              }`}>
                <span className="font-bold text-lg">
                  {balanceDue > 0 ? 'Balance to Pay:' : 'Refund Due:'}
                </span>
                <span className="font-bold text-lg">
                  ₹ {Math.abs(balanceDue).toFixed(2)}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Amount in Words */}
        <div className="mb-6 p-3 bg-gray-50 border rounded text-sm">
          <span className="font-semibold">Amount in Words: </span>
          <span className="uppercase">{balanceDue > 0 ? 'Balance Due' : 'Refund'} {Math.abs(balanceDue).toFixed(2)} Rupees Only</span>
        </div>

        {/* Footer */}
        <div className="border-t-2 pt-6 mt-8">
          <div className="flex justify-between items-end">
            <div>
              <p className="text-sm text-gray-600 mb-2">
                <span className="font-semibold">Payment Status:</span>{" "}
                {balanceDue <= 0 ? (
                  <span className="text-green-600 font-bold">FULLY PAID</span>
                ) : (
                  <span className="text-red-600 font-bold">PENDING</span>
                )}
              </p>
              <p className="text-xs text-gray-500 italic">
                Thank you for choosing our hospital. Wishing you a speedy recovery!
              </p>
            </div>
            <div className="text-center">
              <div className="border-t-2 border-gray-800 w-48 mt-12 pt-2">
                <p className="text-sm font-semibold">Authorized Signatory</p>
                <p className="text-xs text-gray-600">Accounts Department</p>
              </div>
            </div>
          </div>
        </div>

        {/* Important Note */}
        <div className="mt-6 p-3 bg-yellow-50 border border-yellow-300 rounded text-xs">
          <p className="font-semibold mb-1">Important Notes:</p>
          <ul className="list-disc list-inside space-y-1 text-gray-700">
            <li>This is a computer-generated bill and does not require a signature.</li>
            <li>Please verify all details before leaving the hospital.</li>
            <li>Keep this bill safe for insurance claims and future reference.</li>
            {balanceDue < 0 && (
              <li className="text-green-700 font-semibold">
                Refund of ₹{Math.abs(balanceDue).toFixed(2)} will be processed within 2-3 working days.
              </li>
            )}
          </ul>
        </div>
      </div>

      <style jsx>{`
        @media print {
          @page {
            size: A4;
            margin: 0.5cm;
          }
          body {
            print-color-adjust: exact;
            -webkit-print-color-adjust: exact;
          }
        }
      `}</style>
    </div>
  )
}
