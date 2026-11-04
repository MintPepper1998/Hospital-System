export const BILLING_COUNTER_TYPES = [
  "OPD", "IPD", "CASUALTY", "EMERGENCY", "OT", "LABORATORY", "AMBULANCE", "CANTEEN", "CUSTOM",
] as const

export type BillingCounterType = typeof BILLING_COUNTER_TYPES[number]

export function validateBillingCounterInput(input: {
  billingType: string
  items: Array<{ description: string; quantity: number; unitPrice: number }>
  discountAmount: number
  discountPercent: number
  paymentMethod: string
  splitPayments?: { cash?: number; upi?: number; card?: number }
}) {
  if (!BILLING_COUNTER_TYPES.includes(input.billingType as BillingCounterType)) return "Unsupported billing type"
  if (input.items.length === 0) return "At least one billing item is required"
  if (input.items.some((item) => !item.description.trim() || !Number.isInteger(item.quantity) || item.quantity <= 0 || !Number.isFinite(item.unitPrice) || item.unitPrice < 0)) {
    return "Each item needs a description, positive quantity, and non-negative price"
  }
  if (!Number.isFinite(input.discountAmount) || input.discountAmount < 0 || !Number.isFinite(input.discountPercent) || input.discountPercent < 0 || input.discountPercent > 100) {
    return "Discount must be a valid non-negative amount or percentage"
  }
  if (!["CASH", "UPI", "CARD", "BANK_TRANSFER", "INSURANCE", "BSKY", "SPLIT", "CREDIT"].includes(input.paymentMethod)) return "Unsupported payment method"
  if (input.paymentMethod === "SPLIT") {
    const split = input.splitPayments
    if (!split || [split.cash, split.upi, split.card].some((amount) => amount !== undefined && (!Number.isFinite(amount) || amount < 0))) {
      return "Split payment amounts must be non-negative"
    }
  }
  return null
}
