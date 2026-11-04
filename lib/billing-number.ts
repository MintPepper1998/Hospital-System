import type { Prisma } from "@prisma/client"

/**
 * Generate the next `BILL-YYYY-NNNN` bill number INSIDE an interactive transaction.
 *
 * - Takes a transaction-scoped Postgres advisory lock so concurrent callers of this
 *   helper are serialized until their transaction commits (no duplicate numbers).
 * - Uses a numeric MAX() instead of string ordering, so numbering keeps working
 *   past BILL-YYYY-9999 (string sort would put "10000" before "9999").
 */
export async function nextPharmacyBillNumber(tx: Prisma.TransactionClient): Promise<string> {
  const year = new Date().getFullYear()
  const prefix = `BILL-${year}-`

  await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext('billing_bill_number'))`

  const rows = await tx.$queryRaw<{ max: number | null }[]>`
    SELECT MAX(CAST(split_part("billNumber", '-', 3) AS INTEGER)) AS max
    FROM "billings"
    WHERE "billNumber" ~ ${`^BILL-${year}-[0-9]+$`}
  `
  const lastSeq = Number(rows[0]?.max ?? 0)
  return `${prefix}${String(lastSeq + 1).padStart(4, "0")}`
}
