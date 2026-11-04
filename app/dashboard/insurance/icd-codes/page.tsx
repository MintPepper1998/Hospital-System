import { prisma } from "@/lib/prisma"
import { requireAuth } from "@/lib/auth-guard"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { BookOpen } from "lucide-react"

export default async function IcdCodesPage() {
  await requireAuth()

  const codes = await prisma.icdCode.findMany({
    orderBy: [{ isCommon: "desc" }, { code: "asc" }],
    take: 500,
  })

  const categories = [...new Set(codes.map((c) => c.category).filter(Boolean))]

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight text-[#0066CC]">ICD-10 Code Browser</h2>
        <p className="text-muted-foreground mt-1">Search and browse ICD-10 diagnosis codes</p>
      </div>

      {codes.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center text-muted-foreground">
            <BookOpen className="h-12 w-12 mx-auto mb-4 text-gray-300" />
            <p className="text-lg font-medium">No ICD-10 codes loaded</p>
            <p className="text-sm mt-1">Please import ICD-10 codes to populate the database</p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BookOpen className="h-5 w-5" /> ICD-10 Codes ({codes.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto max-h-[600px] overflow-y-auto">
              <table className="w-full text-sm">
                <thead className="sticky top-0 bg-white">
                  <tr className="border-b text-left text-muted-foreground">
                    <th className="pb-2 font-medium">Code</th>
                    <th className="pb-2 font-medium">Description</th>
                    <th className="pb-2 font-medium">Category</th>
                    <th className="pb-2 font-medium text-center">Common</th>
                  </tr>
                </thead>
                <tbody>
                  {codes.map((code) => (
                    <tr key={code.id} className="border-b last:border-0 hover:bg-muted/50">
                      <td className="py-2 font-mono font-medium">{code.code}</td>
                      <td className="py-2">{code.description}</td>
                      <td className="py-2 text-muted-foreground">{code.category || "-"}</td>
                      <td className="py-2 text-center">
                        {code.isCommon && <Badge variant="outline" className="bg-blue-50 text-blue-700">Common</Badge>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
