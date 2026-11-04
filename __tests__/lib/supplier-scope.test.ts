import { describe, expect, it } from "vitest"
import { normalizeSupplierScope, supplierAllowedFor } from "@/lib/supplier-scope"

describe("supplier scopes", () => {
  it("keeps legacy or missing scope compatible as BOTH", () => {
    expect(normalizeSupplierScope(undefined)).toBe("BOTH")
    expect(supplierAllowedFor(undefined, "PHARMACY")).toBe(true)
  })

  it("only allows matching scope or BOTH", () => {
    expect(supplierAllowedFor("PHARMACY", "PHARMACY")).toBe(true)
    expect(supplierAllowedFor("BOTH", "HOSPITAL")).toBe(true)
    expect(supplierAllowedFor("HOSPITAL", "PHARMACY")).toBe(false)
  })
})
