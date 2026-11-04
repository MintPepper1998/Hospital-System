import { prisma } from "@/lib/prisma"
import { hospitalBillingWhere } from "@/lib/finance-scope"

export const runtime = "nodejs"

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const q = (searchParams.get("q") || "").trim()
  const status = searchParams.get("status") || "ALL"
  const from = searchParams.get("from")
  const to = searchParams.get("to")

  const fromDate = from ? new Date(from) : null
  const toDate = to ? new Date(to) : null
  if (toDate) toDate.setHours(23, 59, 59, 999)

  const bills = await prisma.billing.findMany({
    where: hospitalBillingWhere({
      status: status !== "ALL" ? (status as any) : undefined,
      billDate:
        fromDate || toDate
          ? {
              gte: fromDate || undefined,
              lte: toDate || undefined,
            }
          : undefined,
      OR: q
        ? [
            { billNumber: { contains: q, mode: "insensitive" } },
            { patient: { user: { name: { contains: q, mode: "insensitive" } } } },
            { patient: { patientId: { contains: q, mode: "insensitive" } } },
          ]
        : undefined,
    }),
    include: { patient: { include: { user: true } } },
    orderBy: { billDate: "desc" },
  })

  const lines = [
    ["Bill No", "Type", "Patient", "Patient ID", "Bill Date", "Net Amount", "Paid Amount", "Balance", "Status", "Payment Method"].join(","),
    ...bills.map((b) =>
      [
        b.billNumber,
        b.type,
        `"${(b.patient.user.name || "").replace(/"/g, '""')}"`,
        b.patient.patientId,
        b.billDate.toISOString().slice(0, 10),
        b.netAmount.toFixed(2),
        b.paidAmount.toFixed(2),
        b.balanceAmount.toFixed(2),
        b.status,
        b.paymentMethod || "",
      ].join(",")
    ),
  ]

  const csv = lines.join("\n")
  const fileName = `Billing_Export_${new Date().toISOString().slice(0, 10)}.csv`
  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${fileName}"`,
    },
  })
}

