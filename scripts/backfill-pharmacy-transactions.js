const { PrismaClient } = require("@prisma/client")
const prisma = new PrismaClient()

async function main() {
  console.log("=== Backfilling Pharmacy Transactions (Pass 2) ===")

  // Find all PHARMACY billings that are PAID
  const billings = await prisma.billing.findMany({
    where: {
      type: "PHARMACY",
      status: "PAID",
    },
  })

  // Get all existing transactions for these bills
  const existingTxns = await prisma.transaction.findMany({
    where: {
      category: "PHARMACY_SALE",
      referenceId: { in: billings.map(b => b.id) }
    },
    select: { referenceId: true }
  })
  
  const existingSet = new Set(existingTxns.map(t => t.referenceId))
  const billsToProcess = billings.filter(b => !existingSet.has(b.id))

  console.log(`Found ${billsToProcess.length} pharmacy sales to backfill (out of ${billings.length} total paid bills).`)

  if (billsToProcess.length === 0) {
    console.log("Nothing to do.")
    return
  }

  // Helper to resolve the correct pharmacy account based on payment method
  async function resolveAccount(method) {
    let type = "CASH"
    if (method === "UPI") type = "UPI"
    if (method === "CARD") type = "CARD"
    
    let account = await prisma.financialAccount.findFirst({
      where: { type, scope: "PHARMACY", isActive: true }
    })
    
    if (!account) {
      console.log(`WARNING: No active PHARMACY account found for type ${type}. Creating one...`)
      const names = { CASH: "Pharmacy Cash Drawer", UPI: "Pharmacy UPI Account", CARD: "Pharmacy Card Account" }
      account = await prisma.financialAccount.create({
        data: {
          name: names[type] || `Pharmacy ${type} Account`,
          type,
          scope: "PHARMACY",
          currentBalance: 0,
          openingBalance: 0
        }
      })
    }
    return account.id
  }

  let successCount = 0

  for (const bill of billsToProcess) {
    try {
      if (bill.netAmount <= 0) continue

      await prisma.$transaction(async (tx) => {
        if (bill.paymentMethod === "SPLIT") {
          let cashAmt = bill.splitCashAmount || 0
          let upiAmt = bill.splitUpiAmount || 0
          let cardAmt = bill.splitCardAmount || 0
          
          // Parse from notes if they are null but method is SPLIT
          if (cashAmt === 0 && upiAmt === 0 && cardAmt === 0 && bill.notes) {
            // Match pattern: SPLIT (Cash: ₹247, UPI: ₹738, Card: ₹0)
            const cashMatch = bill.notes.match(/Cash:\s*₹?([\d.]+)/i)
            const upiMatch = bill.notes.match(/UPI:\s*₹?([\d.]+)/i)
            const cardMatch = bill.notes.match(/Card:\s*₹?([\d.]+)/i)
            if (cashMatch) cashAmt = parseFloat(cashMatch[1]) || 0
            if (upiMatch) upiAmt = parseFloat(upiMatch[1]) || 0
            if (cardMatch) cardAmt = parseFloat(cardMatch[1]) || 0
          }

          const parts = []
          if (cashAmt > 0) parts.push({ method: "CASH", amount: cashAmt })
          if (upiAmt > 0) parts.push({ method: "UPI", amount: upiAmt })
          if (cardAmt > 0) parts.push({ method: "CARD", amount: cardAmt })
          
          // Fallback if parsing completely fails but it says SPLIT: put it all in CASH
          if (parts.length === 0) {
             parts.push({ method: "CASH", amount: bill.netAmount })
          }

          for (const part of parts) {
            const accountId = await resolveAccount(part.method)
            await tx.transaction.create({
              data: {
                accountId,
                type: "INCOME",
                amount: part.amount,
                category: "PHARMACY_SALE",
                paymentMethod: part.method,
                scope: "PHARMACY",
                referenceId: bill.id,
                description: `Pharmacy sale (split ${part.method.toLowerCase()}) - ${bill.billNumber}`,
                date: bill.billDate
              }
            })
            await tx.financialAccount.update({
              where: { id: accountId },
              data: { currentBalance: { increment: part.amount } }
            })
          }
        } else {
          // Single method
          const accountId = await resolveAccount(bill.paymentMethod || "CASH")
          await tx.transaction.create({
            data: {
              accountId,
              type: "INCOME",
              amount: bill.netAmount,
              category: "PHARMACY_SALE",
              paymentMethod: bill.paymentMethod || "CASH",
              scope: "PHARMACY",
              referenceId: bill.id,
              description: `Pharmacy sale - ${bill.billNumber}`,
              date: bill.billDate
            }
          })
          await tx.financialAccount.update({
            where: { id: accountId },
            data: { currentBalance: { increment: bill.netAmount } }
          })
        }
      })
      
      successCount++
    } catch (err) {
      console.error(`Failed to process bill ${bill.billNumber}:`, err.message)
    }
  }

  console.log(`\nSuccessfully backfilled ${successCount} transactions.`)
  
  // Show new balances
  const accounts = await prisma.financialAccount.findMany({
    where: { scope: "PHARMACY" },
    select: { name: true, currentBalance: true }
  })
  
  console.log("\nNew Pharmacy Balances:")
  accounts.forEach(a => console.log(`- ${a.name}: ₹${a.currentBalance}`))
  
  console.log("\n=== Complete ===")
}

main().finally(() => prisma.$disconnect())
