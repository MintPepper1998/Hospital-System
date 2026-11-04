import { describe, expect, it } from "vitest"
import { validateBillingCounterInput } from "@/lib/billing-counter-policy"

const valid = {
  billingType: "OPD",
  items: [{ description: "Consultation", quantity: 1, unitPrice: 500 }],
  discountAmount: 0,
  discountPercent: 0,
  paymentMethod: "CASH",
}

describe("billing counter policy", () => {
  it("accepts a valid universal counter bill", () => {
    expect(validateBillingCounterInput(valid)).toBeNull()
  })

  it("rejects invalid billing types and unsafe line items", () => {
    expect(validateBillingCounterInput({ ...valid, billingType: "PHARMACY" })).toBe("Unsupported billing type")
    expect(validateBillingCounterInput({ ...valid, items: [{ ...valid.items[0], quantity: 0 }] })).toContain("positive quantity")
  })

  it("rejects invalid discounts and split amounts", () => {
    expect(validateBillingCounterInput({ ...valid, discountPercent: 101 })).toContain("Discount")
    expect(validateBillingCounterInput({ ...valid, paymentMethod: "SPLIT", splitPayments: { cash: -1 } })).toContain("Split")
  })
})
