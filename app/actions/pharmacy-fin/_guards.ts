// Internal helper — intentionally NOT "use server" so it isn't exposed as a client-callable action.
export async function assertDayOpen(tx: any, accountId: string, date: Date | string) {
  const account = await tx.financialAccount.findUnique({ where: { id: accountId } })
  if (!account || account.type !== "CASH") return // Only CASH accounts have day close constraints

  const d = typeof date === "string" && !date.includes("T") ? new Date(date + "T12:00:00+05:30") : new Date(date)
  const businessDateStr = d.toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" })

  const closed = await tx.pharmacyDayClose.findUnique({
    where: { businessDate_accountId: { businessDate: businessDateStr, accountId } }
  })
  
  if (closed) {
    throw new Error(`Day ${businessDateStr} is already closed for "${account.name}". No transactions can be added or voided for a closed business date.`)
  }
}
