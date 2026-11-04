import { prisma } from "@/lib/prisma"
import { notFound } from "next/navigation"
import { format } from "date-fns"
import { PrintSummaryClient } from "@/components/ipd/print-summary-client"

interface PrintSummaryPageProps {
  params: Promise<{ id: string }>
}

export default async function PrintSummaryPage({ params }: PrintSummaryPageProps) {
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

  if (!visit) {
    notFound()
  }

  let age: string = "—"
  if (visit.patient!.dateOfBirth) {
    const dob = new Date(visit.patient!.dateOfBirth)
    const years = Math.floor((new Date().getTime() - dob.getTime()) / (1000 * 60 * 60 * 24 * 365.25))
    age = `${years} Y`
  }

  const d = {
    patientName: visit.patient!.user.name || "—",
    patientRegNo: visit.patient!.patientId,
    patientId: visit.patient!.patientId,
    ageSex: `${age} / ${visit.patient!.gender || "—"}`,
    age: age,
    gender: visit.patient!.gender || "—",
    bloodGroup: visit.patient!.bloodGroup || "—",
    address: [visit.patient!.address, visit.patient!.city, visit.patient!.state].filter(Boolean).join(", ") || "—",
    phone: visit.patient!.phone || visit.patient!.user.phone || "—",
    primaryDoctor: visit.assignedDoctor ? `Dr. ${visit.assignedDoctor.user.name || "—"}` : "—",
    doctorName: visit.assignedDoctor?.user.name || "—",
    doctorSpecialization: "Emergency Doctor",
    admissionDate: visit.arrivalTime,
    dischargeDate: visit.dischargeTime || new Date(),
    daysAdmitted: 0,
    wardName: visit.bed?.ward.name || "—",
    bedNumber: visit.bed?.bedNumber || "—",
    wardBed: visit.bed ? `${visit.bed.ward.name} / ${visit.bed.bedNumber}` : "—",
    finalDiagnosis: visit.chiefComplaint || "—",
    proceduresDone: "—",
    courseInHospital: visit.vitalsRecorded ? `Vitals recorded: ${visit.vitalsRecorded}` : "—",
    treatmentGiven: "—",
    conditionAtDischarge: visit.status === "DISCHARGED" ? "Stable" : "—",
    adviceOnDischarge: "—",
    followUpDate: null,
    activeMedications: [] as Array<{name: string, dose: string, frequency: string, duration: string, route: string}>,
    completedInvestigations: [] as Array<{testName: string, type: string, result: string}>,
  }

  // Format dates for display
  const admissionDateStr = format(new Date(d.admissionDate), "dd/MM/yyyy, hh:mm a")
  const dischargeDateStr = d.dischargeDate
    ? format(new Date(d.dischargeDate), "dd/MM/yyyy, hh:mm a")
    : format(new Date(), "dd/MM/yyyy, hh:mm a")
  const followUpStr = d.followUpDate
    ? format(new Date(d.followUpDate as any), "dd MMMM yyyy")
    : null
  const printDate = format(new Date(), "dd/MM/yyyy, hh:mm a")

  return (
    <PrintSummaryClient>
      <div className="print-page bg-white min-h-screen">
        {/* 
          Print-specific styles.
          Using a <style> tag so they only affect this page and print media.
        */}
        <style>{`
          @media print {
            /* Hide everything in the app shell except our content */
            body * { visibility: hidden !important; }
            .print-page, .print-page * { visibility: visible !important; }
            .print-page {
              position: absolute !important;
              left: 0 !important;
              top: 0 !important;
              width: 100% !important;
              padding: 0 !important;
              margin: 0 !important;
            }
            .no-print { display: none !important; }
            @page {
              size: A4;
              margin: 15mm 12mm;
            }
          }
          /* Screen preview — simulate A4 */
          @media screen {
            .print-page {
              max-width: 794px;
              margin: 24px auto;
              padding: 48px 40px;
              box-shadow: 0 2px 20px rgba(0,0,0,0.1);
              border: 1px solid #e5e7eb;
              border-radius: 4px;
              font-family: 'Times New Roman', Times, Georgia, serif;
            }
          }
          .print-page {
            font-family: 'Times New Roman', Times, Georgia, serif;
            color: #111;
            line-height: 1.6;
            font-size: 13px;
          }
          .print-page h1 { font-size: 22px; }
          .print-page h2 { font-size: 15px; }
          .print-page h3 { font-size: 13px; font-weight: 700; }
          .print-page table { border-collapse: collapse; width: 100%; }
          .print-page table th,
          .print-page table td { padding: 4px 8px; text-align: left; border: 1px solid #d1d5db; font-size: 12px; }
          .print-page table th { background: #f3f4f6; font-weight: 600; }
          .section-title {
            font-weight: 700;
            font-size: 13px;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            border-bottom: 2px solid #1e40af;
            padding-bottom: 4px;
            margin-bottom: 8px;
            margin-top: 20px;
            color: #1e3a5f;
          }
          .field-label { font-weight: 700; min-width: 160px; }
          .dotted-line { border-bottom: 1px dotted #999; padding-bottom: 2px; }
        `}</style>

        {/* =============================== */}
        {/* HEADER — Hospital Letterhead */}
        {/* =============================== */}
        <div style={{ borderBottom: "3px double #1e40af", paddingBottom: "12px", marginBottom: "16px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
            {/* Left: Hospital Info */}
            <div>
              <h1 style={{ margin: 0, color: "#1e40af", fontWeight: 800, letterSpacing: "1px" }}>
                SHREE KAMAL HOSPITAL
              </h1>
              <p style={{ margin: "2px 0", fontSize: "11px", color: "#555" }}>
                Multi-Speciality Hospital & Diagnostic Centre
              </p>
              <p style={{ margin: "2px 0", fontSize: "11px", color: "#555" }}>
                Rourkela, Odisha — Phone: +91 XXXXX XXXXX
              </p>
            </div>
            {/* Right: Document Type */}
            <div style={{ textAlign: "right" }}>
              <h2 style={{
                margin: 0,
                border: "2px solid #1e40af",
                padding: "6px 16px",
                color: "#1e40af",
                fontWeight: 700,
                letterSpacing: "2px",
                fontSize: "14px",
              }}>
                DISCHARGE SUMMARY
              </h2>
              <p style={{ margin: "4px 0 0 0", fontSize: "10px", color: "#777" }}>
                Date: {printDate}
              </p>
            </div>
          </div>
        </div>

        {/* =============================== */}
        {/* PATIENT DETAILS TABLE */}
        {/* =============================== */}
        <table style={{ marginBottom: "8px" }}>
          <tbody>
            <tr>
              <td style={{ width: "25%", background: "#f9fafb" }}>
                <span className="field-label">Patient Name</span>
              </td>
              <td style={{ width: "25%" }}>{d.patientName}</td>
              <td style={{ width: "25%", background: "#f9fafb" }}>
                <span className="field-label">Patient ID</span>
              </td>
              <td style={{ width: "25%" }}>{d.patientId}</td>
            </tr>
            <tr>
              <td style={{ background: "#f9fafb" }}>
                <span className="field-label">Age / Gender</span>
              </td>
              <td>
                {d.age ? `${d.age} years` : "—"} / {d.gender || "—"}
              </td>
              <td style={{ background: "#f9fafb" }}>
                <span className="field-label">Blood Group</span>
              </td>
              <td>{d.bloodGroup || "—"}</td>
            </tr>
            <tr>
              <td style={{ background: "#f9fafb" }}>
                <span className="field-label">Bed / Ward</span>
              </td>
              <td>
                {d.bedNumber} / {d.wardName}
              </td>
              <td style={{ background: "#f9fafb" }}>
                <span className="field-label">Phone</span>
              </td>
              <td>{d.phone || "—"}</td>
            </tr>
            <tr>
              <td style={{ background: "#f9fafb" }}>
                <span className="field-label">Date of Admission</span>
              </td>
              <td>{admissionDateStr}</td>
              <td style={{ background: "#f9fafb" }}>
                <span className="field-label">Date of Discharge</span>
              </td>
              <td>{dischargeDateStr}</td>
            </tr>
            <tr>
              <td style={{ background: "#f9fafb" }}>
                <span className="field-label">Duration of Stay</span>
              </td>
              <td>{d.daysAdmitted} day(s)</td>
              <td style={{ background: "#f9fafb" }}>
                <span className="field-label">Treating Doctor</span>
              </td>
              <td>
                Dr. {d.doctorName}
                {d.doctorSpecialization ? ` (${d.doctorSpecialization})` : ""}
              </td>
            </tr>
            {d.address && (
              <tr>
                <td style={{ background: "#f9fafb" }}>
                  <span className="field-label">Address</span>
                </td>
                <td colSpan={3}>{d.address}</td>
              </tr>
            )}
          </tbody>
        </table>

        {/* =============================== */}
        {/* DIAGNOSIS */}
        {/* =============================== */}
        {d.finalDiagnosis && (
          <div>
            <p className="section-title">Diagnosis</p>
            <p style={{ whiteSpace: "pre-line" }}>{d.finalDiagnosis}</p>
          </div>
        )}

        {/* =============================== */}
        {/* PROCEDURES */}
        {/* =============================== */}
        {d.proceduresDone && (
          <div>
            <p className="section-title">Procedures / Surgeries</p>
            <p style={{ whiteSpace: "pre-line" }}>{d.proceduresDone}</p>
          </div>
        )}

        {/* =============================== */}
        {/* CLINICAL COURSE */}
        {/* =============================== */}
        {d.courseInHospital && (
          <div>
            <p className="section-title">Case Summary / Clinical Course</p>
            <p style={{ whiteSpace: "pre-line" }}>{d.courseInHospital}</p>
          </div>
        )}

        {/* =============================== */}
        {/* TREATMENT GIVEN */}
        {/* =============================== */}
        {d.treatmentGiven && (
          <div>
            <p className="section-title">Treatment Given</p>
            <p style={{ whiteSpace: "pre-line" }}>{d.treatmentGiven}</p>
          </div>
        )}

        {/* =============================== */}
        {/* INVESTIGATIONS */}
        {/* =============================== */}
        {d.completedInvestigations && d.completedInvestigations.length > 0 && (
          <div>
            <p className="section-title">Investigations Done</p>
            <table>
              <thead>
                <tr>
                  <th style={{ width: "5%" }}>#</th>
                  <th style={{ width: "25%" }}>Test Name</th>
                  <th style={{ width: "15%" }}>Type</th>
                  <th>Result / Findings</th>
                </tr>
              </thead>
              <tbody>
                {d.completedInvestigations.map((inv, i) => (
                  <tr key={i}>
                    <td>{i + 1}</td>
                    <td>{inv.testName}</td>
                    <td>{inv.type}</td>
                    <td style={{ whiteSpace: "pre-line", fontSize: "11px" }}>
                      {inv.result || "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* =============================== */}
        {/* MEDICATIONS AT DISCHARGE */}
        {/* =============================== */}
        {d.activeMedications && d.activeMedications.length > 0 && (
          <div>
            <p className="section-title">Medications at Discharge</p>
            <table>
              <thead>
                <tr>
                  <th style={{ width: "5%" }}>#</th>
                  <th>Medicine</th>
                  <th>Dosage</th>
                  <th>Frequency</th>
                  <th>Duration</th>
                  <th>Instructions</th>
                </tr>
              </thead>
              <tbody>
                {d.activeMedications.map((med, i) => (
                  <tr key={i}>
                    <td>{i + 1}</td>
                    <td>{med.name}</td>
                    <td>{med.dose}</td>
                    <td>{med.frequency}</td>
                    <td>{med.duration}</td>
                    <td>{med.route || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* =============================== */}
        {/* CONDITION AT DISCHARGE */}
        {/* =============================== */}
        {d.conditionAtDischarge && (
          <div>
            <p className="section-title">Condition at Discharge</p>
            <p style={{ whiteSpace: "pre-line" }}>{d.conditionAtDischarge}</p>
          </div>
        )}

        {/* =============================== */}
        {/* ADVICE ON DISCHARGE */}
        {/* =============================== */}
        {d.adviceOnDischarge && (
          <div>
            <p className="section-title">Advice on Discharge</p>
            <p style={{ whiteSpace: "pre-line" }}>{d.adviceOnDischarge}</p>
          </div>
        )}

        {/* =============================== */}
        {/* FOLLOW-UP */}
        {/* =============================== */}
        {followUpStr && (
          <div style={{ marginTop: "16px" }}>
            <p style={{ fontSize: "13px" }}>
              <strong>Follow-up Appointment:</strong>{" "}
              <span style={{ color: "#1e40af", fontWeight: 600 }}>{followUpStr}</span>
            </p>
          </div>
        )}

        {/* =============================== */}
        {/* FOOTER — Signatures & Disclaimer */}
        {/* =============================== */}
        <div style={{
          marginTop: "40px",
          paddingTop: "16px",
          borderTop: "2px solid #1e40af",
        }}>
          {/* Signature Row */}
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "24px" }}>
            <div style={{ textAlign: "center" }}>
              <div className="dotted-line" style={{ width: "200px", marginBottom: "4px" }}>&nbsp;</div>
              <p style={{ fontSize: "12px", fontWeight: 600, margin: 0 }}>
                Dr. {d.doctorName}
              </p>
              {d.doctorSpecialization && (
                <p style={{ fontSize: "10px", color: "#666", margin: 0 }}>
                  {d.doctorSpecialization}
                  {(d as any).doctorDepartment ? `, ${(d as any).doctorDepartment}` : ""}
                </p>
              )}
              <p style={{ fontSize: "10px", color: "#666", margin: 0 }}>
                Treating Doctor
              </p>
            </div>
            <div style={{ textAlign: "center" }}>
              <div className="dotted-line" style={{ width: "200px", marginBottom: "4px" }}>&nbsp;</div>
              <p style={{ fontSize: "12px", fontWeight: 600, margin: 0 }}>
                Authorized Signatory
              </p>
              <p style={{ fontSize: "10px", color: "#666", margin: 0 }}>
                Shree Kamal Hospital
              </p>
            </div>
          </div>

          {/* Disclaimer */}
          <div style={{
            textAlign: "center",
            fontSize: "10px",
            color: "#888",
            borderTop: "1px solid #e5e7eb",
            paddingTop: "8px",
          }}>
            <p style={{ margin: "2px 0" }}>
              This is an electronically generated discharge summary from the Shree Kamal Hospital Management System.
            </p>
            <p style={{ margin: "2px 0" }}>
              For queries, contact the hospital reception or the treating doctor.
            </p>
          </div>
        </div>
      </div>
    </PrintSummaryClient>
  )
}
