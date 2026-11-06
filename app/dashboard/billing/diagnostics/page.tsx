import { redirect } from "next/navigation"

export default function DiagnosticsBillingRedirect() {
  redirect("/dashboard/billing-counter/diagnostics")
}
