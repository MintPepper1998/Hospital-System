import { Prisma, BillingStatus } from "@prisma/client"
import { DateRange } from "./dates"
import { NONCASH_LEGACY_CATEGORIES, SaleChannel, VALID_SALE_STATUSES } from "./constants"

export function pharmacySalesWhere(r: DateRange): Prisma.BillingWhereInput {
  return {
    type: "PHARMACY",
    status: { in: VALID_SALE_STATUSES as BillingStatus[] },
    billDate: { gte: r.from, lt: r.to },
  }
}

export function saleChannel(b: {
  ipdAdmissionId: string | null
  emergencyVisitId: string | null
  casualtyVisitId?: string | null
  appointmentId?: string | null
  isCredit?: boolean
}): SaleChannel {
  if (b.ipdAdmissionId) return "IPD"
  if (b.emergencyVisitId) return "EMERGENCY"
  if (b.casualtyVisitId) return "CASUALTY"
  if (b.isCredit) return "CREDIT"
  if (b.appointmentId) return "OPD"
  return "OTC"
}

export function pharmacyAccountsWhere(): Prisma.FinancialAccountWhereInput {
  return { scope: "PHARMACY" }
}

export function cashMovementWhere(r: DateRange, accountIds?: string[]): Prisma.TransactionWhereInput {
  return {
    scope: "PHARMACY",
    accountId: accountIds && accountIds.length > 0 ? { in: accountIds } : undefined,
    date: { gte: r.from, lt: r.to }, // business date (back-dated entries land on the correct day)
    category: {
      notIn: [...NONCASH_LEGACY_CATEGORIES, "NONCASH_REVERSAL"],
    },
  }
}
