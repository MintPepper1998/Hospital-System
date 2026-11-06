import { getDischargeSummary } from "@/app/actions/discharge-summary"
import { getHospitalSettings } from "@/app/actions/settings"
import { notFound } from "next/navigation"
import { format } from "date-fns"
import { PrintSummaryClient } from "@/components/ipd/print-summary-client"
import { prisma } from "@/lib/prisma"

interface PrintSummaryPageProps {
  params: Promise<{ id: string }>
}

export default async function PrintSummaryPage({ params }: PrintSummaryPageProps) {
  const { id: admissionId } = await params

  if (!admissionId) {
    notFound()
  }

  const result = await getDischargeSummary({ admissionId })
  const settings = await getHospitalSettings()

  if (!result.success || !result.data) {
    notFound()
  }

  const d = result.data

  // Format dates for display
  const admissionDateStr = format(new Date(d.admissionDate), "dd/MM/yyyy, hh:mm a")
  const dischargeDateStr = d.dischargeDate
    ? format(new Date(d.dischargeDate), "dd/MM/yyyy, hh:mm a")
    : format(new Date(), "dd/MM/yyyy, hh:mm a")
  const followUpStr = d.followUpDate
    ? format(new Date(d.followUpDate), "dd MMMM yyyy")
    : null
  const printDate = format(new Date(), "dd/MM/yyyy, hh:mm a")

  const dischargeTypesConfig = await prisma.dischargeTypeConfig.findMany({
    where: { isActive: true }
  })
  const selectedType = dischargeTypesConfig.find(t => t.code === (d as any).dischargeTypeCode)

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
              padding: 15mm 12mm !important; /* Move margin to padding to avoid browser headers */
              margin: 0 !important;
            }
            .no-print { display: none !important; }
            @page {
              size: A4;
              margin: 0mm; /* This removes the browser headers/footers */
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
            line-height: 1.4;
            font-size: 11px;
          }
          .print-page h1 { font-size: 20px; }
          .print-page h2 { font-size: 14px; }
          .print-page h3 { font-size: 12px; font-weight: 700; }
          .print-page table { border-collapse: collapse; width: 100%; }
          .print-page table th,
          .print-page table td { padding: 3px 6px; text-align: left; border: 1px solid #d1d5db; font-size: 10px; }
          .print-page table th { background: #f3f4f6; font-weight: 600; }
          .section-title {
            font-weight: 700;
            font-size: 11px;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            border-bottom: 2px solid #1e40af;
            padding-bottom: 2px;
            margin-bottom: 6px;
            margin-top: 12px;
            color: #1e3a5f;
          }
          .field-label { font-weight: 700; min-width: 140px; }
          .dotted-line { border-bottom: 1px dotted #999; padding-bottom: 2px; }
        `}</style>

        {/* =============================== */}
        {/* HEADER — Hospital Letterhead */}
        {/* =============================== */}
        <div style={{ borderBottom: "3px double #1e40af", paddingBottom: "10px", marginBottom: "12px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            {/* Left: Hospital Info with Logo */}
            <div style={{ display: "flex", gap: "16px", alignItems: "center" }}>
              {settings.logoUrl && (
                <div style={{ width: "64px", height: "64px", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img 
                    src={settings.logoUrl} 
                    alt="Hospital Logo" 
                    style={{ maxWidth: "100%", maxHeight: "100%", objectFit: "contain" }} 
                  />
                </div>
              )}
              <div>
                <h1 style={{ margin: 0, color: "#1e40af", fontWeight: 800, letterSpacing: "1px", textTransform: "uppercase" }}>
                  {settings.name || "SHREE KAMAL HOSPITAL"}
                </h1>
                <p style={{ margin: "2px 0", fontSize: "10px", color: "#555" }}>
                  Multi-Speciality Hospital & Diagnostic Centre
                </p>
                <p style={{ margin: "2px 0", fontSize: "10px", color: "#555" }}>
                  {settings.address} — Phone: {settings.phone}
                </p>
                {settings.gstNo && (
                  <p style={{ margin: "2px 0", fontSize: "9px", color: "#777" }}>
                    GSTIN: {settings.gstNo}
                  </p>
                )}
              </div>
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
        {/* DYNAMIC OR FALLBACK SECTIONS */}
        {/* =============================== */}
        {selectedType?.templateSections && Array.isArray(selectedType.templateSections) && selectedType.templateSections.length > 0 ? (
          <>
            {selectedType.templateSections.map((section: any) => {
              const customData = (d as any).customDischargeData as any;
              const val = customData?.[section.sectionKey] || (d as any)[section.sectionKey];
              if (!val) return null;
              return (
                <div key={section.sectionKey}>
                  <p className="section-title">{section.sectionLabel}</p>
                  <p style={{ whiteSpace: "pre-line" }}>{val}</p>
                </div>
              )
            })}
          </>
        ) : (
          <>
            {d.finalDiagnosis && (
              <div>
                <p className="section-title">Diagnosis</p>
                <p style={{ whiteSpace: "pre-line" }}>{d.finalDiagnosis}</p>
              </div>
            )}
            {d.proceduresDone && (
              <div>
                <p className="section-title">Procedures / Surgeries</p>
                <p style={{ whiteSpace: "pre-line" }}>{d.proceduresDone}</p>
              </div>
            )}
            {d.courseInHospital && (
              <div>
                <p className="section-title">Case Summary / Clinical Course</p>
                <p style={{ whiteSpace: "pre-line" }}>{d.courseInHospital}</p>
              </div>
            )}
            {d.treatmentGiven && (
              <div>
                <p className="section-title">Treatment Given</p>
                <p style={{ whiteSpace: "pre-line" }}>{d.treatmentGiven}</p>
              </div>
            )}
            {d.conditionAtDischarge && (
              <div>
                <p className="section-title">Condition at Discharge</p>
                <p style={{ whiteSpace: "pre-line" }}>{d.conditionAtDischarge}</p>
              </div>
            )}
            {d.adviceOnDischarge && (
              <div>
                <p className="section-title">Advice on Discharge</p>
                <p style={{ whiteSpace: "pre-line" }}>{d.adviceOnDischarge}</p>
              </div>
            )}
          </>
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
        {/* MEDICINES GIVEN DURING ADMISSION */}
        {/* =============================== */}
        {d.activeMedications && d.activeMedications.length > 0 && (
          <div>
            <p className="section-title">Medicines Given During Admission</p>
            <table>
              <thead>
                <tr>
                  <th>Medicine Name</th>
                  <th>Dosage</th>
                  <th>Frequency</th>
                  <th>Duration</th>
                  <th>Instruction</th>
                </tr>
              </thead>
              <tbody>
                {d.activeMedications.map((med: any, i: number) => (
                  <tr key={i}>
                    <td>{med.name}</td>
                    <td>{med.dosage}</td>
                    <td>{med.frequency}</td>
                    <td>{med.duration}</td>
                    <td>{med.instruction || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* =============================== */}
        {/* DISCHARGE MEDICINES */}
        {/* =============================== */}
        {d.dischargeMedicines && d.dischargeMedicines.length > 0 && (
          <div>
            <p className="section-title">Discharge Medicines (Take-Home)</p>
            <table>
              <thead>
                <tr>
                  <th>Medicine Name</th>
                  <th>Dosage</th>
                  <th>Frequency</th>
                  <th>Duration</th>
                  <th>Instruction</th>
                </tr>
              </thead>
              <tbody>
                {d.dischargeMedicines.map((med: any) => (
                  <tr key={med.id}>
                    <td>{med.medicineName}</td>
                    <td>{med.dosage}</td>
                    <td>{med.frequency}</td>
                    <td>{med.duration}</td>
                    <td>{med.instruction || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
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
                  {d.doctorDepartment ? `, ${d.doctorDepartment}` : ""}
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
