import type { Prisma } from "@prisma/client"

/**
 * Finance is split into two books. These helpers keep the boundary explicit at
 * the query layer instead of relying on UI filters or the caller remembering
 * to add a department predicate.
 */
export const HOSPITAL_SCOPE = "HOSPITAL" as const
export const PHARMACY_SCOPE = "PHARMACY" as const

export const hospitalTransactionWhere = (
  extra: Prisma.TransactionWhereInput = {},
): Prisma.TransactionWhereInput => ({
  ...extra,
  scope: HOSPITAL_SCOPE,
})

export const pharmacyTransactionWhere = (
  extra: Prisma.TransactionWhereInput = {},
): Prisma.TransactionWhereInput => ({
  ...extra,
  scope: PHARMACY_SCOPE,
})

export const hospitalAccountWhere = (
  extra: Prisma.FinancialAccountWhereInput = {},
): Prisma.FinancialAccountWhereInput => ({
  ...extra,
  scope: HOSPITAL_SCOPE,
})

export const pharmacyAccountWhere = (
  extra: Prisma.FinancialAccountWhereInput = {},
): Prisma.FinancialAccountWhereInput => ({
  ...extra,
  scope: PHARMACY_SCOPE,
})

/** Hospital billing excludes pharmacy bills at the database query boundary. */
export const hospitalBillingWhere = (
  extra: Prisma.BillingWhereInput = {},
): Prisma.BillingWhereInput => ({
  ...extra,
  type: { not: "PHARMACY" },
})

/** Pharmacy purchase invoices are identified by medicine line items. */
export const pharmacyPurchaseWhere = (
  extra: Prisma.PurchaseInvoiceWhereInput = {},
): Prisma.PurchaseInvoiceWhereInput => ({
  ...extra,
  items: { some: { medicineId: { not: null } } },
})

/** Hospital purchases are general-item invoices, never medicine invoices. */
export const hospitalPurchaseWhere = (
  extra: Prisma.PurchaseInvoiceWhereInput = {},
): Prisma.PurchaseInvoiceWhereInput => ({
  ...extra,
  items: { none: { medicineId: { not: null } } },
})

/** Mixed invoices cannot be safely assigned to either book and stay hidden. */
export const mixedPurchaseWhere: Prisma.PurchaseInvoiceWhereInput = {
  items: {
    some: { medicineId: { not: null } },
    // A second relation predicate is not expressible in one `items` object;
    // callers should use `isMixedPurchaseWhere` when they need this check.
  },
}

export const isMixedPurchaseWhere = (): Prisma.PurchaseInvoiceWhereInput => ({
  AND: [
    { items: { some: { medicineId: { not: null } } } },
    { items: { some: { generalItemId: { not: null } } } },
  ],
})
