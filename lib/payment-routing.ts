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
  const normMethod = (paymentMethod || "CASH").toUpperCase()

  if (scope === "PHARMACY") {
    const PHARMACY_MAPPING: Record<string, { name: string; type: string }> = {
      CASH: { name: "Pharmacy Cash Drawer", type: "CASH" },
      UPI: { name: "Pharmacy UPI Account", type: "UPI" },
      CARD: { name: "Pharmacy Card Account", type: "BANK" },
      BANK_TRANSFER: { name: "Pharmacy Bank Account", type: "BANK" },
    }
    const target = PHARMACY_MAPPING[normMethod] || PHARMACY_MAPPING.CASH

    // 1. Try finding active account with exact name
    let account = await (tx as any).financialAccount.findFirst({
      where: { name: target.name, scope: "PHARMACY", isActive: true },
    })

    // 2. Fallback to active account of same type
    if (!account) {
      account = await (tx as any).financialAccount.findFirst({
        where: { type: target.type, scope: "PHARMACY", isActive: true },
        orderBy: { createdAt: "asc" },
      })
    }

    // 3. Fallback: create if missing
    if (!account) {
      account = await (tx as any).financialAccount.create({
        data: {
          name: target.name,
          type: target.type,
          scope: "PHARMACY",
          openingBalance: 0,
          currentBalance: 0,
          isActive: true,
        },
      })
    }

    return account?.id ?? null
  }

  // scope === "HOSPITAL"
  // Cash payments
  if (normMethod === "CASH") {
    // 1. Try finding active canonical "Hospital Cash Account"
    let account = await (tx as any).financialAccount.findFirst({
      where: { name: "Hospital Cash Account", scope: "HOSPITAL", isActive: true },
    })

    // 2. Fallback to any active CASH account in HOSPITAL
    if (!account) {
      account = await (tx as any).financialAccount.findFirst({
        where: { type: { in: ["CASH", "PETTY_CASH"] }, scope: "HOSPITAL", isActive: true },
        orderBy: { createdAt: "asc" },
      })
    }

    // 3. Fallback: create "Hospital Cash Account"
    if (!account) {
      account = await (tx as any).financialAccount.create({
        data: {
          name: "Hospital Cash Account",
          type: "CASH",
          scope: "HOSPITAL",
          openingBalance: 0,
          currentBalance: 0,
          isActive: true,
        },
      })
    }

    return account?.id ?? null
  }

  // Non-cash / Digital / Bank / Insurance / BSKY payments:
  // 1. Check if a specific active account exists matching the method
  const SPECIFIC_HOSPITAL_MAPPING: Record<string, { name: string; type: string }> = {
    UPI: { name: "UPI Bank Account", type: "BANK" },
    CARD: { name: "Card Bank Account", type: "BANK" },
    BANK_TRANSFER: { name: "Bank Transfer Account", type: "BANK" },
    INSURANCE: { name: "Private Insurance Receivables", type: "BANK" },
    BSKY: { name: "Government Claims", type: "BANK" },
  }
  const specific = SPECIFIC_HOSPITAL_MAPPING[normMethod]
  if (specific) {
    const specificAccount = await (tx as any).financialAccount.findFirst({
      where: { name: specific.name, scope: "HOSPITAL", isActive: true },
    })
    if (specificAccount) return specificAccount.id
  }

  // 2. Default canonical: active "Hospital Bank Account"
  let account = await (tx as any).financialAccount.findFirst({
    where: { name: "Hospital Bank Account", scope: "HOSPITAL", isActive: true },
  })

  // 3. Fallback to any active BANK account in HOSPITAL
  if (!account) {
    account = await (tx as any).financialAccount.findFirst({
      where: { type: "BANK", scope: "HOSPITAL", isActive: true },
      orderBy: { createdAt: "asc" },
    })
  }

  // 4. Fallback: create "Hospital Bank Account"
  if (!account) {
    account = await (tx as any).financialAccount.create({
      data: {
        name: "Hospital Bank Account",
        type: "BANK",
        scope: "HOSPITAL",
        openingBalance: 0,
        currentBalance: 0,
        isActive: true,
      },
    })
  }

  return account?.id ?? null
}
