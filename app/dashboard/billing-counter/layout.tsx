import { requireBillingCounterAccess } from "@/lib/billing-counter-access"
import { redirect } from "next/navigation"

export default async function BillingCounterLayout({ children }: { children: React.ReactNode }) {
  try {
    await requireBillingCounterAccess()
  } catch {
    redirect("/dashboard")
  }
  return children
}
