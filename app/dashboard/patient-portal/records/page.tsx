import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { redirect } from "next/navigation"
import { format } from "date-fns"
import { FileText, Stethoscope } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"

export default async function PatientRecordsPage() {
  const session = await auth()
  if (!session?.user?.id) redirect("/patient-login")
  const user = await prisma.user.findUnique({ where: { id: session.user.id }, include: { patient: { select: { id: true } } } })
  if (!user || user.role !== "PATIENT" || !user.patient) redirect("/patient-login")

  const [medicalRecords, prescriptions] = await Promise.all([
    prisma.medicalRecord.findMany({
      where: { patientId: user.patient.id }, orderBy: { recordDate: "desc" }, take: 30,
      include: { appointment: { select: { doctor: { include: { user: { select: { name: true } } } } } } },
    }),
    prisma.prescription.findMany({
      where: { patientId: user.patient.id }, orderBy: { prescriptionDate: "desc" }, take: 20,
      include: { medications: true },
    }),
  ])

  return (
    <div className="skp-sub">
      <div className="skp-sub-header">
        <div className="skp-sub-icon" style={{ background: "#eff6ff" }}>
          <FileText style={{ width: 24, height: 24, color: "#2a6cb1" }} />
        </div>
        <div>
          <h1 className="skp-sub-title">Medical Records</h1>
          <p className="skp-sub-desc">Your consultation notes and prescriptions</p>
        </div>
      </div>

      <div className="skp-sub-section">
        <h2 className="skp-sub-h2"><span className="skp-sub-dot" style={{ background: "#2a6cb1" }} />Consultation Records ({medicalRecords.length})</h2>
        {medicalRecords.length === 0 ? (
          <Card><CardContent className="py-10 text-center"><FileText style={{ width: 32, height: 32, color: "#93c5fd", margin: "0 auto 0.75rem" }} /><p className="text-muted-foreground" style={{ fontSize: "0.85rem" }}>No medical records found</p></CardContent></Card>
        ) : (
          <div className="skp-sub-list">
            {medicalRecords.map((record) => (
              <Card key={record.id}>
                <CardContent className="py-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <p className="font-semibold text-sm">{format(record.recordDate, "dd MMM yyyy")}</p>
                    {record.appointment?.doctor && <Badge variant="outline">Dr. {record.appointment.doctor.user.name}</Badge>}
                  </div>
                  {record.diagnosis && <div><p className="text-xs font-medium text-muted-foreground">Diagnosis</p><p className="text-sm">{record.diagnosis}</p></div>}
                  {record.chiefComplaint && <div><p className="text-xs font-medium text-muted-foreground">Chief Complaint</p><p className="text-sm">{record.chiefComplaint}</p></div>}
                  {record.treatment && <div><p className="text-xs font-medium text-muted-foreground">Treatment</p><p className="text-sm">{record.treatment}</p></div>}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      <div className="skp-sub-section">
        <h2 className="skp-sub-h2"><span className="skp-sub-dot" style={{ background: "#7c3aed" }} />Prescriptions ({prescriptions.length})</h2>
        {prescriptions.length === 0 ? (
          <Card><CardContent className="py-10 text-center"><Stethoscope style={{ width: 32, height: 32, color: "#c4b5fd", margin: "0 auto 0.75rem" }} /><p className="text-muted-foreground" style={{ fontSize: "0.85rem" }}>No prescriptions found</p></CardContent></Card>
        ) : (
          <div className="skp-sub-list">
            {prescriptions.map((rx) => (
              <Card key={rx.id}>
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm font-semibold">{format(rx.prescriptionDate, "dd MMM yyyy")}</CardTitle>
                    <span className="text-xs text-muted-foreground">By: {rx.prescribedBy}</span>
                  </div>
                </CardHeader>
                <CardContent>
                  {rx.medications.length > 0 ? (
                    <div className="space-y-1.5">
                      {rx.medications.map((med) => (
                        <div key={med.id} className="flex items-start justify-between text-sm border-b last:border-0 pb-1.5">
                          <div><p className="font-medium">{med.medicationName}</p><p className="text-xs text-muted-foreground">{med.dosage} &middot; {med.frequency} &middot; {med.duration}</p></div>
                          <Badge variant="outline" className="text-xs shrink-0">Qty: {med.quantity}</Badge>
                        </div>
                      ))}
                    </div>
                  ) : <p className="text-sm text-muted-foreground">No medications listed</p>}
                  {rx.instructions && <p className="text-xs text-muted-foreground mt-2 italic">{rx.instructions}</p>}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      <style>{`
        .skp-sub{display:flex;flex-direction:column;gap:2rem}
        .skp-sub-header{display:flex;align-items:center;gap:1rem;padding-bottom:1.5rem;border-bottom:1px solid #e2e8f0}
        .skp-sub-icon{width:48px;height:48px;border-radius:14px;display:flex;align-items:center;justify-content:center;flex-shrink:0}
        .skp-sub-title{font-family:'Playfair Display',Georgia,serif!important;font-size:1.75rem!important;font-weight:700!important;color:#0a3d6b!important;margin:0 0 .25rem;line-height:1.1}
        .skp-sub-desc{font-size:.82rem;color:#94a3b8;margin:0}
        .skp-sub-section{display:flex;flex-direction:column;gap:.75rem}
        .skp-sub-h2{display:flex;align-items:center;gap:.5rem;font-family:'DM Sans',sans-serif!important;font-size:.875rem!important;font-weight:600!important;color:#334155!important;text-transform:uppercase;letter-spacing:.04em}
        .skp-sub-dot{width:8px;height:8px;border-radius:50%}
        .skp-sub-list{display:flex;flex-direction:column;gap:.625rem}
      `}</style>
    </div>
  )
}
