import { Metadata } from "next"
import { requireAuthSafe } from "@/lib/auth-guard"
import { redirect } from "next/navigation"
import { PharmacyGeneralLedgerClient } from "./general-ledger-client"

export const metadata: Metadata = {
  title: "General Ledger | Pharmacy Finance",
  description: "Chronological double-entry audit trail for pharmacy operations",
}

export default async function PharmacyGeneralLedgerPage() {
  const auth = await requireAuthSafe(["SUPER_ADMIN", "ADMIN", "ACCOUNTANT", "PHARMACIST"])
  if (!auth.ok) redirect("/login")

  return <PharmacyGeneralLedgerClient />
}

