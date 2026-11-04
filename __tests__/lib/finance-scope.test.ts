import { describe, expect, it } from "vitest"
import {
  hospitalAccountWhere,
  hospitalBillingWhere,
  hospitalPurchaseWhere,
  hospitalTransactionWhere,
  pharmacyAccountWhere,
  pharmacyTransactionWhere,
} from "@/lib/finance-scope"

describe("finance scope boundaries", () => {
  it("forces hospital accounts and transactions into the hospital book", () => {
    expect(hospitalAccountWhere({ isActive: true })).toEqual({ scope: "HOSPITAL", isActive: true })
    expect(hospitalTransactionWhere({ type: "INCOME" })).toEqual({ scope: "HOSPITAL", type: "INCOME" })
  })

  it("forces pharmacy accounts and transactions into the pharmacy book", () => {
    expect(pharmacyAccountWhere({ isActive: true })).toEqual({ scope: "PHARMACY", isActive: true })
    expect(pharmacyTransactionWhere({ type: "EXPENSE" })).toEqual({ scope: "PHARMACY", type: "EXPENSE" })
  })

  it("excludes pharmacy bills and medicine purchase invoices from hospital finance", () => {
    expect(hospitalBillingWhere({ status: "PAID" })).toEqual({ type: { not: "PHARMACY" }, status: "PAID" })
    expect(hospitalPurchaseWhere({ status: "PAID" })).toEqual({
      items: { none: { medicineId: { not: null } } },
      status: "PAID",
    })
  })
})
