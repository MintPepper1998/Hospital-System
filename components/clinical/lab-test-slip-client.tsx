"use client"

import { Button } from "@/components/ui/button"
import { Printer, ArrowLeft } from "lucide-react"
import Link from "next/link"

interface LabTestSlipData {
  hospitalName: string
  hospitalAddress: string
  hospitalPhone: string
  hospitalEmail: string
  hospitalLogo: string | null
  patientName: string
  patientId: string
  patientAge: string
  patientGender: string
  doctorName: string
  date: string
  time: string
  diagnosis: string
  labTests: {
    name: string
    type: string
    price: number
    status: string
    priority: string
    notes: string | null
  }[]
}

export function LabTestSlipClient({ data }: { data: LabTestSlipData }) {
  const pathologyTests = data.labTests.filter((t) => t.type === "PATHOLOGY")
  const radiologyTests = data.labTests.filter((t) => t.type === "RADIOLOGY")
  const totalCost = data.labTests.reduce((s, t) => s + t.price, 0)

  return (
    <>
      <style jsx>{`
        @media print {
          @page {
            size: A4;
            margin: 15mm;
          }
          body * {
            visibility: hidden;
          }
          #lab-slip-print,
          #lab-slip-print * {
            visibility: visible;
          }
          #lab-slip-print {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
          }
        }
      `}</style>

      <div className="min-h-screen bg-gray-100">
        {/* Action Bar - hidden in print */}
        <div className="print:hidden flex items-center justify-between bg-white border-b px-6 py-3 sticky top-0 z-10 shadow-sm">
          <Link href="/dashboard/clinical/emr">
            <Button variant="outline" size="sm">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Queue
            </Button>
          </Link>
          <Button
            onClick={() => window.print()}
            className="bg-[#0066CC] hover:bg-[#0052A3] text-white"
          >
            <Printer className="mr-2 h-4 w-4" />
            Print Lab Slip
          </Button>
        </div>

        {/* Printable Area */}
        <div id="lab-slip-print" className="max-w-[800px] mx-auto p-6 print:p-0 print:max-w-full">
          <div className="bg-white rounded-lg shadow-sm print:shadow-none p-8 print:p-6">
          {/* Hospital Header */}
          <div className="flex items-center justify-between border-b-2 border-blue-600 pb-6 mb-6">
            {/* Left: Logo */}
            <div className="w-1/4 flex justify-start">
              {data.hospitalLogo && (
                <img 
                  src={data.hospitalLogo} 
                  alt="Hospital Logo" 
                  className="h-28 w-auto object-contain print:h-32" 
                  referrerPolicy="no-referrer"
                  onError={(e) => {
                    const target = e.currentTarget;
                    if (!target.dataset.fallback) {
                      target.dataset.fallback = "true";
                      target.src = "/shree-kamal-logo.png";
                    }
                  }}
                />
              )}
            </div>
            
            {/* Center: Details */}
            <div className="w-2/4 text-center">
              <h1 className="text-3xl font-bold text-[#0066CC] uppercase tracking-wide">{data.hospitalName}</h1>
              {data.hospitalAddress && (
                <p className="text-sm text-gray-700 mt-1">{data.hospitalAddress}</p>
              )}
              <p className="text-sm text-gray-700 mt-0.5">
                {data.hospitalPhone && `Tel.: ${data.hospitalPhone}`}
                {data.hospitalPhone && data.hospitalEmail && " | "}
                {data.hospitalEmail && `Email: ${data.hospitalEmail}`}
              </p>
              <p className="text-sm font-semibold text-green-600 mt-1">✓ NABH Accredited Hospital</p>
            </div>
            
            {/* Right: Emergency Box */}
            <div className="w-1/4 flex justify-end">
               <div className="bg-red-600 text-white font-bold px-4 py-2 text-sm border border-black shadow-sm">
                 EMERGENCY 1066
               </div>
            </div>
          </div>
          
          {/* Document Title */}
          <div className="text-center mb-6">
            <h2 className="text-xl font-bold text-gray-800 tracking-wide">
              LABORATORY INVESTIGATION SLIP
            </h2>
          </div>

          {/* Patient Info Grid */}
          <div className="grid grid-cols-2 gap-x-8 gap-y-2 mb-6 text-sm">
            <div className="flex gap-2">
              <span className="font-semibold text-gray-600 w-24">Patient:</span>
              <span className="font-bold text-gray-900">{data.patientName}</span>
            </div>
            <div className="flex gap-2">
              <span className="font-semibold text-gray-600 w-24">Patient ID:</span>
              <span className="font-mono text-blue-700 font-bold">{data.patientId}</span>
            </div>
            <div className="flex gap-2">
              <span className="font-semibold text-gray-600 w-24">Age / Gender:</span>
              <span>{data.patientAge} / {data.patientGender}</span>
            </div>
            <div className="flex gap-2">
              <span className="font-semibold text-gray-600 w-24">Date:</span>
              <span>{data.date} at {data.time}</span>
            </div>
            <div className="flex gap-2 col-span-2">
              <span className="font-semibold text-gray-600 w-24">Referred By:</span>
              <span>Dr. {data.doctorName}</span>
            </div>
            <div className="flex gap-2 col-span-2">
              <span className="font-semibold text-gray-600 w-24">Diagnosis:</span>
              <span className="italic">{data.diagnosis}</span>
            </div>
          </div>

          {/* Tests Table */}
          <table className="w-full border-collapse mb-6">
            <thead>
              <tr className="bg-blue-50">
                <th className="border border-gray-300 px-3 py-2 text-left text-xs font-bold text-blue-800 w-10">
                  #
                </th>
                <th className="border border-gray-300 px-3 py-2 text-left text-xs font-bold text-blue-800">
                  Test Name
                </th>
                <th className="border border-gray-300 px-3 py-2 text-center text-xs font-bold text-blue-800 w-24">
                  Type
                </th>
                <th className="border border-gray-300 px-3 py-2 text-right text-xs font-bold text-blue-800 w-20">
                  Price (₹)
                </th>
              </tr>
            </thead>
            <tbody>
              {pathologyTests.length > 0 && (
                <>
                  <tr>
                    <td colSpan={4} className="border border-gray-300 px-3 py-1.5 bg-green-50 text-xs font-bold text-green-800">
                      🔬 Pathology Tests
                    </td>
                  </tr>
                  {pathologyTests.map((test, idx) => (
                    <tr key={`p-${idx}`} className="hover:bg-gray-50">
                      <td className="border border-gray-300 px-3 py-2 text-sm text-center">
                        {idx + 1}
                      </td>
                      <td className="border border-gray-300 px-3 py-2 text-sm font-medium">
                        {test.name}
                      </td>
                      <td className="border border-gray-300 px-3 py-2 text-xs text-center">
                        <span className="px-2 py-0.5 bg-green-100 text-green-700 rounded text-[10px] font-semibold">
                          Pathology
                        </span>
                      </td>
                      <td className="border border-gray-300 px-3 py-2 text-sm text-right font-mono">
                        ₹{test.price.toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </>
              )}
              {radiologyTests.length > 0 && (
                <>
                  <tr>
                    <td colSpan={4} className="border border-gray-300 px-3 py-1.5 bg-purple-50 text-xs font-bold text-purple-800">
                      ☢️ Radiology Tests
                    </td>
                  </tr>
                  {radiologyTests.map((test, idx) => (
                    <tr key={`r-${idx}`} className="hover:bg-gray-50">
                      <td className="border border-gray-300 px-3 py-2 text-sm text-center">
                        {pathologyTests.length + idx + 1}
                      </td>
                      <td className="border border-gray-300 px-3 py-2 text-sm font-medium">
                        {test.name}
                      </td>
                      <td className="border border-gray-300 px-3 py-2 text-xs text-center">
                        <span className="px-2 py-0.5 bg-purple-100 text-purple-700 rounded text-[10px] font-semibold">
                          Radiology
                        </span>
                      </td>
                      <td className="border border-gray-300 px-3 py-2 text-sm text-right font-mono">
                        ₹{test.price.toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </>
              )}
            </tbody>
            <tfoot>
              <tr className="bg-gray-50 font-bold">
                <td colSpan={3} className="border border-gray-300 px-3 py-2 text-sm text-right">
                  Total Estimated Cost:
                </td>
                <td className="border border-gray-300 px-3 py-2 text-sm text-right font-mono text-blue-700">
                  ₹{totalCost.toLocaleString()}
                </td>
              </tr>
            </tfoot>
          </table>

          {/* Instructions */}
          <div className="border border-amber-200 bg-amber-50 rounded-lg p-4 mb-6">
            <h3 className="text-sm font-bold text-amber-800 mb-2">📋 Instructions for Patient:</h3>
            <ul className="text-xs text-amber-900 space-y-1 list-disc list-inside">
              <li>Please visit the billing counter first for payment.</li>
              <li>After payment, proceed to the respective lab/radiology department.</li>
              <li>Carry this slip and your payment receipt.</li>
              <li>Return to the doctor with your test reports for continued consultation.</li>
              <li>Fasting may be required for certain blood tests — ask the lab technician.</li>
            </ul>
          </div>

          {/* Footer */}
          <div className="flex justify-between items-end pt-6 border-t border-gray-200">
            <div className="text-xs text-gray-400">
              <p>Generated on {new Date().toLocaleString("en-IN")}</p>
              <p>This is a computer-generated document.</p>
            </div>
            <div className="text-center">
              <div className="border-t border-gray-400 pt-1 px-8">
                <p className="text-sm font-semibold">Dr. {data.doctorName}</p>
                <p className="text-xs text-gray-500">Referring Doctor</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
    </>
  )
}
