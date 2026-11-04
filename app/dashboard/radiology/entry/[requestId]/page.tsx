import { notFound } from "next/navigation"
import { getRadiologyEntryContext } from "@/app/actions/radiology"
import { ResultEntryStudio } from "@/components/radiology/result-entry-studio"

export const dynamic = "force-dynamic"

interface RadiologyEntryPageProps {
  params: Promise<{ requestId: string }>
}

export default async function RadiologyResultEntryPage({ params }: RadiologyEntryPageProps) {
  const { requestId } = await params

  const res = await getRadiologyEntryContext(requestId)

  if (!res.success || !res.data) {
    notFound()
  }

  return (
    <div className="container mx-auto py-6 px-4">
      <ResultEntryStudio initialContext={res.data} />
    </div>
  )
}

