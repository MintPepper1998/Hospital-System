/**
 * Seeds a realistic month of PHARMACY cash-side data so Pharmacy Finance has something to show:
 *   - Pharmacy accounts (same names/types as lib/payment-routing.ts uses for live sales)
 *   - One PHARMACY_SALE ledger entry per paid pharmacy bill (dated on the bill date)
 *   - Purchase invoices built from the existing inventory batches, spread over the period
 *   - Supplier payments against those invoices (older ones paid, middle ones partly, recent unpaid)
 *   - Day-to-day expenses (rent, salary, electricity, packaging, transport, misc)
 *   - Weekly cash deposits and UPI sweeps into the bank (internal transfers)
 * Finally recomputes each account's currentBalance = openingBalance + in - out.
 *
 * Safe to re-run: aborts if any PHARMACY ledger entries already exist.
 * Usage: npx tsx scripts/pharmacy-finance/seed-cash-ledger.ts
 */
import { PrismaClient } from "@prisma/client"
import { resolveAccountGroupCode } from "../../lib/account-group-resolver"
import { EXPENSE_HEADS } from "../../lib/pharmacy-finance/constants"

const prisma = new PrismaClient()
const DAY = 86_400_000

// Deterministic RNG so re-seeding a fresh DB gives the same numbers
let seed = 20261007
const rand = () => ((seed = (seed * 1103515245 + 12345) % 2 ** 31) / 2 ** 31)
const between = (a: number, b: number) => Math.round(a + rand() * (b - a))
const r2 = (n: number) => Math.round(n * 100) / 100

/** IST wall-clock time on a given IST calendar day */
function ist(day: Date, hh: number, mm = 0) {
  const ymd = day.toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" })
  return new Date(`${ymd}T${String(hh).padStart(2, "0")}:${String(mm).padStart(2, "0")}:00+05:30`)
}

async function main() {
  const existing = await prisma.transaction.count({ where: { scope: "PHARMACY" } })
  if (existing > 0) {
    console.log(`Aborting: ${existing} PHARMACY ledger entries already exist.`)
    return
  }

  const now = new Date()
  const admin = await prisma.user.findFirst({ where: { role: "SUPER_ADMIN" }, select: { id: true } })
  if (!admin) throw new Error("No SUPER_ADMIN user found (needed for createdBy)")

  // 0. Bills dated in the future (left over from the earlier seed) -> move back one day
  const future = await prisma.billing.findMany({ where: { type: "PHARMACY", billDate: { gt: now } }, select: { id: true, billDate: true } })
  for (const b of future) {
    await prisma.billing.update({ where: { id: b.id }, data: { billDate: new Date(b.billDate.getTime() - DAY) } })
  }
  console.log(`Moved ${future.length} future-dated bills back one day`)

  // 1. Accounts
  const ensure = async (name: string, type: string, openingBalance: number, extra: object = {}) =>
    (await prisma.financialAccount.findFirst({ where: { name, scope: "PHARMACY" } })) ??
    prisma.financialAccount.create({ data: { name, type, scope: "PHARMACY", openingBalance, currentBalance: openingBalance, ...extra } })

  const cash = await ensure("Pharmacy Cash Drawer", "CASH", 20000)
  const upi = await ensure("Pharmacy UPI Account", "BANK", 0)
  const bank = await ensure("Pharmacy Bank Account", "BANK", 300000, { bankName: "State Bank of India", accountNumber: "XXXX4821" })
  const card = await ensure("Pharmacy Card Account", "BANK", 0)
  const accountFor: Record<string, string> = { CASH: cash.id, UPI: upi.id, CARD: card.id, BANK_TRANSFER: bank.id }

  const txns: any[] = []
  const push = (t: any) => txns.push({ scope: "PHARMACY", billingType: "PHARMACY", ...t })

  // 2. Sales ledger entries (mirrors lib/actions.ts pharmacy sale flow)
  const bills = await prisma.billing.findMany({
    where: { type: "PHARMACY", status: "PAID", netAmount: { gt: 0 } },
    orderBy: { billDate: "asc" },
  })
  for (const b of bills) {
    const parts = b.paymentMethod === "SPLIT"
      ? [["CASH", b.splitCashAmount], ["UPI", b.splitUpiAmount], ["CARD", b.splitCardAmount]].filter(([, a]) => (a as number) > 0) as [string, number][]
      : [[b.paymentMethod || "CASH", b.netAmount] as [string, number]]
    for (const [method, amount] of parts) {
      push({
        accountId: accountFor[method] ?? cash.id, type: "INCOME", amount, category: "PHARMACY_SALE",
        paymentMethod: method, referenceId: b.id, accountGroupCode: "4150",
        description: `Pharmacy sale${parts.length > 1 ? ` (split ${method.toLowerCase()})` : ""} - ${b.billNumber}`,
        date: b.billDate,
      })
    }
  }
  console.log(`Sales: ${bills.length} bills -> ${txns.length} ledger entries`)

  const start = bills[0]?.billDate ?? new Date(now.getTime() - 45 * DAY)
  const spanDays = Math.max(1, Math.floor((now.getTime() - start.getTime()) / DAY))

  // 3. Purchase invoices from existing batches (2 invoices per supplier, spread across the period)
  const batches = await prisma.inventoryBatch.findMany({ include: { medicine: { select: { name: true, hsnCode: true } } }, orderBy: { createdAt: "asc" } })
  const bySupplier = new Map<string, typeof batches>()
  batches.forEach(b => bySupplier.set(b.supplierId, [...(bySupplier.get(b.supplierId) ?? []), b]))

  const groups: { supplierId: string; items: typeof batches }[] = []
  for (const [supplierId, list] of bySupplier) {
    const half = Math.ceil(list.length / 2)
    groups.push({ supplierId, items: list.slice(0, half) })
    if (list.length > half) groups.push({ supplierId, items: list.slice(half) })
  }

  const invoices: { id: string; supplierId: string; date: Date; total: number; number: string }[] = []
  for (let gi = 0; gi < groups.length; gi++) {
    const g = groups[gi]
    // Evenly spaced from day 1 to ~3 days ago
    const date = ist(new Date(start.getTime() + Math.floor(((gi + 0.5) / groups.length) * (spanDays - 3)) * DAY), 11, between(0, 59))
    const number = `INV-${date.toISOString().slice(2, 10).replace(/-/g, "")}-${String(gi + 1).padStart(3, "0")}`
    let subTotal = 0, taxTotal = 0
    const items = g.items.map(b => {
      const qty = b.originalQuantity || b.quantity
      const line = r2(qty * b.purchasePrice)
      subTotal += line
      taxTotal += r2(line * (b.taxPercent / 100))
      return {
        itemName: b.medicine.name, medicineId: b.medicineId, batchNumber: b.batchNumber, expiryDate: b.expiryDate,
        hsnCode: b.medicine.hsnCode, quantity: qty, rate: b.purchasePrice, sellPrice: b.sellingPrice,
        taxPercent: b.taxPercent, totalAmount: r2(line * (1 + b.taxPercent / 100)), packSize: b.medicinesPerStrip,
      }
    })
    const exact = subTotal + taxTotal
    const grandTotal = Math.round(exact)
    const inv = await prisma.purchaseInvoice.create({
      data: {
        invoiceNumber: number, date, supplierId: g.supplierId, subTotal: r2(subTotal), taxTotal: r2(taxTotal),
        grandTotal, roundOff: r2(grandTotal - exact), items: { create: items },
      },
    })
    await prisma.inventoryBatch.updateMany({
      where: { id: { in: g.items.map(b => b.id) } },
      data: { purchaseDate: date, invoiceNumber: number, invoiceDate: date, grnNumber: `GRN-${number.slice(4)}` },
    })
    invoices.push({ id: inv.id, supplierId: g.supplierId, date, total: grandTotal, number })
  }
  console.log(`Purchases: ${invoices.length} invoices, ₹${invoices.reduce((s, i) => s + i.total, 0).toLocaleString("en-IN")}`)

  // 4. Supplier payments: >25 days old -> paid in full, 10-25 days -> ~50%, newer -> unpaid
  const supplierGroup = resolveAccountGroupCode("EXPENSE", "SUPPLIER_PAYMENT", null, "PHARMACY")
  let paidTotal = 0
  for (const inv of invoices) {
    const age = (now.getTime() - inv.date.getTime()) / DAY
    const share = age > 25 ? 1 : age > 10 ? 0.5 : 0
    if (!share) continue
    const amount = share === 1 ? inv.total : Math.round(inv.total * share)
    const payDate = ist(new Date(Math.min(inv.date.getTime() + between(7, 12) * DAY, now.getTime() - DAY)), 15, between(0, 59))
    const pay = await prisma.supplierPayment.create({
      data: {
        supplierId: inv.supplierId, invoiceId: inv.id, amount, paymentMethod: "BANK_TRANSFER", accountId: bank.id,
        referenceNo: `NEFT${between(100000, 999999)}`, date: payDate, createdBy: admin.id,
        notes: share === 1 ? `Full settlement of ${inv.number}` : `Part payment against ${inv.number}`,
      },
    })
    await prisma.purchaseInvoice.update({ where: { id: inv.id }, data: { amountPaid: amount, status: share === 1 ? "PAID" : "PARTIAL" } })
    push({
      accountId: bank.id, type: "EXPENSE", amount, category: "SUPPLIER_PAYMENT", paymentMethod: "BANK_TRANSFER",
      referenceId: pay.id, accountGroupCode: supplierGroup, description: "Supplier payment against invoice — BANK_TRANSFER", date: payDate,
    })
    paidTotal += amount
  }
  console.log(`Supplier payments: ₹${paidTotal.toLocaleString("en-IN")}`)

  // 5. Expenses + 6. internal transfers, walked day by day
  const expense = (accountId: string, method: string, head: string, amount: number, date: Date, payee: string) =>
    push({
      accountId, type: "EXPENSE", amount, category: "PHARMACY_EXPENSE", subCategory: head, paymentMethod: method,
      accountGroupCode: EXPENSE_HEADS[head].accountGroupCode, description: `${EXPENSE_HEADS[head].label} — ${payee}`, date,
      billingType: undefined,
    })
  const transfer = (from: { id: string; name: string; type: string }, to: { id: string; name: string; type: string }, amount: number, date: Date, note: string) => {
    const ref = crypto.randomUUID()
    push({ accountId: from.id, type: "EXPENSE", amount, category: "INTERNAL_TRANSFER_OUT", paymentMethod: to.type, referenceId: ref, description: `Transfer to ${to.name} (${note})`, date, billingType: undefined })
    push({ accountId: to.id, type: "INCOME", amount, category: "INTERNAL_TRANSFER_IN", paymentMethod: from.type, referenceId: ref, description: `Transfer from ${from.name} (${note})`, date, billingType: undefined })
  }
  const balanceAt = (accountId: string, opening: number, until: Date) =>
    txns.filter(t => t.accountId === accountId && t.date < until).reduce((s, t) => s + (t.type === "INCOME" ? t.amount : -t.amount), opening)

  for (let d = 0; d <= spanDays; d++) {
    const day = new Date(start.getTime() + d * DAY)
    if (ist(day, 0) > now) break
    const dom = Number(day.toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" }).slice(8, 10))
    const dow = new Date(ist(day, 12)).getUTCDay() // 0 = Sunday

    if (dom === 1) {
      expense(bank.id, "BANK_TRANSFER", "RENT", 6000, ist(day, 10), "Shop rent – landlord")
      expense(bank.id, "BANK_TRANSFER", "SALARY", 9000, ist(day, 10, 30), "Pharmacy assistant salary")
    }
    if (dom === 5) expense(bank.id, "BANK_TRANSFER", "ELECTRICITY", between(1400, 2100), ist(day, 12), "TPCODL electricity bill")
    if (dom === 10) expense(bank.id, "BANK_TRANSFER", "IT", 999, ist(day, 12), "Broadband + billing software")
    if (dom === 15) expense(cash.id, "CASH", "LICENCE", 500, ist(day, 13), "Drug licence renewal fee")
    if (dow === 1) expense(cash.id, "CASH", "PACKAGING", between(150, 320), ist(day, 10, 15), "Carry bags & pouches")
    if (dow === 3 || dow === 6) expense(cash.id, "CASH", "TRANSPORT", between(80, 250), ist(day, 17), "Courier / auto for stock pickup")
    if (rand() < 0.35) expense(cash.id, "CASH", "MISC", between(40, 120), ist(day, 16, 30), "Tea & sundries")
    if (dom === 20) expense(bank.id, "BANK_TRANSFER", "BANK_CHARGES", between(60, 180), ist(day, 18), "UPI/merchant charges")

    // Saturday evening: deposit cash above a ₹15k float, sweep UPI collections to bank
    if (dow === 6) {
      const at = ist(day, 20)
      const cashBal = balanceAt(cash.id, cash.openingBalance, at)
      if (cashBal > 15000) transfer(cash, bank, Math.floor((cashBal - 15000) / 100) * 100, at, "weekly cash deposit")
      const upiBal = r2(balanceAt(upi.id, upi.openingBalance, at))
      if (upiBal > 0) transfer(upi, bank, upiBal, ist(day, 20, 5), "weekly UPI settlement")
    }
  }

  // Sanity: no account may go negative at any point
  txns.sort((a, b) => a.date.getTime() - b.date.getTime())
  for (const acc of [cash, upi, bank, card]) {
    let bal = acc.openingBalance
    for (const t of txns.filter(t => t.accountId === acc.id)) {
      bal += t.type === "INCOME" ? t.amount : -t.amount
      if (bal < -0.01) throw new Error(`${acc.name} would go negative (₹${bal.toFixed(2)}) on ${t.date.toISOString()}`)
    }
  }

  await prisma.transaction.createMany({ data: txns.map(t => ({ ...t, createdAt: t.date })) })

  // Recompute balances from the ledger (keeps currentBalance == opening + in - out)
  for (const acc of [cash, upi, bank, card]) {
    const sums = await prisma.transaction.groupBy({ by: ["type"], where: { accountId: acc.id }, _sum: { amount: true } })
    const inSum = sums.find(s => s.type === "INCOME")?._sum.amount ?? 0
    const outSum = sums.find(s => s.type === "EXPENSE")?._sum.amount ?? 0
    const currentBalance = r2(acc.openingBalance + inSum - outSum)
    await prisma.financialAccount.update({ where: { id: acc.id }, data: { currentBalance } })
    console.log(`  ${acc.name.padEnd(24)} opening ₹${acc.openingBalance.toLocaleString("en-IN").padStart(9)}  ->  now ₹${currentBalance.toLocaleString("en-IN")}`)
  }
  console.log(`Done: ${txns.length} ledger entries written.`)
}

main().catch(e => { console.error(e); process.exit(1) }).finally(() => prisma.$disconnect())
