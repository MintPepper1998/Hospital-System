import { PrismaClient, Prisma } from "@prisma/client"

type DB = PrismaClient | Prisma.TransactionClient

export interface PharmacyChargeItem {
  name: string
  dosage: string
  frequency: string
  duration: string
  quantity: number
  unitPrice: number
  totalPrice: number
  prescribedBy: string
  source: "PRESCRIPTION" | "DISCHARGE"
}

export interface IPDPharmacyCharges {
  total: number
  tax: number
  items: PharmacyChargeItem[]
}

/**
 * Computes the pharmacy portion of an IPD bill.
 *
 * 1. **Billed** = Σ PHARMACY `Billing` rows where `ipdAdmissionId = admissionId`.
 *    This is the source of truth for any medicine that was dispensed through the
 *    pharmacy workflow (both IPD prescriptions and discharge medicines).
 *
 * 2. **Unbilled (legacy)** = dispensed IPD prescriptions or discharge medicines
 *    that were dispensed before this fix (no billing record was created).
 *    These are priced by looking up the inventory batch selling price.
 *
 * The result is used by `calculateFinalBill`, `processDischarge`, and
 * `checkDischargeEligibility` so all three always agree on the pharmacy amount.
 */
export async function getIPDPharmacyCharges(
  db: DB,
  admissionId: string,
): Promise<IPDPharmacyCharges> {
  // ── 1. Billed (source of truth) ──
  const billedAgg = await (db as any).billing.aggregate({
    where: {
      ipdAdmissionId: admissionId,
      type: "PHARMACY",
    },
    _sum: { netAmount: true, taxAmount: true },
  })
  const billedTotal = billedAgg._sum.netAmount || 0
  const billedTax = billedAgg._sum.taxAmount || 0

  // Get billed items for the breakdown
  const billedBills = await (db as any).billing.findMany({
    where: {
      ipdAdmissionId: admissionId,
      type: "PHARMACY",
    },
    include: {
      items: {
        select: { description: true, quantity: true, unitPrice: true, totalAmount: true },
      },
    },
  })

  const items: PharmacyChargeItem[] = []

  for (const bill of billedBills) {
    for (const item of bill.items) {
      items.push({
        name: item.description,
        dosage: "",
        frequency: "",
        duration: "",
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        totalPrice: item.totalAmount,
        prescribedBy: "Pharmacy",
        source: "PRESCRIPTION",
      })
    }
  }

  // ── 2. Unbilled dispensed IPD prescriptions (legacy rows without a billing link) ──
  let unbilledTotal = 0
  let unbilledTax = 0

  // IPD prescriptions that were dispensed but have no stored price > 0
  // (i.e. dispensed before the billing-creation logic was added)
  const unbilledRxs = await (db as any).iPDPrescription.findMany({
    where: {
      admissionId,
      pharmacyStatus: "DISPENSED",
      // Only legacy: either no total price or zero
      OR: [
        { totalPrice: null },
        { totalPrice: 0 },
      ],
    },
  })

  for (const rx of unbilledRxs) {
    // Check if a PHARMACY billing already covers this prescription (by referenceId in items)
    const existingBill = await (db as any).billingItem.findFirst({
      where: {
        billing: { ipdAdmissionId: admissionId, type: "PHARMACY" },
        referenceId: rx.id,
      },
    })
    if (existingBill) continue // Already billed — skip

    // Lookup price from inventory
    const drug = await (db as any).medicine.findFirst({
      where: { name: { equals: rx.medicineName, mode: "insensitive" } },
      include: {
        inventoryBatches: {
          where: { isActive: true, quantity: { gt: 0 } },
          orderBy: { expiryDate: "asc" },
          take: 1,
        },
      },
    })

    const qty = rx.dispensedQuantity || (parseDailyDose(rx.frequency) * (parseInt(rx.duration) || 1))
    const unitP = drug?.inventoryBatches?.[0]?.sellingPrice || drug?.unitPrice || 0
    const total = qty * unitP
    const taxPercent = drug?.inventoryBatches?.[0]?.taxPercent ?? 12
    const tax = total - (total / (1 + taxPercent / 100))

    unbilledTotal += total
    unbilledTax += tax

    items.push({
      name: rx.medicineName,
      dosage: rx.dosage,
      frequency: rx.frequency,
      duration: rx.duration,
      quantity: qty,
      unitPrice: unitP,
      totalPrice: total,
      prescribedBy: rx.prescribedByName || "Doctor",
      source: "PRESCRIPTION",
    })
  }

  // Unbilled dispensed discharge medicines (legacy rows without billingId)
  const unbilledDMs = await (db as any).dischargeMedicine.findMany({
    where: {
      admissionId,
      pharmacyStatus: "DISPENSED",
      billingId: null,
    },
  })

  for (const dm of unbilledDMs) {
    const drug = await (db as any).medicine.findFirst({
      where: { name: { equals: dm.medicineName, mode: "insensitive" } },
      include: {
        inventoryBatches: {
          where: { isActive: true, quantity: { gt: 0 } },
          orderBy: { expiryDate: "asc" },
          take: 1,
        },
      },
    })

    const qty = dm.dispensedQuantity || dm.quantity || 0
    const unitP = dm.unitPrice || drug?.inventoryBatches?.[0]?.sellingPrice || drug?.unitPrice || 0
    const total = dm.totalPrice || qty * unitP
    const taxPercent = drug?.inventoryBatches?.[0]?.taxPercent ?? 12
    const tax = total - (total / (1 + taxPercent / 100))

    unbilledTotal += total
    unbilledTax += tax

    items.push({
      name: dm.medicineName,
      dosage: dm.dosage,
      frequency: dm.frequency,
      duration: dm.duration,
      quantity: qty,
      unitPrice: unitP,
      totalPrice: total,
      prescribedBy: "Discharge Doctor",
      source: "DISCHARGE",
    })
  }

  return {
    total: billedTotal + unbilledTotal,
    tax: billedTax + unbilledTax,
    items,
  }
}

// ── Local helper ──
function parseDailyDose(frequency: string): number {
  const f = (frequency || "").trim().toUpperCase()
  if (f.includes("-")) {
    return f.split("-").reduce((sum, n) => sum + (parseInt(n) || 0), 0)
  }
  switch (f) {
    case "OD": return 1
    case "BD": return 2
    case "TDS": return 3
    case "QID": return 4
    case "SOS": return 1
    case "STAT": return 1
    default: return 1
  }
}
