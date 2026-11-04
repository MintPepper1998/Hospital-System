"use server"

import { revalidatePath } from "next/cache"
import { prisma } from "@/lib/prisma"
import { Prisma } from "@prisma/client"
import { requireAuthSafe } from "@/lib/auth-guard"
import { istDayStart, todayStr } from "@/lib/pharmacy-finance/dates"
import { writeAuditLog } from "@/lib/audit"
import { assertDayOpen } from "./_guards"

export async function createPharmacyVoucher(data: {
  type: string
  amount: number
  accountId?: string
  contraAccountId?: string
  partyName?: string
  particulars: string
  notes?: string
  date: string
}) {
  const auth = await requireAuthSafe(["SUPER_ADMIN", "ACCOUNTANT", "PHARMACIST"])
  if (!auth.ok) return { success: false, message: auth.error }

  try {
    if (!data.amount || data.amount <= 0) return { success: false, message: "Amount must be > 0" }
    if (!data.type || !["RECEIPT", "PAYMENT", "CONTRA", "JOURNAL"].includes(data.type)) {
      return { success: false, message: "Invalid voucher type" }
    }

    const today = todayStr()
    if (data.date > today) {
      return { success: false, message: "Voucher date cannot be in the future" }
    }

    const now = new Date()
    const isToday = data.date === today
    const finalDate = isToday ? now : istDayStart(data.date)

    const sessionWithId = auth.session as { userId?: string; id?: string }
    const userId = sessionWithId.userId || sessionWithId.id || "SYSTEM"

    const voucherNumber = await prisma.$transaction(async (tx) => {
      // Generate Voucher Number
      const prefix = `PV-${finalDate.getFullYear()}${(finalDate.getMonth() + 1).toString().padStart(2, "0")}`
      const lastVoucher = await tx.pharmacyVoucher.findFirst({
        where: { voucherNumber: { startsWith: prefix } },
        orderBy: { voucherNumber: "desc" },
      })
      const lastSeq = lastVoucher ? parseInt(lastVoucher.voucherNumber.split("-").pop() || "0") : 0
      let seq = lastSeq + 1
      let candidateNumber = `${prefix}-${seq.toString().padStart(3, "0")}`

      while (await tx.pharmacyVoucher.findUnique({ where: { voucherNumber: candidateNumber }, select: { id: true } })) {
        seq++
        candidateNumber = `${prefix}-${seq.toString().padStart(3, "0")}`
      }

      // Basic validations based on type
      if (data.type === "CONTRA") {
        if (!data.accountId || !data.contraAccountId) throw new Error("Both accounts required for Contra")
        if (data.accountId === data.contraAccountId) throw new Error("Cannot transfer to the same account")
      } else if (data.type !== "JOURNAL") {
        if (!data.accountId) throw new Error("Account required")
      }

      // Check and update primary account
      if (data.accountId) {
        const account = await tx.financialAccount.findUnique({ where: { id: data.accountId } })
        if (!account) throw new Error("Account not found")
        if (!account.isActive) throw new Error("Account is inactive")
        if (account.scope !== "PHARMACY") throw new Error("Must use a PHARMACY account")
        await assertDayOpen(tx, account.id, finalDate)

        if (data.type === "PAYMENT" || data.type === "CONTRA") {
          if (account.currentBalance < data.amount) {
            throw new Error(
              `Insufficient balance in ${account.name} (Available: ₹${account.currentBalance.toFixed(2)}, Required: ₹${data.amount.toFixed(2)})`
            )
          }
          await tx.financialAccount.update({
            where: { id: account.id },
            data: { currentBalance: { decrement: data.amount } },
          })
        } else if (data.type === "RECEIPT") {
          await tx.financialAccount.update({
            where: { id: account.id },
            data: { currentBalance: { increment: data.amount } },
          })
        }
      }

      // Check and update contra account (for transfers)
      if (data.type === "CONTRA" && data.contraAccountId) {
        const contra = await tx.financialAccount.findUnique({ where: { id: data.contraAccountId } })
        if (!contra) throw new Error("Destination account not found")
        if (!contra.isActive) throw new Error("Destination account is inactive")
        if (contra.scope !== "PHARMACY") throw new Error("Must use a PHARMACY account for destination")
        await assertDayOpen(tx, contra.id, finalDate)

        await tx.financialAccount.update({
          where: { id: contra.id },
          data: { currentBalance: { increment: data.amount } },
        })
      }

      // Create Voucher Record
      const voucher = await tx.pharmacyVoucher.create({
        data: {
          voucherNumber: candidateNumber,
          type: data.type,
          amount: data.amount,
          date: finalDate,
          accountId: data.accountId || null,
          contraAccountId: data.contraAccountId || null,
          partyName: data.partyName || null,
          particulars: data.particulars,
          notes: data.notes || null,
          createdBy: userId,
        },
      })

      // Create Ledger Transactions
      if (data.type === "PAYMENT" && data.accountId) {
        await tx.transaction.create({
          data: {
            accountId: data.accountId,
            type: "EXPENSE",
            amount: data.amount,
            category: "VOUCHER_PAYMENT",
            paymentMethod: "VOUCHER",
            scope: "PHARMACY",
            description: `Payment: ${data.partyName ? data.partyName + " - " : ""}${data.particulars}`,
            referenceId: voucher.id,
            date: finalDate,
          },
        })
      } else if (data.type === "RECEIPT" && data.accountId) {
        await tx.transaction.create({
          data: {
            accountId: data.accountId,
            type: "INCOME",
            amount: data.amount,
            category: "VOUCHER_RECEIPT",
            paymentMethod: "VOUCHER",
            scope: "PHARMACY",
            description: `Receipt: ${data.partyName ? data.partyName + " - " : ""}${data.particulars}`,
            referenceId: voucher.id,
            date: finalDate,
          },
        })
      } else if (data.type === "CONTRA" && data.accountId && data.contraAccountId) {
        // Out from source
        await tx.transaction.create({
          data: {
            accountId: data.accountId,
            type: "EXPENSE",
            amount: data.amount,
            category: "INTERNAL_TRANSFER_OUT",
            paymentMethod: "VOUCHER",
            scope: "PHARMACY",
            description: `Transfer Out: ${data.particulars}`,
            referenceId: voucher.id,
            date: finalDate,
          },
        })
        // In to destination
        await tx.transaction.create({
          data: {
            accountId: data.contraAccountId,
            type: "INCOME",
            amount: data.amount,
            category: "INTERNAL_TRANSFER_IN",
            paymentMethod: "VOUCHER",
            scope: "PHARMACY",
            description: `Transfer In: ${data.particulars}`,
            referenceId: voucher.id,
            date: finalDate,
          },
        })
      }

      return candidateNumber
    })

    revalidatePath("/dashboard/pharmacy-finance/vouchers")
    revalidatePath("/dashboard/pharmacy-finance/cash-bank")
    revalidatePath("/dashboard/pharmacy-finance/pnl")
    revalidatePath("/dashboard/pharmacy-finance")

    return { success: true, message: `Voucher ${voucherNumber} recorded successfully` }
  } catch (err: unknown) {
    console.error("[createPharmacyVoucher] Error:", err)
    const errMsg = err instanceof Error ? err.message : "Failed to record voucher"
    if (errMsg.includes("Record to update not found")) {
      return { success: false, message: "Insufficient balance for this transaction" }
    }
    return { success: false, message: errMsg }
  }
}

export async function deletePharmacyVoucher(voucherId: string, reason?: string) {
  // Only Admin can delete vouchers
  const auth = await requireAuthSafe(["SUPER_ADMIN", "ADMIN"])
  if (!auth.ok) {
    return { success: false, message: "Unauthorized: Only administrators can delete vouchers" }
  }

  try {
    const deletedVoucher = await prisma.$transaction(async (tx) => {
      const voucher = await tx.pharmacyVoucher.findUnique({
        where: { id: voucherId },
        include: {
          account: true,
          contraAccount: true,
        },
      })

      if (!voucher) throw new Error("Voucher not found")

      // Check day close for involved accounts
      if (voucher.accountId) {
        await assertDayOpen(tx, voucher.accountId, voucher.date)
      }
      if (voucher.contraAccountId) {
        await assertDayOpen(tx, voucher.contraAccountId, voucher.date)
      }

      // Money adjustments:
      // 1. PAYMENT: money went OUT originally -> add it back (increment)
      if (voucher.type === "PAYMENT" && voucher.accountId) {
        await tx.financialAccount.update({
          where: { id: voucher.accountId },
          data: { currentBalance: { increment: voucher.amount } },
        })
      }
      // 2. RECEIPT: money came IN originally -> deduct it back (decrement, check balance)
      else if (voucher.type === "RECEIPT" && voucher.accountId) {
        const account = await tx.financialAccount.findUnique({ where: { id: voucher.accountId } })
        if (!account) throw new Error("Account not found")
        if (account.currentBalance < voucher.amount) {
          throw new Error(
            `Cannot delete receipt: insufficient balance in ${account.name} (Available: ₹${account.currentBalance.toFixed(2)}, Required to deduct: ₹${voucher.amount.toFixed(2)})`
          )
        }
        await tx.financialAccount.update({
          where: { id: voucher.accountId },
          data: { currentBalance: { decrement: voucher.amount } },
        })
      }
      // 3. CONTRA: transferred from accountId to contraAccountId
      // Reverse: deduct from contraAccountId (check balance), add back to accountId
      else if (voucher.type === "CONTRA" && voucher.accountId && voucher.contraAccountId) {
        const destination = await tx.financialAccount.findUnique({ where: { id: voucher.contraAccountId } })
        if (!destination) throw new Error("Destination account not found")
        if (destination.currentBalance < voucher.amount) {
          throw new Error(
            `Cannot reverse transfer: destination account ${destination.name} has insufficient balance (Available: ₹${destination.currentBalance.toFixed(2)}, Required to deduct: ₹${voucher.amount.toFixed(2)})`
          )
        }
        await tx.financialAccount.update({
          where: { id: voucher.contraAccountId },
          data: { currentBalance: { decrement: voucher.amount } },
        })
        await tx.financialAccount.update({
          where: { id: voucher.accountId },
          data: { currentBalance: { increment: voucher.amount } },
        })
      }

      // Delete ledger transactions linked to this voucher
      await tx.transaction.deleteMany({
        where: { referenceId: voucher.id },
      })

      // Delete the voucher record
      await tx.pharmacyVoucher.delete({
        where: { id: voucher.id },
      })

      return voucher
    })

    writeAuditLog({
      userId: auth.session.userId,
      action: "DELETE",
      module: "PharmacyVouchers",
      recordId: deletedVoucher.id,
      changes: {
        voucherNumber: deletedVoucher.voucherNumber,
        amount: deletedVoucher.amount,
        type: deletedVoucher.type,
        partyName: deletedVoucher.partyName,
        reason: reason || "Deleted by Admin",
      },
    })

    revalidatePath("/dashboard/pharmacy-finance/vouchers")
    revalidatePath("/dashboard/pharmacy-finance/cash-bank")
    revalidatePath("/dashboard/pharmacy-finance/pnl")
    revalidatePath("/dashboard/pharmacy-finance")

    return {
      success: true,
      message: `Voucher ${deletedVoucher.voucherNumber} deleted successfully and account balance adjusted`,
    }
  } catch (err: unknown) {
    console.error("[deletePharmacyVoucher] Error:", err)
    return { success: false, message: err instanceof Error ? err.message : "Failed to delete voucher" }
  }
}

export async function getPharmacyVouchers(filters?: {
  type?: string
  search?: string
  from?: string
  to?: string
  limit?: number
}) {
  const auth = await requireAuthSafe(["SUPER_ADMIN", "ACCOUNTANT", "PHARMACIST"])
  if (!auth.ok) return { success: false, message: auth.error, data: [] }

  try {
    const where: Prisma.PharmacyVoucherWhereInput = {}

    if (filters?.type && filters.type !== "ALL") {
      where.type = filters.type
    }

    if (filters?.from && filters?.to) {
      const fromDate = istDayStart(filters.from)
      const toDate = new Date(istDayStart(filters.to).getTime() + 24 * 60 * 60 * 1000)
      where.date = { gte: fromDate, lt: toDate }
    } else if (filters?.from) {
      where.date = { gte: istDayStart(filters.from) }
    } else if (filters?.to) {
      const toDate = new Date(istDayStart(filters.to).getTime() + 24 * 60 * 60 * 1000)
      where.date = { lt: toDate }
    }

    if (filters?.search && filters.search.trim()) {
      const q = filters.search.trim()
      where.OR = [
        { voucherNumber: { contains: q, mode: "insensitive" } },
        { partyName: { contains: q, mode: "insensitive" } },
        { particulars: { contains: q, mode: "insensitive" } },
        { notes: { contains: q, mode: "insensitive" } },
      ]
    }

    const vouchers = await prisma.pharmacyVoucher.findMany({
      where,
      include: {
        account: { select: { id: true, name: true, type: true } },
        contraAccount: { select: { id: true, name: true, type: true } },
      },
      orderBy: [{ date: "desc" }, { createdAt: "desc" }],
      take: filters?.limit || 100,
    })

    return { success: true, data: vouchers }
  } catch (err: unknown) {
    console.error("[getPharmacyVouchers] Error:", err)
    return { success: false, message: err instanceof Error ? err.message : "Failed to fetch vouchers", data: [] }
  }
}

// ═══════════════════════════════════════════════════════════════════
// PHARMACY DOUBLE-ENTRY VOUCHER SUITE (MIRROR OF MASTER FINANCE)
// ═══════════════════════════════════════════════════════════════════

export interface PharmacyVoucherEntryInput {
  accountGroupCode: string
  financialAccountId?: string
  debitAmount: number
  creditAmount: number
  narration?: string
}

export async function getPharmacyVoucherFormContext() {
  const auth = await requireAuthSafe(["SUPER_ADMIN", "ACCOUNTANT", "PHARMACIST", "ADMIN"])
  if (!auth.ok) return { success: false as const, message: auth.error, accountGroups: [], pharmacyAccounts: [] }

  const [accountGroups, pharmacyAccounts] = await Promise.all([
    prisma.accountGroup.findMany({
      where: { isActive: true, scope: { in: ["PHARMACY", "BOTH"] } },
      select: { code: true, name: true, nature: true },
      orderBy: { code: "asc" },
    }),
    prisma.financialAccount.findMany({
      where: { scope: "PHARMACY", isActive: true },
      select: {
        id: true,
        name: true,
        type: true,
        bankName: true,
        accountNumber: true,
        currentBalance: true,
      },
      orderBy: [{ type: "asc" }, { name: "asc" }],
    }),
  ])

  return {
    success: true as const,
    accountGroups,
    pharmacyAccounts,
  }
}

async function getNextPharmacyDoubleVoucherNumber(type: string): Promise<string> {
  const prefix = type === "JOURNAL" ? "PH-JV" : type === "RECEIPT" ? "PH-RV" : type === "PAYMENT" ? "PH-PV" : "PH-CV"
  const count = await prisma.voucher.count({
    where: { voucherNumber: { startsWith: prefix } },
  })
  return `${prefix}-${String(count + 1).padStart(5, "0")}`
}

export async function createPharmacyDoubleVoucher(data: {
  voucherType: string
  date: string
  narration?: string
  entries: PharmacyVoucherEntryInput[]
}) {
  const auth = await requireAuthSafe(["SUPER_ADMIN", "ACCOUNTANT", "PHARMACIST", "ADMIN"])
  if (!auth.ok) throw new Error(auth.error)

  const totalDebit = data.entries.reduce((s, e) => s + (Number(e.debitAmount) || 0), 0)
  const totalCredit = data.entries.reduce((s, e) => s + (Number(e.creditAmount) || 0), 0)

  if (Math.abs(totalDebit - totalCredit) > 0.01) {
    throw new Error(`Debit (₹${totalDebit.toFixed(2)}) ≠ Credit (₹${totalCredit.toFixed(2)}). Entries must balance.`)
  }

  if (data.entries.length < 2) {
    throw new Error("A voucher must have at least 2 entries (debit + credit)")
  }

  const voucherNumber = await getNextPharmacyDoubleVoucherNumber(data.voucherType)
  const voucherDate = new Date(`${data.date}T12:00:00+05:30`)

  const voucher = await prisma.$transaction(async (tx) => {
    const financialAccountIds = data.entries
      .map((entry) => entry.financialAccountId)
      .filter((id): id is string => Boolean(id))

    const financialAccounts = financialAccountIds.length
      ? await tx.financialAccount.findMany({
          where: { id: { in: financialAccountIds }, scope: "PHARMACY", isActive: true },
          select: { id: true, name: true, type: true, currentBalance: true },
        })
      : []

    if (financialAccounts.length !== new Set(financialAccountIds).size) {
      throw new Error("One or more selected accounts are unavailable in Pharmacy Finance")
    }

    const balanceChanges = new Map<string, number>()
    for (const entry of data.entries) {
      if (!entry.financialAccountId) continue
      balanceChanges.set(
        entry.financialAccountId,
        (balanceChanges.get(entry.financialAccountId) || 0) + entry.debitAmount - entry.creditAmount,
      )
    }

    for (const [accountId, balanceChange] of balanceChanges) {
      const account = financialAccounts.find((candidate) => candidate.id === accountId)
      if (!account) throw new Error("Selected pharmacy account not found")

      if (balanceChange < 0 && account.currentBalance < Math.abs(balanceChange)) {
        throw new Error(`Insufficient balance in "${account.name}" (Available: ₹${account.currentBalance.toFixed(2)})`)
      }

      await tx.financialAccount.update({
        where: { id: account.id },
        data: { currentBalance: { increment: balanceChange } },
      })
    }

    const created = await tx.voucher.create({
      data: {
        voucherNumber,
        voucherType: data.voucherType,
        date: voucherDate,
        narration: data.narration || null,
        totalAmount: totalDebit,
        status: "POSTED",
        createdBy: auth.session.name || "System",
        entries: {
          create: data.entries.map((e) => ({
            accountGroupCode: e.accountGroupCode,
            financialAccountId: e.financialAccountId || null,
            debitAmount: e.debitAmount,
            creditAmount: e.creditAmount,
            narration: e.narration || null,
          })),
        },
      },
      include: { entries: true },
    })

    // Also record Transaction rows for Pharmacy Cash & Bank books
    for (const [accountId, balanceChange] of balanceChanges) {
      if (Math.abs(balanceChange) > 0.001) {
        const account = financialAccounts.find((candidate) => candidate.id === accountId)
        if (!account) continue

        const primaryEntry = data.entries.find((e) => e.financialAccountId === accountId)
        await tx.transaction.create({
          data: {
            accountId: account.id,
            type: balanceChange > 0 ? "INCOME" : "EXPENSE",
            amount: Math.abs(balanceChange),
            category: "PHARMACY_VOUCHER",
            paymentMethod:
              account.type === "CASH"
                ? "CASH"
                : account.type === "UPI"
                ? "UPI"
                : account.type === "CARD"
                ? "CARD"
                : "BANK_TRANSFER",
            scope: "PHARMACY",
            referenceId: created.id,
            description: data.narration || `${data.voucherType} Voucher ${voucherNumber}`,
            date: voucherDate,
            accountGroupCode: primaryEntry?.accountGroupCode || "5200",
          },
        })
      }
    }

    return created
  })

  revalidatePath("/dashboard/pharmacy-finance/vouchers")
  revalidatePath("/dashboard/pharmacy-finance/general-ledger")
  revalidatePath("/dashboard/pharmacy-finance/accounts")
  revalidatePath("/dashboard/pharmacy-finance/day-close")
  revalidatePath("/dashboard/pharmacy-finance/pnl")
  revalidatePath("/dashboard/pharmacy-finance")

  return { success: true, message: `Pharmacy Voucher ${voucher.voucherNumber} posted successfully`, voucher }
}

export async function getPharmacyDoubleVouchers(params?: {
  from?: string
  to?: string
  type?: string
  page?: number
  limit?: number
}) {
  const page = params?.page || 1
  const limit = params?.limit || 50
  const skip = (page - 1) * limit

  const where: Prisma.VoucherWhereInput = {
    voucherNumber: { startsWith: "PH-" },
  }

  if (params?.from || params?.to) {
    where.date = {}
    if (params.from) where.date.gte = new Date(`${params.from}T00:00:00+05:30`)
    if (params.to) where.date.lte = new Date(`${params.to}T23:59:59.999+05:30`)
  }
  if (params?.type && params.type !== "ALL") {
    where.voucherType = params.type
  }

  const [vouchers, total] = await Promise.all([
    prisma.voucher.findMany({
      where,
      include: {
        entries: {
          include: {
            financialAccount: {
              select: { id: true, name: true, bankName: true, type: true },
            },
          },
        },
      },
      orderBy: { date: "desc" },
      skip,
      take: limit,
    }),
    prisma.voucher.count({ where }),
  ])

  // Also fetch legacy PharmacyVoucher rows if on first page
  const legacyVouchers = await prisma.pharmacyVoucher.findMany({
    orderBy: { date: "desc" },
    include: {
      account: { select: { id: true, name: true, bankName: true, type: true } },
      contraAccount: { select: { id: true, name: true, bankName: true, type: true } },
    },
    take: 50,
  })

  return { vouchers, legacyVouchers, total: total + legacyVouchers.length, page, limit }
}

export async function cancelPharmacyDoubleVoucher(id: string) {
  const auth = await requireAuthSafe(["SUPER_ADMIN", "ACCOUNTANT", "ADMIN"])
  if (!auth.ok) throw new Error(auth.error)

  await prisma.$transaction(async (tx) => {
    // Check if it's a double-entry voucher
    const voucher = await tx.voucher.findUnique({
      where: { id },
      include: { entries: true },
    })

    if (voucher) {
      if (voucher.status === "CANCELLED") return

      for (const entry of voucher.entries) {
        if (!entry.financialAccountId) continue
        await tx.financialAccount.update({
          where: { id: entry.financialAccountId },
          data: {
            currentBalance: { increment: entry.creditAmount - entry.debitAmount },
          },
        })
      }

      await tx.transaction.deleteMany({
        where: { referenceId: voucher.id },
      })

      await tx.voucher.update({
        where: { id },
        data: { status: "CANCELLED" },
      })
      return
    }

    // Check if it's a legacy PharmacyVoucher
    const legVoucher = await tx.pharmacyVoucher.findUnique({
      where: { id },
    })

    if (legVoucher) {
      if (legVoucher.status === "CANCELLED") return

      if (legVoucher.type === "PAYMENT" && legVoucher.accountId) {
        await tx.financialAccount.update({
          where: { id: legVoucher.accountId },
          data: { currentBalance: { increment: legVoucher.amount } },
        })
      } else if (legVoucher.type === "RECEIPT" && legVoucher.accountId) {
        await tx.financialAccount.update({
          where: { id: legVoucher.accountId },
          data: { currentBalance: { decrement: legVoucher.amount } },
        })
      } else if (legVoucher.type === "CONTRA" && legVoucher.accountId && legVoucher.contraAccountId) {
        await tx.financialAccount.update({
          where: { id: legVoucher.contraAccountId },
          data: { currentBalance: { decrement: legVoucher.amount } },
        })
        await tx.financialAccount.update({
          where: { id: legVoucher.accountId },
          data: { currentBalance: { increment: legVoucher.amount } },
        })
      }

      await tx.transaction.deleteMany({
        where: { referenceId: legVoucher.id },
      })

      await tx.pharmacyVoucher.update({
        where: { id },
        data: { status: "CANCELLED" },
      })
    }
  })

  revalidatePath("/dashboard/pharmacy-finance/vouchers")
  revalidatePath("/dashboard/pharmacy-finance/general-ledger")
  revalidatePath("/dashboard/pharmacy-finance/accounts")
  revalidatePath("/dashboard/pharmacy-finance/day-close")
  revalidatePath("/dashboard/pharmacy-finance/pnl")
  revalidatePath("/dashboard/pharmacy-finance")

  return { success: true, message: "Voucher cancelled and account balances reversed" }
}
