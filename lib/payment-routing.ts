import type { PrismaClient, Prisma } from "@prisma/client"

/**
 * Canonical payment method options used across the entire ERP.
 * Every dropdown should reference this array.
 */
export const PAYMENT_METHOD_OPTIONS = [
  { value: "CASH", label: "Cash" },
  { value: "UPI", label: "UPI / QR Code" },
  { value: "CARD", label: "Card (Debit/Credit)" },
  { value: "BANK_TRANSFER", label: "Bank Transfer / NEFT" },
  { value: "INSURANCE", label: "Private Insurance / TPA" },
  { value: "BSKY", label: "BSKY (Government)" },
] as const

export const PAYMENT_METHOD_LABELS: Record<string, string> = Object.fromEntries(
  PAYMENT_METHOD_OPTIONS.map((o) => [o.value, o.label])
)

/**
 * Given a payment method string and scope, resolve (or auto-create) the correct
 * FinancialAccount ledger inside a Prisma transaction.
 *
 * Hospital routing:
 *   CASH          → "Main Cash Drawer"  (type CASH)
 *   UPI           → "UPI Bank Account"  (type BANK)
 *   CARD          → "Card Bank Account" (type BANK)
 *   BANK_TRANSFER → "Bank Transfer Account" (type BANK)
 *   INSURANCE     → "Private Insurance Receivables" (type BANK)
 *   BSKY          → "Government Claims"  (type BANK)
 *
 * Pharmacy routing:
 *   CASH          → "Pharmacy Cash Drawer" (type CASH)
 *   UPI           → "Pharmacy UPI Account" (type BANK)
 *   CARD          → "Pharmacy Card Account" (type BANK)
 *   BANK_TRANSFER → "Pharmacy Bank Account" (type BANK)
 *
 * Returns the account ID, or null if creation fails.
 */
export async function resolveFinancialAccount(
  tx: Omit<PrismaClient, "$connect" | "$disconnect" | "$on" | "$transaction" | "$use" | "$extends">,
  paymentMethod: string,
  scope: "HOSPITAL" | "PHARMACY" = "HOSPITAL"
): Promise<string | null> {
  const HOSPITAL_MAPPING: Record<string, { name: string; type: string }> = {
    CASH: { name: "Main Cash Drawer", type: "CASH" },
    UPI: { name: "UPI Bank Account", type: "BANK" },
    CARD: { name: "Card Bank Account", type: "BANK" },
    BANK_TRANSFER: { name: "Bank Transfer Account", type: "BANK" },
    INSURANCE: { name: "Private Insurance Receivables", type: "BANK" },
    BSKY: { name: "Government Claims", type: "BANK" },
  }

  const PHARMACY_MAPPING: Record<string, { name: string; type: string }> = {
    CASH: { name: "Pharmacy Cash Drawer", type: "CASH" },
    UPI: { name: "Pharmacy UPI Account", type: "BANK" },
    CARD: { name: "Pharmacy Card Account", type: "BANK" },
    BANK_TRANSFER: { name: "Pharmacy Bank Account", type: "BANK" },
  }

  const mapping = scope === "PHARMACY" ? PHARMACY_MAPPING : HOSPITAL_MAPPING
  const fallback = scope === "PHARMACY" ? PHARMACY_MAPPING.CASH : HOSPITAL_MAPPING.CASH
  const target = mapping[paymentMethod] || fallback

  let account = await (tx as any).financialAccount.findFirst({
    where: { name: target.name, scope },
  })

  if (!account) {
    account = await (tx as any).financialAccount.create({
      data: {
        name: target.name,
        type: target.type,
        scope,
        openingBalance: 0,
        currentBalance: 0,
      },
    })
  }

  return account?.id ?? null
}
