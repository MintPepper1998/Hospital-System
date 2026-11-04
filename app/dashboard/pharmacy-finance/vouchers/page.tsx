import { Metadata } from "next"
import { requireAuthSafe } from "@/lib/auth-guard"
import { redirect } from "next/navigation"
import {
  getPharmacyVoucherFormContext,
  getPharmacyDoubleVouchers,
} from "@/app/actions/pharmacy-fin/vouchers"
import { PharmacyVouchersClient } from "./vouchers-client"

export const metadata: Metadata = {
  title: "Voucher Entry | Pharmacy Finance",
  description: "Record double-entry receipts, payments, contra, and journal vouchers for Pharmacy",
}

export default async function VoucherEntryPage() {
  const auth = await requireAuthSafe(["SUPER_ADMIN", "ADMIN", "ACCOUNTANT", "PHARMACIST"])
  if (!auth.ok) redirect("/login")

  const [formContext, vouchersResult] = await Promise.all([
    getPharmacyVoucherFormContext(),
    getPharmacyDoubleVouchers({ limit: 50 }),
  ])

  return (
    <PharmacyVouchersClient
      accountGroups={formContext.accountGroups}
      pharmacyAccounts={formContext.pharmacyAccounts}
      initialDoubleVouchers={JSON.parse(JSON.stringify(vouchersResult.vouchers))}
      initialLegacyVouchers={JSON.parse(JSON.stringify(vouchersResult.legacyVouchers || []))}
      initialTotal={vouchersResult.total}
    />
  )
}
