import { getPACAssessment } from "@/app/actions/ot-workflow"
import { PACClearanceForm } from "@/components/ot/pac-clearance-form"
import { redirect } from "next/navigation"

export default async function PACClearancePage(props: { params: Promise<{ surgeryId: string }> }) {
  const { surgeryId } = await props.params
  const res = await getPACAssessment(surgeryId)

  if (!res.success || !res.surgery) {
    redirect("/dashboard/ot")
  }

  return (
    <div className="min-h-screen bg-slate-50/50 p-4 md:p-8">
      <div className="max-w-5xl mx-auto">
        <PACClearanceForm surgery={res.surgery as any} />
      </div>
    </div>
  )
}
