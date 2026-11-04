import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { redirect } from "next/navigation"
import { format } from "date-fns"
import { Receipt, IndianRupee } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"

const statusColors: Record<string, string> = {
  PENDING: "bg-red-100 text-red-800",
  PARTIALLY_PAID: "bg-amber-100 text-amber-800",
  PAID: "bg-green-100 text-green-800",
  CANCELLED: "bg-gray-100 text-gray-800",
  REFUNDED: "bg-purple-100 text-purple-800",
  PENDING_GOVERNMENT_PAYMENT: "bg-blue-100 text-blue-800",
  DRAFT: "bg-gray-100 text-gray-600",
}

export default async function PatientBillingPage() {
  const session = await auth()
  if (!session?.user?.id) redirect("/patient-login")
  const user = await prisma.user.findUnique({ where: { id: session.user.id }, include: { patient: { select: { id: true } } } })
  if (!user || user.role !== "PATIENT" || !user.patient) redirect("/patient-login")

  const [bills, summary] = await Promise.all([
    prisma.billing.findMany({ where: { patientId: user.patient.id }, orderBy: { billDate: "desc" }, take: 50, include: { items: true } }),
    prisma.billing.aggregate({ where: { patientId: user.patient.id }, _sum: { totalAmount: true, paidAmount: true, balanceAmount: true } }),
  ])
  const totalBilled = summary._sum.totalAmount || 0
  const totalPaid = summary._sum.paidAmount || 0
  const totalDue = summary._sum.balanceAmount || 0

  return (
    <div className="skp-sub">
      <div className="skp-sub-header">
        <div className="skp-sub-icon" style={{ background: "#fffbeb" }}>
          <IndianRupee style={{ width: 24, height: 24, color: "#d97706" }} />
        </div>
        <div>
          <h1 className="skp-sub-title">Billing</h1>
          <p className="skp-sub-desc">Your invoices and payment history</p>
        </div>
      </div>

      {/* Summary */}
      <div className="skb-summary">
        <div className="skb-summary-card">
          <span className="skb-summary-dot" style={{ background: "#2a6cb1" }} />
          <p className="skb-summary-label">Total Billed</p>
          <p className="skb-summary-value">{"\u20B9"}{totalBilled.toLocaleString("en-IN")}</p>
        </div>
        <div className="skb-summary-card">
          <span className="skb-summary-dot" style={{ background: "#059669" }} />
          <p className="skb-summary-label">Total Paid</p>
          <p className="skb-summary-value" style={{ color: "#059669" }}>{"\u20B9"}{totalPaid.toLocaleString("en-IN")}</p>
        </div>
        <div className="skb-summary-card">
          <span className="skb-summary-dot" style={{ background: totalDue > 0 ? "#e63946" : "#059669" }} />
          <p className="skb-summary-label">Balance Due</p>
          <p className="skb-summary-value" style={{ color: totalDue > 0 ? "#e63946" : "#059669" }}>{"\u20B9"}{totalDue.toLocaleString("en-IN")}</p>
        </div>
      </div>

      {/* Bills */}
      <div className="skp-sub-section">
        <h2 className="skp-sub-h2"><span className="skp-sub-dot" style={{ background: "#d97706" }} />All Bills ({bills.length})</h2>
        {bills.length === 0 ? (
          <Card><CardContent className="py-10 text-center"><Receipt style={{ width: 32, height: 32, color: "#fcd34d", margin: "0 auto 0.75rem" }} /><p className="text-muted-foreground" style={{ fontSize: "0.85rem" }}>No bills found</p></CardContent></Card>
        ) : (
          <div className="skp-sub-list">
            {bills.map((bill) => {
              const sc = statusColors[bill.status] || "bg-gray-100"
              return (
                <Card key={bill.id}>
                  <CardContent className="py-4">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2"><p className="font-semibold text-sm">{bill.billNumber}</p><Badge variant="outline" className="text-xs">{bill.type}</Badge></div>
                        <p className="text-xs text-muted-foreground">{format(bill.billDate, "dd MMM yyyy")}</p>
                        {bill.items.length > 0 && <div className="text-xs text-muted-foreground">{bill.items.map((i) => i.description).join(", ")}</div>}
                      </div>
                      <div className="flex items-center gap-3 sm:text-right">
                        <div>
                          <p className="font-bold">{"\u20B9"}{bill.netAmount.toLocaleString("en-IN")}</p>
                          {bill.balanceAmount > 0 && <p className="text-xs text-red-600">Due: {"\u20B9"}{bill.balanceAmount.toLocaleString("en-IN")}</p>}
                        </div>
                        <Badge className={sc}>{bill.status === "PENDING_GOVERNMENT_PAYMENT" ? "BSKY Pending" : bill.status.replace(/_/g, " ")}</Badge>
                      </div>
                    </div>
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

        .skb-summary{display:grid;grid-template-columns:1fr;gap:.75rem}
        @media(min-width:640px){.skb-summary{grid-template-columns:repeat(3,1fr)}}
        .skb-summary-card{padding:1.25rem 1.5rem;border-radius:16px;background:#fff;border:1px solid #e2e8f0;box-shadow:0 1px 3px rgba(10,61,107,.03);position:relative}
        .skb-summary-dot{width:8px;height:8px;border-radius:50%;position:absolute;top:1.25rem;right:1.25rem}
        .skb-summary-label{font-size:.72rem;font-weight:600;color:#94a3b8;text-transform:uppercase;letter-spacing:.06em;margin:0 0 .5rem}
        .skb-summary-value{font-family:'Playfair Display',Georgia,serif;font-size:1.75rem;font-weight:700;color:#0a3d6b;margin:0;line-height:1}
      `}</style>
    </div>
  )
}
