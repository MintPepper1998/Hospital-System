import { getSurgeryProcedures, getSurgeryProcedureStats, getSurgeryCategories } from "@/app/actions/surgery-procedures"
import { SurgeryProceduresClient } from "@/components/admin/surgery-procedures-client"

export default async function SurgeryProceduresPage() {
  const [procedures, stats, categories] = await Promise.all([
    getSurgeryProcedures(),
    getSurgeryProcedureStats(),
    getSurgeryCategories(),
  ])

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight text-[#0066CC]">Surgery Procedures</h2>
        <p className="text-muted-foreground mt-1">Manage operation procedures and their charge breakdowns</p>
      </div>
      <SurgeryProceduresClient
        initialProcedures={JSON.parse(JSON.stringify(procedures))}
        stats={stats}
        categories={categories}
      />
    </div>
  )
}
