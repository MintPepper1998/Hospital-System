import { getSurgeryProcedure, getSurgeryCategories } from "@/app/actions/surgery-procedures"
import { SurgeryProcedureEditClient } from "@/components/admin/surgery-procedure-edit-client"
import { notFound } from "next/navigation"

export default async function EditSurgeryProcedurePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  
  const [procedure, categories] = await Promise.all([
    getSurgeryProcedure(id),
    getSurgeryCategories(),
  ])

  if (!procedure) notFound()

  return (
    <div className="flex flex-col min-h-screen bg-[#FDFBF7]">
      <SurgeryProcedureEditClient
        procedure={JSON.parse(JSON.stringify(procedure))}
        categories={categories}
      />
    </div>
  )
}
