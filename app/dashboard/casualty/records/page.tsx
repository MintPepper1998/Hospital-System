export const dynamic = "force-dynamic"
export const revalidate = 0

import { requireAuthSafe } from "@/lib/auth-guard"
import { redirect } from "next/navigation"
import { getCasualtyRecords } from "@/app/actions/clinical-records"
import { CasualtyRecordsClient } from "./casualty-records-client"

export const metadata = {
  title: "Casualty Records — Shree Kamal Hospital",
}

interface Props {
  searchParams: Promise<{
    q?: string
    page?: string
    from?: string
    to?: string
    status?: string
  }>
}

export default async function CasualtyRecordsPage({ searchParams }: Props) {
  const authResult = await requireAuthSafe([
    "SUPER_ADMIN", "ADMIN", "DOCTOR", "NURSE", "RECEPTIONIST", "ACCOUNTANT",
  ])
  if (!authResult.ok) redirect("/login")

  const params = await searchParams
  const q = params?.q || ""
  const page = parseInt(params?.page || "1")
  const dateFrom = params?.from || undefined
  const dateTo = params?.to || undefined
  const statusFilter = params?.status || "ALL"

  const result = await getCasualtyRecords(q, page, 20, dateFrom, dateTo, statusFilter)

  return (
    <div className="flex-1 space-y-6 p-4 md:p-8 pt-6">
      <CasualtyRecordsClient
        records={result.records}
        total={result.total}
        page={result.page}
        totalPages={result.totalPages}
        initialSearch={q}
        initialFrom={dateFrom || ""}
        initialTo={dateTo || ""}
        initialStatus={statusFilter}
      />
    </div>
  )
}
