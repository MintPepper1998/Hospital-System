import { getOperation } from "@/app/actions/ot"
import { getHospitalSettings } from "@/app/actions/settings"
import { PrintHeader } from "@/components/print/print-header"
import { PrintPageWrapper } from "@/components/print/print-page-wrapper"
import { notFound } from "next/navigation"
import { format, differenceInYears } from "date-fns"

interface PageProps {
  params: Promise<{ id: string }>
}

export default async function ConsentFormPage({ params }: PageProps) {
  const { id } = await params
  const [result, settings] = await Promise.all([
    getOperation(id),
    getHospitalSettings(),
  ])

  if (!result.success || !result.data) notFound()

  const op = result.data
  const patientName = op.patient.name || "____________________"
  const age = op.patient.dateOfBirth
    ? `${differenceInYears(new Date(), new Date(op.patient.dateOfBirth))} years`
    : "______"
  const gender = op.patient.gender || "______"
  const opDate = format(new Date(op.date), "dd/MM/yyyy")
  const opTime = format(new Date(op.date), "hh:mm a")

  return (
    <PrintPageWrapper title="Consent Form">
      <div style={{ maxWidth: "210mm", margin: "0 auto", padding: "20px 24px", fontFamily: "serif", fontSize: "13px", lineHeight: 1.7, color: "#000" }}>
        <PrintHeader settings={settings} title="CONSENT OF PATIENT FOR OPERATION / PROCEDURE" />

        {/* Patient Details Grid */}
        <div style={{ marginTop: "16px", marginBottom: "20px" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "12px" }}>
            <tbody>
              <tr>
                <td style={{ padding: "4px 0", width: "50%" }}>
                  <strong>Patient Name:</strong> {patientName}
                </td>
                <td style={{ padding: "4px 0" }}>
                  <strong>Patient ID:</strong> {op.patient.patientId}
                </td>
              </tr>
              <tr>
                <td style={{ padding: "4px 0" }}>
                  <strong>Age / Sex:</strong> {age} / {gender}
                </td>
                <td style={{ padding: "4px 0" }}>
                  <strong>Blood Group:</strong> {op.patient.bloodGroup || "______"}
                </td>
              </tr>
              <tr>
                <td style={{ padding: "4px 0" }}>
                  <strong>Date of Procedure:</strong> {opDate}
                </td>
                <td style={{ padding: "4px 0" }}>
                  <strong>Time:</strong> {opTime}
                </td>
              </tr>
              <tr>
                <td colSpan={2} style={{ padding: "4px 0" }}>
                  <strong>Procedure / Operation:</strong> {op.procedureName}
                </td>
              </tr>
              <tr>
                <td style={{ padding: "4px 0" }}>
                  <strong>Surgeon:</strong> {op.surgeonName}
                </td>
                <td style={{ padding: "4px 0" }}>
                  <strong>Anesthetist:</strong> {op.anesthetist || "______________________"}
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Consent Text */}
        <div style={{ borderTop: "1px solid #000", paddingTop: "12px" }}>
          <p style={{ margin: "0 0 10px", textAlign: "justify" }}>
            I, <strong>{patientName}</strong>, age <strong>{age}</strong>,{" "}
            {gender === "MALE" ? "S/o" : gender === "FEMALE" ? "D/o / W/o" : "S/o / D/o / W/o"}{" "}
            ______________________________, hereby give my consent for the surgical procedure{" "}
            <strong>&ldquo;{op.procedureName}&rdquo;</strong> to be performed on me / my relative at{" "}
            <strong>{settings.name}</strong>.
          </p>

          <p style={{ margin: "0 0 10px", textAlign: "justify" }}>
            I understand and acknowledge the following:
          </p>

          <ol style={{ margin: "0 0 10px", paddingLeft: "20px" }}>
            <li style={{ marginBottom: "6px" }}>
              The nature of the proposed surgery / procedure, including its purpose, has been explained to me
              in a language I understand by Dr. <strong>{op.surgeonName}</strong>.
            </li>
            <li style={{ marginBottom: "6px" }}>
              The expected benefits and possible risks, complications, side effects, and alternative treatments
              have been explained to me. These may include, but are not limited to: bleeding, infection, adverse
              reactions to anesthesia, nerve injury, organ damage, blood clots, or in rare cases, death.
            </li>
            <li style={{ marginBottom: "6px" }}>
              I understand that during the course of surgery, unforeseen conditions may arise that necessitate
              additional or different procedures than originally planned. I authorize the surgeon and their team
              to perform such additional procedures as they deem necessary.
            </li>
            <li style={{ marginBottom: "6px" }}>
              I consent to the administration of anesthesia (General / Regional / Local) as deemed appropriate
              by the anesthetist, and understand the associated risks.
            </li>
            <li style={{ marginBottom: "6px" }}>
              I understand that no guarantee has been made regarding the outcome of this procedure.
            </li>
            <li style={{ marginBottom: "6px" }}>
              I consent to the disposal of any tissue or body parts removed during the surgery in accordance
              with standard hospital protocols.
            </li>
            <li style={{ marginBottom: "6px" }}>
              I have been given the opportunity to ask questions, and all my questions have been answered
              to my satisfaction.
            </li>
            <li style={{ marginBottom: "6px" }}>
              I am giving this consent voluntarily and without any coercion.
            </li>
          </ol>

          <p style={{ margin: "0 0 8px", textAlign: "justify" }}>
            I confirm that I have read (or have been read) the contents of this form and understand them fully.
          </p>
        </div>

        {/* Signature Section */}
        <div style={{ marginTop: "50px" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "12px" }}>
            <tbody>
              <tr>
                <td style={{ width: "33%", paddingTop: "40px", verticalAlign: "bottom" }}>
                  <div style={{ borderTop: "1px solid #000", paddingTop: "6px", textAlign: "center" }}>
                    <strong>Signature of Patient / Guardian</strong>
                    <br />
                    <span style={{ fontSize: "10px", color: "#555" }}>Name: ______________________</span>
                    <br />
                    <span style={{ fontSize: "10px", color: "#555" }}>Relation: ___________________</span>
                  </div>
                </td>
                <td style={{ width: "33%", paddingTop: "40px", verticalAlign: "bottom" }}>
                  <div style={{ borderTop: "1px solid #000", paddingTop: "6px", textAlign: "center" }}>
                    <strong>Witness</strong>
                    <br />
                    <span style={{ fontSize: "10px", color: "#555" }}>Name: ______________________</span>
                    <br />
                    <span style={{ fontSize: "10px", color: "#555" }}>Address: ____________________</span>
                  </div>
                </td>
                <td style={{ width: "33%", paddingTop: "40px", verticalAlign: "bottom" }}>
                  <div style={{ borderTop: "1px solid #000", paddingTop: "6px", textAlign: "center" }}>
                    <strong>Doctor / Surgeon</strong>
                    <br />
                    <span style={{ fontSize: "10px", color: "#555" }}>Dr. {op.surgeonName}</span>
                    <br />
                    <span style={{ fontSize: "10px", color: "#555" }}>Reg. No: ___________________</span>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Date & Time */}
        <div style={{ marginTop: "30px", fontSize: "11px", display: "flex", justifyContent: "space-between" }}>
          <span><strong>Date:</strong> {opDate}</span>
          <span><strong>Time:</strong> ____________</span>
          <span><strong>Place:</strong> {settings.name}</span>
        </div>
      </div>
    </PrintPageWrapper>
  )
}
