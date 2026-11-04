import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { redirect } from "next/navigation"
import { format } from "date-fns"
import { FlaskConical, CheckCircle2 } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"

const statusConfig: Record<string, { label: string; color: string }> = {
  PENDING_PAYMENT: { label: "Payment Pending", color: "bg-red-100 text-red-800" },
  PAID_PENDING_SAMPLE: { label: "Awaiting Sample", color: "bg-yellow-100 text-yellow-800" },
  SAMPLE_COLLECTED: { label: "Processing", color: "bg-blue-100 text-blue-800" },
  COMPLETED: { label: "Completed", color: "bg-green-100 text-green-800" },
  CANCELLED: { label: "Cancelled", color: "bg-gray-100 text-gray-800" },
}

export default async function PatientLabsPage() {
  const session = await auth()
  if (!session?.user?.id) redirect("/patient-login")
  const user = await prisma.user.findUnique({ where: { id: session.user.id }, include: { patient: { select: { id: true } } } })
  if (!user || user.role !== "PATIENT" || !user.patient) redirect("/patient-login")

  const labRequests = await prisma.labRequest.findMany({
    where: { patientId: user.patient.id }, orderBy: { createdAt: "desc" }, take: 50, include: { results: true },
  })
  const completed = labRequests.filter((r) => r.status === "COMPLETED")
  const pending = labRequests.filter((r) => r.status !== "COMPLETED" && r.status !== "CANCELLED")

  return (
    <div className="skp-sub">
      <div className="skp-sub-header">
        <div className="skp-sub-icon" style={{ background: "#f5f3ff" }}>
          <FlaskConical style={{ width: 24, height: 24, color: "#7c3aed" }} />
        </div>
        <div>
          <h1 className="skp-sub-title">Lab Reports</h1>
          <p className="skp-sub-desc">Your pathology and radiology test results</p>
        </div>
      </div>

      {pending.length > 0 && (
        <div className="skp-sub-section">
          <h2 className="skp-sub-h2"><span className="skp-sub-dot" style={{ background: "#d97706" }} />Pending Tests ({pending.length})</h2>
          <div className="skp-sub-list">
            {pending.map((req) => {
              const cfg = statusConfig[req.status] || { label: req.status, color: "bg-gray-100" }
              return (
                <Card key={req.id} className="border-l-4 border-l-amber-400">
                  <CardContent className="py-3">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                      <div className="space-y-0.5">
                        <p className="font-medium">{req.testName}</p>
                        <p className="text-xs text-muted-foreground">
                          Ordered: {format(req.createdAt, "dd MMM yyyy")}
                          {req.priority !== "ROUTINE" && <Badge variant="destructive" className="ml-2 text-[10px]">{req.priority}</Badge>}
                        </p>
                      </div>
                      <Badge className={cfg.color}>{cfg.label}</Badge>
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        </div>
      )}

      <div className="skp-sub-section">
        <h2 className="skp-sub-h2"><span className="skp-sub-dot" style={{ background: "#059669" }} />Completed Reports ({completed.length})</h2>
        {completed.length === 0 ? (
          <Card><CardContent className="py-10 text-center"><FlaskConical style={{ width: 32, height: 32, color: "#c4b5fd", margin: "0 auto 0.75rem" }} /><p className="text-muted-foreground" style={{ fontSize: "0.85rem" }}>No completed lab reports yet</p></CardContent></Card>
        ) : (
          <div className="skp-sub-list">
            {completed.map((req) => {
              const params = req.parameterResults as Record<string, string> | null
              return (
                <Card key={req.id}>
                  <CardHeader className="pb-2"><div className="flex items-center justify-between"><CardTitle className="text-sm font-semibold flex items-center gap-2"><FlaskConical className="h-4 w-4 text-blue-600" />{req.testName}</CardTitle><span className="text-xs text-muted-foreground">{req.completedAt ? format(req.completedAt, "dd MMM yyyy") : format(req.updatedAt, "dd MMM yyyy")}</span></div></CardHeader>
                  <CardContent>
                    {params && Object.keys(params).length > 0 ? (
                      <div className="rounded-md border overflow-hidden"><table className="w-full text-sm"><thead><tr className="bg-muted/50"><th className="text-left px-3 py-1.5 font-medium">Parameter</th><th className="text-left px-3 py-1.5 font-medium">Result</th></tr></thead><tbody>{Object.entries(params).map(([key, value]) => (<tr key={key} className="border-t"><td className="px-3 py-1.5 text-muted-foreground">{key}</td><td className="px-3 py-1.5 font-medium">{String(value)}</td></tr>))}</tbody></table></div>
                    ) : req.reportContent ? (
                      <div><p className="text-xs font-medium text-muted-foreground mb-1">Observations</p><p className="text-sm whitespace-pre-wrap">{req.reportContent}</p></div>
                    ) : (
                      <p className="text-sm text-muted-foreground italic">Report completed. Details available at the lab.</p>
                    )}
                    {req.impression && <div className="mt-2 pt-2 border-t"><p className="text-xs font-medium text-muted-foreground">Impression</p><p className="text-sm">{req.impression}</p></div>}
                  </CardContent>
                </Card>
              )
            })}
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
