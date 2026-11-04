import { getOperation } from "@/app/actions/ot"
import { getHospitalSettings } from "@/app/actions/settings"
import { getSecureUrl } from "@/lib/s3-server"
import { PrintHeader } from "@/components/print/print-header"
import { PrintFooter } from "@/components/print/print-footer"
import { PrintPageWrapper } from "@/components/print/print-page-wrapper"
import { notFound } from "next/navigation"
import { format, differenceInYears } from "date-fns"

interface PageProps {
  params: Promise<{ id: string }>
}

export default async function OpReportPage({ params }: PageProps) {
  const { id } = await params
  const [result, settings] = await Promise.all([
    getOperation(id),
    getHospitalSettings(),
  ])

  if (!result.success || !result.data) notFound()

  const op = result.data
  const patientName = op.patient.name || "—"
  const age = op.patient.dateOfBirth
    ? `${differenceInYears(new Date(), new Date(op.patient.dateOfBirth))} years`
    : "—"
  const gender = op.patient.gender || "—"
  const opDate = format(new Date(op.date), "dd MMM yyyy")
  const opTime = format(new Date(op.date), "hh:mm a")

  // Sign photo URLs for private S3
  const signedPhotos = await Promise.all(
    (op.photos || []).map((url) => getSecureUrl(url))
  )

  return (
    <PrintPageWrapper title="Operation Report">
      <div style={{ maxWidth: "210mm", margin: "0 auto", padding: "20px 24px", fontFamily: "sans-serif", fontSize: "12px", lineHeight: 1.6, color: "#000", minHeight: "100vh", display: "flex", flexDirection: "column" }}>
        <PrintHeader settings={settings} title="OPERATION NOTE" />

        {/* Patient & Surgery Details */}
        <table style={{ width: "100%", borderCollapse: "collapse", marginTop: "14px", marginBottom: "16px", fontSize: "11px" }}>
          <tbody>
            <tr>
              <td style={{ padding: "3px 0", width: "50%" }}>
                <strong>Patient Name:</strong> {patientName}
              </td>
              <td style={{ padding: "3px 0" }}>
                <strong>Patient ID:</strong> {op.patient.patientId}
              </td>
            </tr>
            <tr>
              <td style={{ padding: "3px 0" }}>
                <strong>Age / Sex:</strong> {age} / {gender}
              </td>
              <td style={{ padding: "3px 0" }}>
                <strong>Blood Group:</strong> {op.patient.bloodGroup || "—"}
              </td>
            </tr>
            <tr>
              <td style={{ padding: "3px 0" }}>
                <strong>Date of Surgery:</strong> {opDate}
              </td>
              <td style={{ padding: "3px 0" }}>
                <strong>Time:</strong> {opTime}
              </td>
            </tr>
            <tr>
              <td style={{ padding: "3px 0" }}>
                <strong>Procedure:</strong> {op.procedureName}
              </td>
              <td style={{ padding: "3px 0" }}>
                <strong>Status:</strong> {op.status}
              </td>
            </tr>
            <tr>
              <td style={{ padding: "3px 0" }}>
                <strong>Surgeon:</strong> {op.surgeonName}
              </td>
              <td style={{ padding: "3px 0" }}>
                <strong>Anesthetist:</strong> {op.anesthetist || "—"}
              </td>
            </tr>
          </tbody>
        </table>

        {/* Operation Note */}
        <div style={{ borderTop: "2px solid #000", paddingTop: "12px", flex: 1 }}>
          <h3 style={{ fontSize: "13px", fontWeight: 700, margin: "0 0 10px", textDecoration: "underline" }}>
            SURGEON&apos;S NOTE
          </h3>
          {op.opNote ? (
            <div style={{ whiteSpace: "pre-wrap", fontSize: "12px", lineHeight: 1.8 }}>
              {op.opNote}
            </div>
          ) : (
            <p style={{ color: "#999", fontStyle: "italic" }}>
              No operation note has been recorded yet.
            </p>
          )}
        </div>

        {/* Photos Section */}
        {signedPhotos.length > 0 && (
          <div style={{ marginTop: "20px", pageBreakBefore: signedPhotos.length > 4 ? "always" : "auto" }}>
            <h3 style={{ fontSize: "13px", fontWeight: 700, margin: "0 0 10px", textDecoration: "underline", borderTop: "1px solid #ccc", paddingTop: "10px" }}>
              INTRA-OPERATIVE PHOTOGRAPHS ({signedPhotos.length})
            </h3>
            <div style={{
              display: "grid",
              gridTemplateColumns: "repeat(2, 1fr)",
              gap: "10px",
            }}>
              {signedPhotos.map((url, i) => (
                <div key={i} style={{
                  border: "1px solid #ccc",
                  borderRadius: "4px",
                  overflow: "hidden",
                  textAlign: "center",
                }}>
                  {url ? (
                    <img
                      src={url}
                      alt={`Op photo ${i + 1}`}
                      style={{
                        width: "100%",
                        height: "200px",
                        objectFit: "contain",
                        backgroundColor: "#f9f9f9",
                      }}
                    />
                  ) : (
                    <div style={{ width: "100%", height: "200px", backgroundColor: "#f9f9f9", display: "flex", alignItems: "center", justifyContent: "center", color: "#999", fontSize: "11px" }}>
                      Photo unavailable
                    </div>
                  )}
                  <div style={{ fontSize: "9px", padding: "3px", color: "#666", borderTop: "1px solid #eee" }}>
                    Photo {i + 1}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Footer */}
        <div style={{ marginTop: "40px" }}>
          <PrintFooter settings={settings} doctorName={op.surgeonName} />
        </div>
      </div>
    </PrintPageWrapper>
  )
}
