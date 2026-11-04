import { getOperation } from "@/app/actions/ot"
import { getHospitalSettings } from "@/app/actions/settings"
import { PrintHeader } from "@/components/print/print-header"
import { PrintPageWrapper } from "@/components/print/print-page-wrapper"
import { notFound } from "next/navigation"
import { format, differenceInYears } from "date-fns"

interface PageProps {
  params: Promise<{ id: string }>
}

export default async function AnaesthesiaRecordPage({ params }: PageProps) {
  const { id } = await params
  const [result, settings] = await Promise.all([
    getOperation(id),
    getHospitalSettings(),
  ])

  if (!result.success || !result.data) notFound()

  const op = result.data
  const patientName = op.patient.name || "____________________"
  const age = op.patient.dateOfBirth
    ? `${differenceInYears(new Date(), new Date(op.patient.dateOfBirth))} yrs`
    : "______"
  const gender = op.patient.gender || "______"
  const opDate = format(new Date(op.date), "dd/MM/yyyy")

  // Vitals time slots (15-min intervals)
  const timeSlots = Array.from({ length: 12 }, (_, i) => `${i * 15}`)

  // Standard drugs for anaesthesia chart
  const drugs = [
    "Inj. Glycopyrrolate",
    "Inj. Midazolam",
    "Inj. Fentanyl",
    "Inj. Propofol",
    "Inj. Succinylcholine",
    "Inj. Atracurium",
    "Inj. Neostigmine",
    "Inj. Ondansetron",
    "Inj. Dexamethasone",
    "Inj. Tramadol",
  ]

  // IV Fluids
  const fluids = [
    "NS (0.9%)",
    "RL (Ringer Lactate)",
    "DNS (Dextrose NS)",
    "Dextrose 5%",
    "Colloid",
    "Blood / PCV",
  ]

  const cellStyle = { border: "1px solid #000", padding: "4px 6px", fontSize: "10px", textAlign: "center" as const, height: "22px" }
  const headerCellStyle = { ...cellStyle, fontWeight: 700, backgroundColor: "#f5f5f5", fontSize: "9px" }
  const labelCellStyle = { ...cellStyle, textAlign: "left" as const, fontWeight: 600, fontSize: "10px" }

  return (
    <PrintPageWrapper title="Anaesthesia Record">
      <div style={{ maxWidth: "210mm", margin: "0 auto", padding: "16px 20px", fontFamily: "sans-serif", fontSize: "11px", color: "#000" }}>
        <PrintHeader settings={settings} title="ANAESTHESIA RECORD" />

        {/* Patient Details */}
        <table style={{ width: "100%", borderCollapse: "collapse", marginTop: "12px", marginBottom: "12px", fontSize: "10px" }}>
          <tbody>
            <tr>
              <td style={{ padding: "3px 0", width: "33%" }}><strong>Patient:</strong> {patientName}</td>
              <td style={{ padding: "3px 0", width: "33%" }}><strong>Age/Sex:</strong> {age} / {gender}</td>
              <td style={{ padding: "3px 0" }}><strong>ID:</strong> {op.patient.patientId}</td>
            </tr>
            <tr>
              <td style={{ padding: "3px 0" }}><strong>Blood Group:</strong> {op.patient.bloodGroup || "______"}</td>
              <td style={{ padding: "3px 0" }}><strong>Weight:</strong> _______ kg</td>
              <td style={{ padding: "3px 0" }}><strong>Date:</strong> {opDate}</td>
            </tr>
            <tr>
              <td style={{ padding: "3px 0" }}><strong>Procedure:</strong> {op.procedureName}</td>
              <td style={{ padding: "3px 0" }}><strong>Surgeon:</strong> {op.surgeonName}</td>
              <td style={{ padding: "3px 0" }}><strong>Anesthetist:</strong> {op.anesthetist || "________________"}</td>
            </tr>
          </tbody>
        </table>

        {/* Pre-Op Assessment */}
        <div style={{ border: "1px solid #000", padding: "8px 10px", marginBottom: "10px", fontSize: "10px" }}>
          <div style={{ fontWeight: 700, marginBottom: "6px", fontSize: "11px", textDecoration: "underline" }}>PRE-ANAESTHESIA ASSESSMENT</div>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <tbody>
              <tr>
                <td style={{ padding: "2px 0", width: "33%" }}>ASA Grade: ______</td>
                <td style={{ padding: "2px 0", width: "33%" }}>Mallampati: ______</td>
                <td style={{ padding: "2px 0" }}>Airway: ______</td>
              </tr>
              <tr>
                <td style={{ padding: "2px 0" }}>BP: ____/____ mmHg</td>
                <td style={{ padding: "2px 0" }}>Pulse: ____/min</td>
                <td style={{ padding: "2px 0" }}>SpO2: _____%</td>
              </tr>
              <tr>
                <td style={{ padding: "2px 0" }}>Hb: ______ g/dL</td>
                <td style={{ padding: "2px 0" }}>ECG: ____________</td>
                <td style={{ padding: "2px 0" }}>Allergies: ____________</td>
              </tr>
              <tr>
                <td colSpan={3} style={{ padding: "2px 0" }}>Known Medical History: _______________________________________________</td>
              </tr>
              <tr>
                <td colSpan={3} style={{ padding: "2px 0" }}>Type of Anaesthesia: &nbsp; GA ☐ &nbsp; SA ☐ &nbsp; Epidural ☐ &nbsp; Regional ☐ &nbsp; Local ☐ &nbsp; Sedation ☐</td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Vitals Monitoring Chart */}
        <div style={{ fontWeight: 700, fontSize: "11px", marginBottom: "4px", textDecoration: "underline" }}>INTRA-OPERATIVE VITALS</div>
        <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: "10px" }}>
          <thead>
            <tr>
              <td style={{ ...headerCellStyle, width: "100px", textAlign: "left" as const }}>TIME (min)</td>
              {timeSlots.map((t) => (
                <td key={t} style={headerCellStyle}>{t}</td>
              ))}
            </tr>
          </thead>
          <tbody>
            {["BP (sys)", "BP (dia)", "Pulse", "SpO2 (%)", "EtCO2", "Temp (°C)"].map((vital) => (
              <tr key={vital}>
                <td style={labelCellStyle}>{vital}</td>
                {timeSlots.map((t) => (
                  <td key={t} style={cellStyle}>&nbsp;</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>

        {/* Drugs Chart */}
        <div style={{ fontWeight: 700, fontSize: "11px", marginBottom: "4px", textDecoration: "underline" }}>DRUGS ADMINISTERED</div>
        <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: "10px" }}>
          <thead>
            <tr>
              <td style={{ ...headerCellStyle, width: "160px", textAlign: "left" as const }}>Drug</td>
              <td style={{ ...headerCellStyle, width: "60px" }}>Dose</td>
              <td style={{ ...headerCellStyle, width: "50px" }}>Route</td>
              <td style={{ ...headerCellStyle, width: "50px" }}>Time</td>
              <td style={headerCellStyle}>Remarks</td>
            </tr>
          </thead>
          <tbody>
            {drugs.map((drug) => (
              <tr key={drug}>
                <td style={labelCellStyle}>{drug}</td>
                <td style={cellStyle}>&nbsp;</td>
                <td style={cellStyle}>&nbsp;</td>
                <td style={cellStyle}>&nbsp;</td>
                <td style={cellStyle}>&nbsp;</td>
              </tr>
            ))}
            {/* 2 empty rows for additional drugs */}
            {[1, 2].map((i) => (
              <tr key={`extra-${i}`}>
                <td style={cellStyle}>&nbsp;</td>
                <td style={cellStyle}>&nbsp;</td>
                <td style={cellStyle}>&nbsp;</td>
                <td style={cellStyle}>&nbsp;</td>
                <td style={cellStyle}>&nbsp;</td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* IV Fluids */}
        <div style={{ fontWeight: 700, fontSize: "11px", marginBottom: "4px", textDecoration: "underline" }}>IV FLUIDS</div>
        <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: "10px" }}>
          <thead>
            <tr>
              <td style={{ ...headerCellStyle, width: "160px", textAlign: "left" as const }}>Fluid</td>
              <td style={{ ...headerCellStyle, width: "70px" }}>Volume</td>
              <td style={{ ...headerCellStyle, width: "60px" }}>Start</td>
              <td style={{ ...headerCellStyle, width: "60px" }}>End</td>
              <td style={headerCellStyle}>Remarks</td>
            </tr>
          </thead>
          <tbody>
            {fluids.map((fluid) => (
              <tr key={fluid}>
                <td style={labelCellStyle}>{fluid}</td>
                <td style={cellStyle}>&nbsp;</td>
                <td style={cellStyle}>&nbsp;</td>
                <td style={cellStyle}>&nbsp;</td>
                <td style={cellStyle}>&nbsp;</td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Post-Op Section */}
        <div style={{ border: "1px solid #000", padding: "8px 10px", marginBottom: "12px", fontSize: "10px" }}>
          <div style={{ fontWeight: 700, marginBottom: "6px", fontSize: "11px", textDecoration: "underline" }}>POST-OPERATIVE INSTRUCTIONS</div>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <tbody>
              <tr>
                <td style={{ padding: "2px 0", width: "50%" }}>Duration of Surgery: ____________</td>
                <td style={{ padding: "2px 0" }}>Blood Loss: ____________ mL</td>
              </tr>
              <tr>
                <td style={{ padding: "2px 0" }}>Urine Output: ____________ mL</td>
                <td style={{ padding: "2px 0" }}>Extubation: Smooth ☐ &nbsp; Delayed ☐</td>
              </tr>
              <tr>
                <td colSpan={2} style={{ padding: "2px 0" }}>Complications: ___________________________________________________</td>
              </tr>
              <tr>
                <td colSpan={2} style={{ padding: "2px 0" }}>Post-Op Plan: ___________________________________________________</td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Signature */}
        <div style={{ display: "flex", justifyContent: "space-between", marginTop: "30px", fontSize: "10px" }}>
          <div style={{ textAlign: "center" }}>
            <div style={{ borderTop: "1px solid #000", paddingTop: "4px", width: "200px" }}>
              <strong>Anesthetist</strong>
              <br />
              {op.anesthetist || "________________"}
            </div>
          </div>
          <div style={{ textAlign: "center" }}>
            <div style={{ borderTop: "1px solid #000", paddingTop: "4px", width: "200px" }}>
              <strong>Surgeon</strong>
              <br />
              {op.surgeonName}
            </div>
          </div>
        </div>
      </div>
    </PrintPageWrapper>
  )
}
