import { getOperation } from "@/app/actions/ot"
import { notFound } from "next/navigation"
import { SurgeryCaseClient } from "@/components/ot/surgery-case-client"

interface PageProps {
  params: Promise<{ id: string }>
}

export default async function SurgeryCasePage({ params }: PageProps) {
  const { id } = await params
  const result = await getOperation(id)

  if (!result.success || !result.data) {
    notFound()
  }

  return (
    <div className="space-y-6">
      <SurgeryCaseClient operation={result.data} />
    </div>
  )
}
