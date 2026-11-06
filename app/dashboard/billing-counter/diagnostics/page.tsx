import { redirect } from "next/navigation"
import { requireBillingCounterAccessSafe, BILLING_COUNTER_PERMISSIONS } from "@/lib/billing-counter-access"
import {
  getDiagnosticCatalogTests,
  getActiveCasualtyPatientsForDiagnostics,
  getAllPatientsWithPendingDiagnostics,
} from "@/lib/actions/diagnostics"
import { DiagnosticsBillingClient } from "./diagnostics-billing-client"

export const dynamic = "force-dynamic"

export default async function DiagnosticsBillingPage() {
  const authResult = await requireBillingCounterAccessSafe(
    BILLING_COUNTER_PERMISSIONS.diagnostics
  )
  if (!authResult.ok) {
    redirect("/dashboard/billing-counter")
  }

  const [catalogRes, casualtyRes, pendingOrdersRes] = await Promise.all([
    getDiagnosticCatalogTests(),
    getActiveCasualtyPatientsForDiagnostics(),
    getAllPatientsWithPendingDiagnostics(),
  ])

  const catalogTests = catalogRes.success && catalogRes.data ? (catalogRes.data as any) : []
  const casualtyPatients = casualtyRes.success && casualtyRes.data ? (casualtyRes.data as any) : []
  const pendingOrders =
    pendingOrdersRes.success && pendingOrdersRes.data ? (pendingOrdersRes.data as any) : []

  return (
    <DiagnosticsBillingClient
      catalogTests={catalogTests}
      initialCasualtyPatients={casualtyPatients}
      initialPendingOrderPatients={pendingOrders}
    />
  )
}
