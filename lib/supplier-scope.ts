export const SUPPLIER_SCOPES = ["PHARMACY", "HOSPITAL", "BOTH"] as const
export type SupplierScope = (typeof SUPPLIER_SCOPES)[number]

/** Treat missing/legacy values as BOTH so old supplier records remain usable. */
export function normalizeSupplierScope(value: unknown): SupplierScope {
  return value === "PHARMACY" || value === "HOSPITAL" || value === "BOTH" ? value : "BOTH"
}

export function supplierAllowedFor(scope: unknown, requested: Exclude<SupplierScope, "BOTH">): boolean {
  const normalized = normalizeSupplierScope(scope)
  return normalized === "BOTH" || normalized === requested
}

export function supplierScopeFilter(requested: Exclude<SupplierScope, "BOTH">) {
  return { OR: [{ scope: requested }, { scope: "BOTH" }] }
}
