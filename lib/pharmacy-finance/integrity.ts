import { prisma } from "@/lib/prisma"

export async function checkAccountIntegrity(accountId: string): Promise<{ ok: boolean; difference: number }> {
  const account = await prisma.financialAccount.findUnique({ where: { id: accountId } })
  if (!account) throw new Error("Account not found")

  const txns = await prisma.transaction.groupBy({
    by: ["type"],
    where: { accountId },
    _sum: { amount: true }
  })
  
  const inSum = txns.find(t => t.type === "INCOME")?._sum.amount || 0
  const outSum = txns.find(t => t.type === "EXPENSE")?._sum.amount || 0

  // Note: createPharmacyAccount sets openingBalance and currentBalance directly
  // and does NOT create a separate OPENING_BALANCE transaction. 
  // Thus, we simply add openingBalance to the net transaction sum.
  const expected = account.openingBalance + inSum - outSum
  const diff = Math.abs(expected - account.currentBalance)
  
  return { ok: diff < 0.01, difference: account.currentBalance - expected }
}
