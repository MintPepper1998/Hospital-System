import { prisma } from "@/lib/prisma"
import { requireAuth } from "@/lib/auth-guard"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { IndianRupee } from "lucide-react"

function formatCurrency(amount: number) {
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(amount)
}

export default async function TariffMasterPage() {
  await requireAuth()

  const tariffs = await prisma.tariffMaster.findMany({
    where: { isActive: true },
    orderBy: [{ category: "asc" }, { description: "asc" }],
  })

  const categories = [...new Set(tariffs.map((t) => t.category))]

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight text-[#0066CC]">Tariff Master</h2>
        <p className="text-muted-foreground mt-1">Hospital tariff rates for insurance cost estimation</p>
      </div>

      {categories.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center text-muted-foreground">
            <IndianRupee className="h-12 w-12 mx-auto mb-4 text-gray-300" />
            <p className="text-lg font-medium">No tariffs configured</p>
            <p className="text-sm mt-1">Please import default tariff rates</p>
          </CardContent>
        </Card>
      ) : (
        categories.map((cat) => (
          <Card key={cat}>
            <CardHeader>
              <CardTitle className="text-lg">{cat}</CardTitle>
            </CardHeader>
            <CardContent>
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-muted-foreground">
                    <th className="pb-2 font-medium">Code</th>
                    <th className="pb-2 font-medium">Description</th>
                    <th className="pb-2 font-medium text-right">Hospital Rate</th>
                    <th className="pb-2 font-medium text-right">PMJAY Rate</th>
                  </tr>
                </thead>
                <tbody>
                  {tariffs
                    .filter((t) => t.category === cat)
                    .map((t) => (
                      <tr key={t.id} className="border-b last:border-0">
                        <td className="py-2">{t.code || "-"}</td>
                        <td className="py-2">{t.description}</td>
                        <td className="py-2 text-right">{formatCurrency(t.hospitalRate)}</td>
                        <td className="py-2 text-right text-green-700">{t.pmjayRate ? formatCurrency(t.pmjayRate) : "-"}</td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </CardContent>
          </Card>
        ))
      )}
    </div>
  )
}
