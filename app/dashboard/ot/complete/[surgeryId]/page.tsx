import { getSurgeryForWorkflow } from "@/app/actions/ot-workflow"
import { SurgeryCompleteForm } from "@/components/ot/surgery-complete-form"
import { redirect } from "next/navigation"

export default async function SurgeryCompletePage(props: { params: Promise<{ surgeryId: string }> }) {
  const { surgeryId } = await props.params
  const res = await getSurgeryForWorkflow(surgeryId)

  if (!res.success || !res.surgery) {
    redirect("/dashboard/ot")
  }

  return (
    <div className="min-h-screen bg-slate-50/50 p-4 md:p-8">
      <div className="max-w-4xl mx-auto">
        <SurgeryCompleteForm surgery={res.surgery} />
      </div>
    </div>
  )
}
