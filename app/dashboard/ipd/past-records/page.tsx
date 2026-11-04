import { getPastAdmissions } from "@/app/actions/past-records"
import { requireAuthSafe } from "@/lib/auth-guard"
import { redirect } from "next/navigation"
import { PastRecordsListClient } from "@/components/ipd/past-records-list-client"

interface PastRecordsPageProps {
  searchParams: Promise<{ q?: string; page?: string }>
}

export default async function PastRecordsPage({ searchParams }: PastRecordsPageProps) {
  const authResult = await requireAuthSafe(["SUPER_ADMIN", "DOCTOR", "NURSE", "RECEPTIONIST", "ACCOUNTANT"])
  if (!authResult.ok) redirect("/dashboard")

  const params = await searchParams
  const q = params?.q || ""
  const page = parseInt(params?.page || "1")

  const result = await getPastAdmissions(q, page)

  return (
    <PastRecordsListClient
      admissions={result.data?.admissions || []}
      total={result.data?.total || 0}
      page={result.data?.page || 1}
      totalPages={result.data?.totalPages || 1}
      initialSearch={q}
    />
  )
}
