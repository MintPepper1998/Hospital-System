import { prisma } from "@/lib/prisma"
import { notFound } from "next/navigation"
import { format } from "date-fns"
import { AdmissionFormsPrintClient } from "@/components/ipd/admission-forms-print-client"

interface PageProps {
  params: Promise<{ id: string }>
}

export default async function VisitFormsPrintPage({ params }: PageProps) {
  const { id } = await params

  if (!id) {
    notFound()
  }

  const visit = await prisma.emergencyVisit.findUnique({
    where: { id },
    include: {
      patient: {
        include: { user: true },
      },
      assignedDoctor: {
        include: { user: true },
      },
      bed: {
        include: { ward: true },
      },
    },
  })

  if (!visit || !visit.patient) {
    notFound()
  }

  // Calculate age
  let age: string = "—"
  if (visit.patient.dateOfBirth) {
    const dob = new Date(visit.patient.dateOfBirth)
    const years = Math.floor(
      (new Date().getTime() - dob.getTime()) / (1000 * 60 * 60 * 24 * 365.25)
    )
    age = `${years} Y`
  }

  const patientData = {
    regdNo: visit.patient.patientId,
    name: visit.patient.user.name || "—",
    bedNo: visit.bed ? `${visit.bed.bedNumber} (${visit.bed.ward.name})` : "—",
    ageSex: `${age} / ${visit.patient.gender || "—"}`,
    doctor: visit.assignedDoctor ? `Dr. ${visit.assignedDoctor.user.name || "—"}` : "—",
    doa: format(new Date(visit.arrivalTime), "dd/MM/yyyy, hh:mm a"),
    diagnosis: visit.chiefComplaint || "—",
    wardName: visit.bed ? visit.bed.ward.name : "—",
  }

  const EMPTY_ROWS = 20

  return (
    <AdmissionFormsPrintClient>
      {/* Global print styles */}
      <style>{`
        @media print {
          /* Hide everything except our print pages */
          body * { visibility: hidden !important; }
          .print-area, .print-area * { visibility: visible !important; }
          .print-area {
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 100% !important;
            padding: 0 !important;
            margin: 0 !important;
          }
          .no-print { display: none !important; }
          @page {
            size: A4 portrait;
            margin: 10mm 8mm;
          }
          .page-break {
            break-after: always;
            page-break-after: always;
          }
        }
        @media screen {
          .print-area {
            max-width: 794px;
            margin: 0 auto;
          }
          .print-page {
            background: white;
            padding: 32px 28px;
            margin-bottom: 24px;
            box-shadow: 0 1px 10px rgba(0,0,0,0.08);
            border: 1px solid #e5e7eb;
          }
          .page-break {
            /* nothing on screen */
          }
        }
        /* Common print typography */
        .print-area {
          font-family: 'Times New Roman', Times, serif;
          color: #000;
          font-size: 12px;
          line-height: 1.4;
        }
        .print-area table {
          border-collapse: collapse;
          width: 100%;
        }
        .print-area table th,
        .print-area table td {
          border: 1.5px solid #000;
          padding: 4px 6px;
          text-align: left;
          font-size: 11px;
          vertical-align: top;
        }
        .print-area table th {
          background: #f9f9f9;
          font-weight: 700;
          font-size: 10px;
          text-transform: uppercase;
          letter-spacing: 0.3px;
        }
        .chart-row td {
          height: 28px;
          min-height: 28px;
        }
        .form-title {
          text-align: center;
          font-size: 16px;
          font-weight: 700;
          text-decoration: underline;
          text-transform: uppercase;
          letter-spacing: 1px;
          margin: 12px 0 10px 0;
        }
      `}</style>

      <div className="print-area">
        {/* ═══════════════════════════════════════════ */}
        {/*  PAGE 1: NURSES CHART                      */}
        {/* ═══════════════════════════════════════════ */}
        <div className="print-page">
          <FormHeader patient={patientData} />
          <p className="form-title">Nurses Chart</p>

          <table>
            <thead>
              <tr>
                <th style={{ width: "12%" }}>Date</th>
                <th style={{ width: "22%" }}>Drug</th>
                <th style={{ width: "16%" }}>Dose / Route</th>
                <th style={{ width: "20%" }}>Timing</th>
                <th style={{ width: "18%" }}>Others</th>
                <th style={{ width: "12%" }}>Sign</th>
              </tr>
            </thead>
            <tbody>
              {Array.from({ length: EMPTY_ROWS }).map((_, i) => (
                <tr key={`nurse-${i}`} className="chart-row">
                  <td>&nbsp;</td>
                  <td>&nbsp;</td>
                  <td>&nbsp;</td>
                  <td>&nbsp;</td>
                  <td>&nbsp;</td>
                  <td>&nbsp;</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="page-break" />

        {/* ═══════════════════════════════════════════ */}
        {/*  PAGE 2: PATIENT TREATMENT SHEET            */}
        {/* ═══════════════════════════════════════════ */}
        <div className="print-page">
          <FormHeader patient={patientData} />
          <p className="form-title">Patient Treatment Sheet</p>

          <table>
            <thead>
              <tr>
                <th style={{ width: "18%" }}>Date / Time</th>
                <th style={{ width: "47%" }}>Clinical Notes</th>
                <th style={{ width: "35%" }}>Treatment</th>
              </tr>
            </thead>
            <tbody>
              {Array.from({ length: EMPTY_ROWS }).map((_, i) => (
                <tr key={`treatment-${i}`} className="chart-row">
                  <td>&nbsp;</td>
                  <td>&nbsp;</td>
                  <td>&nbsp;</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="page-break" />

        {/* ═══════════════════════════════════════════ */}
        {/*  PAGE 3: CONTINUATION SHEET                 */}
        {/* ═══════════════════════════════════════════ */}
        <div className="print-page">
          <FormHeader patient={patientData} />
          <p className="form-title">Continuation Sheet</p>

          <table>
            <thead>
              <tr>
                <th style={{ width: "18%" }}>Signature,{"\n"}Date &amp; Time</th>
                <th style={{ width: "32%" }}>Observation</th>
                <th style={{ width: "25%" }}>Advice</th>
                <th style={{ width: "25%" }}>Investigation</th>
              </tr>
            </thead>
            <tbody>
              {Array.from({ length: EMPTY_ROWS }).map((_, i) => (
                <tr key={`cont-${i}`} className="chart-row">
                  <td>&nbsp;</td>
                  <td>&nbsp;</td>
                  <td>&nbsp;</td>
                  <td>&nbsp;</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* ═══════════════════════════════════════════ */}
        {/*  PAGE 4: INTAKE / OUTPUT CHART              */}
        {/* ═══════════════════════════════════════════ */}
        <div className="page-break" />
        <div className="print-page">
          <FormHeader patient={patientData} />
          <p className="form-title">Intake / Output Chart</p>

          <table>
            <thead>
              <tr>
                <th style={{ width: "12%" }}>Date</th>
                <th style={{ width: "12%" }}>Time</th>
                <th style={{ width: "20%" }}>Intake (Oral)</th>
                <th style={{ width: "18%" }}>Intake (IV)</th>
                <th style={{ width: "18%" }}>Output (Urine)</th>
                <th style={{ width: "20%" }}>Output (Others)</th>
              </tr>
            </thead>
            <tbody>
              {Array.from({ length: EMPTY_ROWS }).map((_, i) => (
                <tr key={`io-${i}`} className="chart-row">
                  <td>&nbsp;</td>
                  <td>&nbsp;</td>
                  <td>&nbsp;</td>
                  <td>&nbsp;</td>
                  <td>&nbsp;</td>
                  <td>&nbsp;</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* ═══════════════════════════════════════════ */}
        {/*  PAGE 5: VITAL SIGNS CHART                  */}
        {/* ═══════════════════════════════════════════ */}
        <div className="page-break" />
        <div className="print-page">
          <FormHeader patient={patientData} />
          <p className="form-title">Vital Signs Chart</p>

          <table>
            <thead>
              <tr>
                <th style={{ width: "13%" }}>Date</th>
                <th style={{ width: "11%" }}>Time</th>
                <th style={{ width: "14%" }}>Temp (°F)</th>
                <th style={{ width: "14%" }}>Pulse</th>
                <th style={{ width: "14%" }}>BP</th>
                <th style={{ width: "12%" }}>SpO2</th>
                <th style={{ width: "11%" }}>RR</th>
                <th style={{ width: "11%" }}>Sign</th>
              </tr>
            </thead>
            <tbody>
              {Array.from({ length: EMPTY_ROWS }).map((_, i) => (
                <tr key={`vital-${i}`} className="chart-row">
                  <td>&nbsp;</td>
                  <td>&nbsp;</td>
                  <td>&nbsp;</td>
                  <td>&nbsp;</td>
                  <td>&nbsp;</td>
                  <td>&nbsp;</td>
                  <td>&nbsp;</td>
                  <td>&nbsp;</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </AdmissionFormsPrintClient>
  )
}

/* ═══════════════════════════════════════════════════════ */
/*  FORM HEADER — Reusable hospital letterhead + patient  */
/* ═══════════════════════════════════════════════════════ */

interface PatientInfo {
  regdNo: string
  name: string
  bedNo: string
  ageSex: string
  doctor: string
  doa: string
  diagnosis: string
  wardName: string
}

function FormHeader({ patient }: { patient: PatientInfo }) {
  return (
    <div style={{ marginBottom: "8px" }}>
      {/* Hospital Name */}
      <div style={{ textAlign: "center", borderBottom: "2px solid #000", paddingBottom: "6px", marginBottom: "8px" }}>
        <h1 style={{
          margin: 0,
          fontSize: "22px",
          fontWeight: 800,
          letterSpacing: "2px",
          textTransform: "uppercase",
        }}>
          Shree Kamal Hospital
        </h1>
        <p style={{ margin: "1px 0 0 0", fontSize: "10px", color: "#333" }}>
          Multi-Speciality Hospital &amp; Diagnostic Centre &bull; Rourkela, Odisha
        </p>
        <p style={{ margin: "1px 0 0 0", fontSize: "9px", color: "#555" }}>
          Phone: +91 XXXXX XXXXX &bull; Email: info@shreekamal.com
        </p>
      </div>

      {/* Patient Information Grid */}
      <table style={{ marginBottom: "0" }}>
        <tbody>
          <tr>
            <td style={{ width: "16%", fontWeight: 700, fontSize: "10px", background: "#f5f5f5" }}>
              Regd. No.
            </td>
            <td style={{ width: "17%", fontSize: "11px" }}>
              {patient.regdNo}
            </td>
            <td style={{ width: "10%", fontWeight: 700, fontSize: "10px", background: "#f5f5f5" }}>
              Name
            </td>
            <td style={{ width: "24%", fontSize: "11px", fontWeight: 600 }}>
              {patient.name}
            </td>
            <td style={{ width: "12%", fontWeight: 700, fontSize: "10px", background: "#f5f5f5" }}>
              Bed No.
            </td>
            <td style={{ width: "21%", fontSize: "11px" }}>
              {patient.bedNo}
            </td>
          </tr>
          <tr>
            <td style={{ fontWeight: 700, fontSize: "10px", background: "#f5f5f5" }}>
              Age / Sex
            </td>
            <td style={{ fontSize: "11px" }}>
              {patient.ageSex}
            </td>
            <td style={{ fontWeight: 700, fontSize: "10px", background: "#f5f5f5" }}>
              Doctor
            </td>
            <td style={{ fontSize: "11px" }}>
              {patient.doctor}
            </td>
            <td style={{ fontWeight: 700, fontSize: "10px", background: "#f5f5f5" }}>
              Date of Adm.
            </td>
            <td style={{ fontSize: "11px" }}>
              {patient.doa}
            </td>
          </tr>
          <tr>
            <td style={{ fontWeight: 700, fontSize: "10px", background: "#f5f5f5" }}>
              Diagnosis
            </td>
            <td colSpan={5} style={{ fontSize: "11px" }}>
              {patient.diagnosis}
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  )
}
