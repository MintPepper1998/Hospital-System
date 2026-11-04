import { getFullAdmissionHistory } from "@/app/actions/past-records"
import { requireAuthSafe } from "@/lib/auth-guard"
import { redirect, notFound } from "next/navigation"
import { PastRecordDetailClient } from "@/components/ipd/past-record-detail-client"

interface PastRecordDetailPageProps {
  params: Promise<{ admissionId: string }>
}

export default async function PastRecordDetailPage({ params }: PastRecordDetailPageProps) {
  const authResult = await requireAuthSafe(["SUPER_ADMIN", "DOCTOR", "NURSE", "RECEPTIONIST", "ACCOUNTANT"])
  if (!authResult.ok) redirect("/dashboard")

  const { admissionId } = await params
  const result = await getFullAdmissionHistory(admissionId)

  if (!result.success || !result.data) {
    notFound()
  }

  return <PastRecordDetailClient record={result.data} />
}
