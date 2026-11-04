"use client"

import { useRef, useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Printer, Plus, Minus, ArrowLeft } from "lucide-react"
import Link from "next/link"

interface PassData {
  patientName: string
  patientId: string
  age: string
  gender: string
  doctorName: string
  wardName: string
  bedNumber: string
  wardType: string
  admissionDate: string
  admissionTime: string
  isBsky: boolean
  paymentType: string
}

interface VisitorPassClientProps {
  passData: PassData
  copies: number
}

export function VisitorPassClient({ passData, copies: initialCopies }: VisitorPassClientProps) {
  const [copies, setCopies] = useState(initialCopies)
  const [visitorName, setVisitorName] = useState("")
  const [relation, setRelation] = useState("")
  const printRef = useRef<HTMLDivElement>(null)

  function handlePrint() {
    window.print()
  }

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Screen-only controls */}
      <div className="print:hidden max-w-3xl mx-auto p-6 space-y-6">
        <div className="flex items-center gap-4">
          <Link href="/dashboard/ipd">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div>
            <h2 className="text-2xl font-bold text-blue-600">Visitor / Attendant Pass</h2>
            <p className="text-sm text-muted-foreground">Print visitor passes for {passData.patientName}</p>
          </div>
        </div>

        {/* Controls Card */}
        <div className="bg-white rounded-xl shadow-sm border p-5 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>Visitor / Attendant Name</Label>
              <Input
                value={visitorName}
                onChange={(e) => setVisitorName(e.target.value)}
                placeholder="e.g. Ramesh Kumar"
              />
            </div>
            <div className="space-y-2">
              <Label>Relation with Patient</Label>
              <Input
                value={relation}
                onChange={(e) => setRelation(e.target.value)}
                placeholder="e.g. Father, Spouse"
              />
            </div>
            <div className="space-y-2">
              <Label>Number of Copies</Label>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="icon"
                  className="h-9 w-9"
                  onClick={() => setCopies(Math.max(1, copies - 1))}
                >
                  <Minus className="h-4 w-4" />
                </Button>
                <Input
                  type="number"
                  min={1}
                  max={10}
                  value={copies}
                  onChange={(e) => setCopies(Math.min(10, Math.max(1, parseInt(e.target.value) || 1)))}
                  className="text-center w-16"
                />
                <Button
                  variant="outline"
                  size="icon"
                  className="h-9 w-9"
                  onClick={() => setCopies(Math.min(10, copies + 1))}
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>

          <Button
            onClick={handlePrint}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white h-11"
          >
            <Printer className="h-5 w-5 mr-2" />
            Print {copies} Pass{copies > 1 ? "es" : ""}
          </Button>
        </div>

        {/* Preview Label */}
        <p className="text-xs text-muted-foreground text-center">
          ↓ Print Preview — the passes below will be printed on paper
        </p>
      </div>

      {/* Printable Passes */}
      <div ref={printRef} className="print-passes max-w-3xl mx-auto px-6 pb-6 print:p-0 print:max-w-none">
        {Array.from({ length: copies }).map((_, idx) => (
          <VisitorPassCard
            key={idx}
            data={passData}
            visitorName={visitorName}
            relation={relation}
            passNumber={idx + 1}
          />
        ))}
      </div>

      {/* Print Styles */}
      <style jsx global>{`
        @media print {
          body * {
            visibility: hidden;
          }
          .print-passes,
          .print-passes * {
            visibility: visible !important;
          }
          .print-passes {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
          }
          .visitor-pass-card {
            page-break-inside: avoid;
            break-inside: avoid;
            margin: 0 auto;
          }
          @page {
            size: A5;
            margin: 8mm;
          }
        }
      `}</style>
    </div>
  )
}

/* -------------------------------------------------------
   VISITOR PASS CARD — print-friendly, matches hospital format
   ------------------------------------------------------- */
function VisitorPassCard({
  data,
  visitorName,
  relation,
  passNumber,
}: {
  data: PassData
  visitorName: string
  relation: string
  passNumber: number
}) {
  const today = new Date()
  const dateStr = today.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  })
  const timeStr = today.toLocaleTimeString("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  })

  return (
    <div
      className="visitor-pass-card bg-white border-2 border-gray-300 rounded-lg overflow-hidden mb-6 print:mb-4 print:rounded-none print:border-black"
      style={{ maxWidth: "420px", margin: "0 auto 24px auto" }}
    >
      {/* ── Top Header Band ── */}
      <div className="bg-gradient-to-r from-blue-700 to-blue-600 text-white px-5 py-3 text-center print:bg-blue-700">
        <div className="flex items-center justify-center gap-2 mb-1">
          <span className="text-2xl">🏥</span>
          <div>
            <h1 className="text-lg font-bold tracking-wide leading-tight">SHREE KAMAL</h1>
            <p className="text-[10px] tracking-wider opacity-90">HOSPITAL & RESEARCH CENTRE</p>
          </div>
        </div>
        <p className="text-[9px] opacity-80 tracking-wide">
          Phone: +91 1234567890 &bull; www.shreekamal.com
        </p>
      </div>

      {/* ── Title ── */}
      <div className="bg-amber-500 text-white text-center py-1.5 print:bg-amber-500">
        <h2 className="text-sm font-extrabold tracking-[0.25em] uppercase">Attendant Pass</h2>
      </div>

      {/* ── Body ── */}
      <div className="px-5 py-4 space-y-3 text-sm">
        {/* Row: IP No. + Patient Name */}
        <div className="grid grid-cols-[110px_1fr] gap-y-2.5">
          <span className="font-semibold text-gray-600 text-xs uppercase tracking-wide">In Patient No.</span>
          <span className="font-bold text-gray-900 border-b border-dashed border-gray-300 pb-0.5">
            {data.patientId}
          </span>

          <span className="font-semibold text-gray-600 text-xs uppercase tracking-wide">Patient Name</span>
          <span className="font-bold text-gray-900 border-b border-dashed border-gray-300 pb-0.5">
            {data.patientName}
          </span>

          <span className="font-semibold text-gray-600 text-xs uppercase tracking-wide">Age / Gender</span>
          <span className="font-bold text-gray-900 border-b border-dashed border-gray-300 pb-0.5">
            {data.age} &bull; {data.gender === "M" ? "Male" : data.gender === "F" ? "Female" : "Other"}
          </span>

          <span className="font-semibold text-gray-600 text-xs uppercase tracking-wide">Doctor</span>
          <span className="font-bold text-gray-900 border-b border-dashed border-gray-300 pb-0.5">
            Dr. {data.doctorName}
          </span>

          <span className="font-semibold text-gray-600 text-xs uppercase tracking-wide">Ward / Room No.</span>
          <span className="font-bold text-gray-900 border-b border-dashed border-gray-300 pb-0.5">
            {data.wardName} — {data.bedNumber}
          </span>

          <span className="font-semibold text-gray-600 text-xs uppercase tracking-wide">DOA</span>
          <span className="font-bold text-gray-900 border-b border-dashed border-gray-300 pb-0.5">
            {data.admissionDate} &bull; {data.admissionTime}
          </span>

          <span className="font-semibold text-gray-600 text-xs uppercase tracking-wide">DOD</span>
          <span className="font-bold text-gray-400 border-b border-dashed border-gray-300 pb-0.5">
            — (Active)
          </span>

          {/* Visitor Info */}
          <span className="font-semibold text-gray-600 text-xs uppercase tracking-wide">Visitor Name</span>
          <span className="font-bold text-gray-900 border-b border-dashed border-gray-300 pb-0.5 min-h-[20px]">
            {visitorName || <span className="text-gray-300">_________________________</span>}
          </span>

          <span className="font-semibold text-gray-600 text-xs uppercase tracking-wide">Relation</span>
          <span className="font-bold text-gray-900 border-b border-dashed border-gray-300 pb-0.5 min-h-[20px]">
            {relation || <span className="text-gray-300">_________________________</span>}
          </span>
        </div>

        {/* Pass metadata */}
        <div className="flex items-center justify-end pt-1">
          <span className="text-[10px] text-gray-500">
            Pass #{passNumber} &bull; Printed: {dateStr} {timeStr}
          </span>
        </div>
      </div>

      {/* ── Signature Section ── */}
      <div className="px-5 pb-4 pt-1">
        <div className="grid grid-cols-2 gap-8">
          <div className="text-center">
            <div className="h-10 border-b border-gray-400 mb-1"></div>
            <p className="text-[10px] text-gray-500 font-medium">Visitor Signature</p>
          </div>
          <div className="text-center">
            <div className="h-10 border-b border-gray-400 mb-1"></div>
            <p className="text-[10px] text-gray-500 font-medium">Authorised Signatory</p>
          </div>
        </div>
      </div>

      {/* ── Bottom Bar ── */}
      <div className="bg-gradient-to-r from-amber-500 to-amber-400 h-2"></div>

      {/* ── Notices ── */}
      <div className="bg-gray-50 px-4 py-2 border-t text-center">
        <p className="text-[8px] text-gray-500 leading-relaxed">
          This pass must be presented at the entrance. Only ONE attendant is permitted per patient at any time.
          Visiting hours: 10:00 AM – 12:00 PM &amp; 4:00 PM – 6:00 PM. Management reserves the right to revoke this pass.
        </p>
      </div>
    </div>
  )
}
