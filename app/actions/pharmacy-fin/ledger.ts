"use server"

import { prisma } from "@/lib/prisma"
import { requireAuthSafe } from "@/lib/auth-guard"

export interface PharmacyLedgerParams {
  from: string
  to: string
  accountGroupCode?: string
}

export async function getPharmacyGeneralLedger(params: PharmacyLedgerParams) {
  const auth = await requireAuthSafe(["SUPER_ADMIN", "ACCOUNTANT", "PHARMACIST", "ADMIN"])
  if (!auth.ok) throw new Error(auth.error)

  const startDate = new Date(`${params.from}T00:00:00+05:30`)
  const endDate = new Date(`${params.to}T23:59:59.999+05:30`)

  // 1. Pharmacy Transactions strictly scoped
  const txWhere: Record<string, unknown> = {
    date: { gte: startDate, lte: endDate },
    scope: "PHARMACY",
  }
  if (params.accountGroupCode) {
    txWhere.accountGroupCode = params.accountGroupCode
  }

  const transactions = await prisma.transaction.findMany({
    where: txWhere,
    include: {
      account: {
        select: { id: true, name: true, type: true, bankName: true },
      },
    },
    orderBy: { date: "asc" },
    take: 1500,
  })

  // 2. Pharmacy Double-Entry Vouchers (VoucherEntry with PH- prefix)
  const voucherWhere: Record<string, unknown> = {
    date: { gte: startDate, lte: endDate },
    status: "POSTED",
    voucherNumber: { startsWith: "PH-" },
  }
  if (params.accountGroupCode) {
    voucherWhere.entries = {
      some: { accountGroupCode: params.accountGroupCode },
    }
  }

  const voucherEntries = await prisma.voucherEntry.findMany({
    where: { voucher: voucherWhere },
    include: {
      voucher: true,
      financialAccount: {
        select: { id: true, name: true, bankName: true, type: true },
      },
    },
    orderBy: [{ voucher: { date: "asc" } }, { debitAmount: "desc" }],
    take: 2000,
  })

  // 3. Historical Pharmacy Vouchers (PharmacyVoucher table)
  const legacyVouchers = await prisma.pharmacyVoucher.findMany({
    where: {
      date: { gte: startDate, lte: endDate },
      status: "POSTED",
    },
    include: {
      account: { select: { id: true, name: true, type: true } },
      contraAccount: { select: { id: true, name: true, type: true } },
    },
    orderBy: { date: "asc" },
    take: 1000,
  })

  // 4. Account Groups map for name lookups (Pharmacy-scoped)
  const accountGroups = await prisma.accountGroup.findMany({
    where: { isActive: true, scope: { in: ["PHARMACY", "BOTH"] } },
  })
  const groupMap = new Map(accountGroups.map((g) => [g.code, g.name]))

  return {
    transactions,
    voucherEntries,
    legacyVouchers,
    groupMap: Object.fromEntries(groupMap),
  }
}

