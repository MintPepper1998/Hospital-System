import { prisma } from "@/lib/prisma"
import { notFound } from "next/navigation"
import { format } from "date-fns"
import { AdmissionFormsPrintClient } from "@/components/ipd/admission-forms-print-client"
import { getHospitalSettings } from "@/app/actions/settings"

interface PageProps {
  params: Promise<{ admissionId: string }>
}

export default async function AdmissionFormsPrintPage({ params }: PageProps) {
  const { admissionId } = await params

  if (!admissionId) {
    notFound()
  }

  const admission = await prisma.iPDAdmission.findUnique({
    where: { id: admissionId },
    include: {
      patient: {
        include: { user: true },
      },
      primaryDoctor: {
        include: { user: true },
      },
      bed: {
        include: { ward: true },
      },
    },
  })

  if (!admission) {
    notFound()
  }

  // Calculate age
  let age: string = "—"
  if (admission.patient.dateOfBirth) {
    const dob = new Date(admission.patient.dateOfBirth)
    const years = Math.floor(
      (new Date().getTime() - dob.getTime()) / (1000 * 60 * 60 * 24 * 365.25)
    )
    age = `${years} Y`
  }

  const patientData = {
    regdNo: admission.patient.patientId,
    name: admission.patient.user.name || "—",
    bedNo: `${admission.bed.bedNumber} (${admission.bed.ward.name})`,
    ageSex: `${age} / ${admission.patient.gender || "—"}`,
    doctor: `Dr. ${admission.primaryDoctor.user.name || "—"}`,
    doa: format(new Date(admission.admissionDate), "dd/MM/yyyy, hh:mm a"),
    diagnosis: admission.diagnosis || admission.reason || "—",
    wardName: admission.bed.ward.name,
  }

  const hospitalSettings = await getHospitalSettings()

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
            margin: 0;
          }
          .print-page {
            padding: 10mm 8mm;
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
          border: 1.5px solid #1e3a8a;
          padding: 4px 6px;
          text-align: left;
          font-size: 11px;
          vertical-align: top;
          color: #1e3a8a;
        }
        .print-area table th {
          background: #eff6ff;
          color: #1e3a8a;
          font-weight: 700;
          font-size: 10px;
          text-transform: uppercase;
          letter-spacing: 0.3px;
        }
        .chart-row.empty-chart-row td {
          height: 600px;
          min-height: 600px;
        }
        .form-title {
          text-align: center;
          font-size: 16px;
          font-weight: 700;
          text-decoration: underline;
          text-transform: uppercase;
          letter-spacing: 1px;
          margin: 12px 0 10px 0;
          color: #1e3a8a;
        }
      `}</style>

      <div className="print-area">
        {/* ═══════════════════════════════════════════ */}
        {/*  PAGE 1: NURSES CHART                      */}
        {/* ═══════════════════════════════════════════ */}
        <div className="print-page">
          <FormHeader patient={patientData} settings={hospitalSettings} />
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
              <tr className="chart-row empty-chart-row">
                <td></td>
                <td></td>
                <td></td>
                <td></td>
                <td></td>
                <td></td>
              </tr>
            </tbody>
          </table>
        </div>
        <div className="page-break" />

        {/* ═══════════════════════════════════════════ */}
        {/*  PAGE 2: PATIENT TREATMENT SHEET            */}
        {/* ═══════════════════════════════════════════ */}
        <div className="print-page">
          <FormHeader patient={patientData} settings={hospitalSettings} />
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
              <tr className="chart-row empty-chart-row">
                <td></td>
                <td></td>
                <td></td>
              </tr>
            </tbody>
          </table>
        </div>
        <div className="page-break" />

        {/* ═══════════════════════════════════════════ */}
        {/*  PAGE 3: CONTINUATION SHEET                 */}
        {/* ═══════════════════════════════════════════ */}
        <div className="print-page">
          <FormHeader patient={patientData} settings={hospitalSettings} />
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
              <tr className="chart-row empty-chart-row">
                <td></td>
                <td></td>
                <td></td>
                <td></td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* ═══════════════════════════════════════════ */}
        {/*  PAGE 4: INTAKE / OUTPUT CHART              */}
        {/* ═══════════════════════════════════════════ */}
        <div className="page-break" />
        <div className="print-page">
          <FormHeader patient={patientData} settings={hospitalSettings} />
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
              <tr className="chart-row empty-chart-row">
                <td></td>
                <td></td>
                <td></td>
                <td></td>
                <td></td>
                <td></td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* ═══════════════════════════════════════════ */}
        {/*  PAGE 5: VITAL SIGNS CHART                  */}
        {/* ═══════════════════════════════════════════ */}
        <div className="page-break" />
        <div className="print-page">
          <FormHeader patient={patientData} settings={hospitalSettings} />
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
              <tr className="chart-row empty-chart-row">
                <td></td>
                <td></td>
                <td></td>
                <td></td>
                <td></td>
                <td></td>
                <td></td>
                <td></td>
              </tr>
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

function FormHeader({ patient, settings }: { patient: PatientInfo, settings?: any }) {
  return (
    <div className="mb-6 flex flex-col gap-4">
      {/* 1. EDITORIAL HOSPITAL HEADER */}
      <div className="flex items-end justify-between border-b-[2px] border-blue-900/15 pb-4">
        
        {/* Logo & Identity */}
        <div className="flex items-center gap-5">
          {settings?.logoUrl && (
            <div className="w-16 h-16 rounded-[14px] bg-white border-[1.5px] border-slate-100 shadow-sm flex items-center justify-center p-2.5 shrink-0 relative">
              <div className="absolute inset-0 rounded-[12px] shadow-[inset_0_1px_2px_rgba(0,0,0,0.05)] pointer-events-none"></div>
              <img 
                src={settings.logoUrl} 
                alt="Logo" 
                className="max-h-full object-contain" 
              />
            </div>
          )}
          <div className="flex flex-col justify-center">
            <h1 className="text-3xl font-black tracking-tight text-blue-950 uppercase leading-none mb-1">
              {settings?.name || "Shree Kamal Hospital"}
            </h1>
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
              {settings?.address || "Multi-Speciality Hospital & Diagnostic Centre • Odisha"}
            </p>
          </div>
        </div>

        {/* Contact Module (Aligned Right) */}
        <div className="flex flex-col items-end gap-1.5 text-[9px] font-bold text-slate-400 text-right uppercase tracking-[0.15em]">
           <div className="flex items-center gap-2.5">
              <span>{settings?.phone || "+91 XXXXX XXXXX"}</span>
              <span className="w-[3px] h-[3px] rounded-full bg-blue-500/40"></span>
              <span>{settings?.email || "info@shreekamal.com"}</span>
           </div>
           {settings?.website && <div>{settings.website}</div>}
        </div>
      </div>

      {/* 2. DOUBLE-BEZEL PATIENT INFO GRID */}
      {/* Outer Shell */}
      <div className="rounded-xl border-[1.5px] border-blue-900/10 p-[5px] bg-slate-50">
        {/* Inner Core */}
        <div className="rounded-lg border-[1.5px] border-blue-900/5 bg-white overflow-hidden shadow-[inset_0_1px_3px_rgba(0,0,0,0.02)]">
          <table className="w-full text-left text-[11px] border-collapse !border-0">
            <tbody>
              
              {/* Row 1 */}
              <tr className="border-b-[1.5px] border-slate-100">
                <th className="!border-0 py-2.5 px-4 bg-slate-50/50 font-extrabold text-blue-900/60 uppercase tracking-[0.1em] w-[14%] border-r-[1.5px] border-slate-100/80">Regd. No.</th>
                <td className="!border-0 py-2.5 px-4 font-bold text-slate-900 w-[18%] border-r-[1.5px] border-slate-100/80">{patient.regdNo}</td>
                
                <th className="!border-0 py-2.5 px-4 bg-slate-50/50 font-extrabold text-blue-900/60 uppercase tracking-[0.1em] w-[11%] border-r-[1.5px] border-slate-100/80">Name</th>
                <td className="!border-0 py-2.5 px-4 font-black text-blue-950 text-[12px] w-[28%] border-r-[1.5px] border-slate-100/80">{patient.name}</td>
                
                <th className="!border-0 py-2.5 px-4 bg-slate-50/50 font-extrabold text-blue-900/60 uppercase tracking-[0.1em] w-[11%] border-r-[1.5px] border-slate-100/80">Bed No.</th>
                <td className="!border-0 py-2.5 px-4 font-bold text-slate-900 w-[18%]">{patient.bedNo}</td>
              </tr>
              
              {/* Row 2 */}
              <tr className="border-b-[1.5px] border-slate-100">
                <th className="!border-0 py-2.5 px-4 bg-slate-50/50 font-extrabold text-blue-900/60 uppercase tracking-[0.1em] border-r-[1.5px] border-slate-100/80">Age / Sex</th>
                <td className="!border-0 py-2.5 px-4 font-bold text-slate-900 border-r-[1.5px] border-slate-100/80">{patient.ageSex}</td>
                
                <th className="!border-0 py-2.5 px-4 bg-slate-50/50 font-extrabold text-blue-900/60 uppercase tracking-[0.1em] border-r-[1.5px] border-slate-100/80">Doctor</th>
                <td className="!border-0 py-2.5 px-4 font-bold text-slate-900 border-r-[1.5px] border-slate-100/80">{patient.doctor}</td>
                
                <th className="!border-0 py-2.5 px-4 bg-slate-50/50 font-extrabold text-blue-900/60 uppercase tracking-[0.1em] border-r-[1.5px] border-slate-100/80">Date of Adm.</th>
                <td className="!border-0 py-2.5 px-4 font-bold text-slate-900">{patient.doa}</td>
              </tr>
              
              {/* Row 3 */}
              <tr>
                <th className="!border-0 py-2.5 px-4 bg-slate-50/50 font-extrabold text-blue-900/60 uppercase tracking-[0.1em] border-r-[1.5px] border-slate-100/80">Diagnosis</th>
                <td colSpan={5} className="!border-0 py-2.5 px-4 font-bold text-slate-900">{patient.diagnosis}</td>
              </tr>

            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
