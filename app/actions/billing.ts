"use server"

import { revalidatePath } from "next/cache"
import { prisma } from "@/lib/prisma"
import { requireAuthSafe } from "@/lib/auth-guard"
import { writeAuditLog } from "@/lib/audit"
import { findBestMatchingMedicine } from "@/lib/actions/pharmacy"
import { resolveFinancialAccount } from "@/lib/payment-routing"
import { resolveAccountGroupCode } from "@/lib/account-group-resolver"
import { getIPDPharmacyCharges } from "@/lib/ipd-pharmacy-charges"

// ============================================
// TYPES
// ============================================

export interface BillBreakdown {
  admissionId: string
  patientName: string
  patientId: string
  bedNumber: string
  wardName: string
  wardType: string
  doctorName: string
  admissionDate: string
  daysAdmitted: number
  // Line items
  bedRatePerDay: number
  roomRent: number
  pharmacyTotal: number
  labTotal: number
  doctorFees: number
  doctorFeePerDay: number
  otherCharges: number
  canteenTotal: number
  surgeryTotal: number
  nursingTotal: number
  equipmentTotal: number
  customChargesTotal: number
  // Itemized details
  bedCharges?: { id: string; name: string; ratePerDay: number; days: number; discountAmount: number; total: number; date: string }[]
  labTests: { id?: string; name: string; type: string; price: number; status: string; orderedBy: string | null; date?: string; isManual?: boolean }[]
  medicines: { id?: string; name: string; dosage: string; frequency: string; duration: string; quantity: number; unitPrice: number; totalPrice: number; prescribedBy: string | null; date?: string; isManual?: boolean }[]
  canteenOrders: { orderNumber: string; mealSlot: string; date: string; totalAmount: number; itemCount: number }[]
  surgeries: { id?: string; procedureName: string; surgeonName: string; date: string; charge: number; status: string; chargeBreakdown: { chargeLabel: string; chargeType: string; amount: number }[]; otMedicines: { name: string; quantity: number; unitPrice: number; total: number }[]; isManual?: boolean }[]
  nurseAssignments: { id?: string; nurseName: string; shift: string; cost: number; days: number; totalCost: number; assignedAt?: string; date?: string }[]
  doctorVisits: { id?: string; doctorName: string; role: string; fee: number; rate?: number; visits?: number; assignedAt?: string; date?: string }[]
  equipments: {
    id: string
    equipmentId: string
    name: string
    code: string | null
    category: string | null
    chargeType: string
    ratePerUnit: number
    quantity: number
    startTime: string
    endTime: string | null
    duration: string
    totalCharge: number
    status: string
    notes: string | null
    date?: string
  }[]
  customCharges: { id: string; name: string; amount: number; quantity: number; discountPercent: number; discountAmount: number; totalAmount: number; date: string; category?: string }[]
  // Discount
  discountAmount: number
  discountPercent: number
  discountType: string | null
  discountReason: string | null
  // Totals
  subtotal: number
  pharmacyTax: number
  totalBillAmount: number
  advanceDeposit: number
  amountPaid: number
  netPayable: number
  balanceDue: number
  // Insurance
  hasInsuranceCoverage: boolean
  insuranceApprovedAmount?: number
  insuranceCoveredAmount?: number
  patientLiability?: number
  // Government scheme
  isBsky: boolean
  // Payment history
  payments: {
    id: string
    billNumber?: string
    amount: number
    mode: string
    date: string
    notes: string | null
    splitDetails?: {
      cash?: number
      upi?: number
      card?: number
    } | null
  }[]
  dischargeDate?: string | null
}

// ============================================
// CALCULATE FINAL BILL
// ============================================

/**
 * calculateFinalBill — Compute a complete IPD bill breakdown for an admission.
 *
 * Calculates:
 *  - Room Rent: ceil(days) × Bed.pricePerDay
 *  - Pharmacy: Sum of PHARMACY billing during admission period
 *  - Lab: Sum of LABORATORY billing during admission period
 *  - Doctor Fees: days × ₹500/day (configurable)
 *  - Net Payable: Total - Advance Deposit
 */
export async function calculateFinalBill(
  admissionId: string,
  options?: { doctorFeePerDay?: number; asOfDate?: string | Date }
): Promise<{ success: boolean; message: string; data: BillBreakdown | null }> {
  const authResult = await requireAuthSafe(["SUPER_ADMIN", "ACCOUNTANT", "RECEPTIONIST", "DOCTOR", "NURSE"])
  if (!authResult.ok) return { success: false, message: authResult.error, data: null }

  try {
    if (!admissionId) {
      return { success: false, message: "Admission ID is required", data: null }
    }

    const DOCTOR_FEE_PER_DAY = options?.doctorFeePerDay ?? 500

    // Fetch admission with all relations
    const admission = await prisma.iPDAdmission.findUnique({
      where: { id: admissionId },
      include: {
        patient: {
          include: {
            user: true,
            insurancePolicies: {
              where: { isActive: true },
              include: {
                claims: {
                  where: {
                    status: {
                      in: ["SUBMITTED", "UNDER_REVIEW", "IN_PROCESS", "APPROVED"],
                    },
                  },
                },
              },
            },
          },
        },
        bed: {
          include: { ward: true },
        },
        primaryDoctor: {
          include: { user: true },
        },
      },
    })

    if (!admission) {
      return { success: false, message: "Admission not found", data: null }
    }

    // ── Calculate days admitted (respects backdated asOfDate or dischargeDate) ──
    const admissionDate = new Date(admission.admissionDate)
    const endDate = options?.asOfDate
      ? new Date(options.asOfDate)
      : (admission.dischargeDate ? new Date(admission.dischargeDate) : new Date())
    const daysAdmitted = Math.max(
      1,
      Math.ceil((endDate.getTime() - admissionDate.getTime()) / (1000 * 60 * 60 * 24))
    )

    // ── Fetch All Manual IPD Charges for this Admission ──
    const customChargesRecords = await prisma.iPDCustomCharge.findMany({
      where: { admissionId: admission.id },
      orderBy: { date: "asc" },
    })

    const bedChargesRecords = customChargesRecords.filter(c => c.category === "BED")
    const doctorChargesRecords = customChargesRecords.filter(c => c.category === "DOCTOR")
    const nursingChargesRecords = customChargesRecords.filter(c => c.category === "NURSING")
    const equipmentChargesRecords = customChargesRecords.filter(c => c.category === "EQUIPMENT")
    const pharmacyCustomChargesRecords = customChargesRecords.filter(c => c.category === "PHARMACY")
    const labCustomChargesRecords = customChargesRecords.filter(c => c.category === "LAB")
    const surgeryCustomChargesRecords = customChargesRecords.filter(c => c.category === "SURGERY")
    const addonChargesRecords = customChargesRecords.filter(c => !c.category || c.category === "ADDON")

    // ── Room Rent (Fully Manual — No Automatic Multiplication of Calendar Days) ──
    const bedRatePerDay = admission.bed.pricePerDay
    const roomRent = bedChargesRecords.reduce((sum, c) => sum + c.totalAmount, 0)
    const bedCharges: BillBreakdown["bedCharges"] = bedChargesRecords.map(c => ({
      id: c.id,
      name: c.name,
      ratePerDay: c.amount,
      days: c.quantity,
      discountAmount: c.discountAmount,
      total: c.totalAmount,
      date: c.date.toISOString(),
    }))

    // ── Lab Charges (from Billing table + IPDLabRequest + Manual Lab Charges) ──
    const labAgg = await prisma.billing.aggregate({
      where: {
        ipdAdmissionId: admission.id,
        type: "LABORATORY",
      },
      _sum: { netAmount: true },
    })
    const billedLabTotal = labAgg._sum.netAmount || 0

    const ipdLabRequests = await prisma.iPDLabRequest.findMany({
      where: {
        admissionId: admission.id,
        status: { not: "CANCELLED" },
      },
      include: {
        testCatalog: true,
      },
    })
    const unbilledLabTotal = ipdLabRequests.reduce(
      (sum, req) => sum + (req.testCatalog?.price || 0),
      0
    )
    const manualLabTotal = labCustomChargesRecords.reduce((sum, c) => sum + c.totalAmount, 0)
    const labTotal = billedLabTotal + unbilledLabTotal + manualLabTotal

    // Build itemized lab test list
    const labTests: BillBreakdown["labTests"] = [
      ...ipdLabRequests.map((req) => ({
        name: req.testName,
        type: req.type,
        price: req.testCatalog?.price || 0,
        status: req.status,
        orderedBy: req.orderedByName,
        isManual: false,
      })),
      ...labCustomChargesRecords.map((c) => ({
        id: c.id,
        name: c.name,
        type: "MANUAL",
        price: c.totalAmount,
        status: "COMPLETED",
        orderedBy: null,
        date: c.date.toISOString(),
        isManual: true,
      }))
    ]

    // ── Pharmacy Charges (Prescriptions + Manual Pharmacy Charges) ──
    const pharmacyCharges = await getIPDPharmacyCharges(prisma, admission.id)
    const manualPharmacyTotal = pharmacyCustomChargesRecords.reduce((sum, c) => sum + c.totalAmount, 0)
    const pharmacyTotal = pharmacyCharges.total + manualPharmacyTotal
    const pharmacyTax = 0 // GST on pharmacy is inclusive in medicine MRP; do not charge separately or add to bill
    const medicines: BillBreakdown["medicines"] = [
      ...pharmacyCharges.items.map((i) => ({
        name: i.name,
        dosage: i.dosage,
        frequency: i.frequency,
        duration: i.duration,
        quantity: i.quantity,
        unitPrice: i.unitPrice,
        totalPrice: i.totalPrice,
        prescribedBy: i.prescribedBy,
        isManual: false,
      })),
      ...pharmacyCustomChargesRecords.map((c) => ({
        id: c.id,
        name: c.name,
        dosage: "—",
        frequency: "—",
        duration: "—",
        quantity: c.quantity,
        unitPrice: c.amount,
        totalPrice: c.totalAmount,
        prescribedBy: null,
        date: c.date.toISOString(),
        isManual: true,
      }))
    ]

    // ── Doctor Fees (Fully Manual — Added by Staff with Date) ──
    const doctorFees = doctorChargesRecords.reduce((sum, c) => sum + c.totalAmount, 0)
    const doctorVisits: BillBreakdown["doctorVisits"] = doctorChargesRecords.map((c) => ({
      id: c.id,
      doctorName: c.name,
      role: "ATTENDING",
      fee: c.totalAmount,
      rate: c.amount,
      visits: c.quantity,
      assignedAt: c.date.toISOString(),
      date: c.date.toISOString(),
    }))

    // ── Surgery Charges ──
    const patientSurgeries = await prisma.surgery.findMany({
      where: {
        patientId: admission.patientId,
        status: { not: "CANCELLED" },
        scheduledDate: { gte: admissionDate },
      },
      include: {
        leadSurgeon: { include: { user: { select: { name: true } } } },
      }
    })

    // For each surgery, resolve the charge (from record or template fallback)
    const surgeries: BillBreakdown["surgeries"] = await Promise.all(patientSurgeries.map(async (s) => {
      // Try to get template data if surgery has no charge or breakdown
      let templateCharge = 0
      let templateComponents: { chargeLabel: string; chargeType: string; amount: number }[] = []
      
      if (s.procedureTemplateId) {
        const template = await prisma.surgeryProcedure.findUnique({
          where: { id: s.procedureTemplateId },
          include: { chargeComponents: { orderBy: { sortOrder: "asc" } } }
        })
        if (template) {
          templateCharge = template.totalCharge || 0
          templateComponents = template.chargeComponents.map(c => ({
            chargeLabel: c.chargeLabel,
            chargeType: c.chargeType,
            amount: c.amount,
          }))
        }
      } else {
        // Fallback: look up by procedure name
        const template = await prisma.surgeryProcedure.findFirst({
          where: { name: s.procedureName },
          include: { chargeComponents: { orderBy: { sortOrder: "asc" } } }
        })
        if (template) {
          templateCharge = template.totalCharge || 0
          templateComponents = template.chargeComponents.map(c => ({
            chargeLabel: c.chargeLabel,
            chargeType: c.chargeType,
            amount: c.amount,
          }))
        }
      }

      // Get breakdown — prioritize surgery-specific record JSON, fallback to template components
      let breakdown: { chargeLabel: string; chargeType: string; amount: number }[] = []
      if (s.chargeBreakdown && Array.isArray(s.chargeBreakdown) && (s.chargeBreakdown as any[]).length > 0) {
        breakdown = (s.chargeBreakdown as any[]).map(c => ({
          chargeLabel: c.chargeLabel || c.label || "Charge",
          chargeType: c.chargeType || c.type || "OTHER",
          amount: Number(c.amount) || 0,
        }))
      } else if (templateComponents.length > 0) {
        breakdown = templateComponents
      }

      // Get charge — prioritize surgery-specific charge, fallback to template or breakdown sum
      const charge = (s.surgeryCharge && s.surgeryCharge > 0)
        ? s.surgeryCharge
        : (templateCharge > 0 ? templateCharge : breakdown.reduce((sum, c) => sum + c.amount, 0))

      // Extract OT Pharmacy medicines from consumables JSON or template
      let otMedicines: { name: string; quantity: number; unitPrice: number; total: number }[] = []
      const consumables = s.consumables as any
      if (consumables?.otPharmacy && Array.isArray(consumables.otPharmacy)) {
        otMedicines = consumables.otPharmacy
          .map((m: any) => {
            const netQty = m.netQuantity !== undefined ? Number(m.netQuantity) : (Number(m.quantity) || 1)
            const unitPrice = Number(m.unitPrice) || 0
            const total = m.netTotal !== undefined ? Number(m.netTotal) : unitPrice * netQty
            return {
              name: m.medicineName || m.name || "Unknown",
              quantity: netQty,
              unitPrice: unitPrice,
              total: total,
            }
          })
          .filter((m: any) => m.quantity > 0)
      } else if (s.procedureTemplateId) {
        // Fallback: fetch from template's medicines
        const templateMeds = await prisma.surgeryProcedureMedicine.findMany({
          where: { procedureId: s.procedureTemplateId },
          include: { 
            medicine: { 
              select: { 
                unitPrice: true,
                inventoryBatches: {
                  where: { isActive: true, quantity: { gt: 0 } },
                  orderBy: { expiryDate: "asc" },
                  take: 1,
                  select: { sellingPrice: true }
                }
              } 
            } 
          },
          orderBy: { sortOrder: "asc" },
        })
        otMedicines = templateMeds.map(tm => {
          const actualPrice = tm.medicine.inventoryBatches?.[0]?.sellingPrice || tm.medicine.unitPrice
          return {
            name: tm.medicineName,
            quantity: tm.quantity,
            unitPrice: actualPrice,
            total: actualPrice * tm.quantity,
          }
        })
      }

      // Sync OT Pharmacy breakdown with actual otMedicines total
      const actualOtPharmacyTotal = otMedicines.reduce((sum, m) => sum + m.total, 0)
      
      const otPharmacyIndex = breakdown.findIndex(c => c.chargeType === "OT_PHARMACY")
      let currentOtPharmacyAmount = 0
      
      if (otPharmacyIndex !== -1) {
        currentOtPharmacyAmount = breakdown[otPharmacyIndex].amount
        breakdown[otPharmacyIndex].amount = actualOtPharmacyTotal
      } else if (actualOtPharmacyTotal > 0) {
        breakdown.push({
          chargeLabel: "OT Pharmacy Charges",
          chargeType: "OT_PHARMACY",
          amount: actualOtPharmacyTotal
        })
      }

      let finalCharge = charge
      if (actualOtPharmacyTotal !== currentOtPharmacyAmount) {
         finalCharge = charge - currentOtPharmacyAmount + actualOtPharmacyTotal
      }

      return {
        procedureName: s.procedureName,
        surgeonName: s.leadSurgeon.user.name || "Unknown",
        date: s.scheduledDate.toISOString(),
        charge: finalCharge,
        status: s.status,
        chargeBreakdown: breakdown,
        otMedicines,
      }
    }))
    const baseSurgeryTotal = surgeries.reduce((sum, s) => sum + s.charge, 0)
    const manualSurgeryTotal = surgeryCustomChargesRecords.reduce((sum, c) => sum + c.totalAmount, 0)
    const surgeryTotal = baseSurgeryTotal + manualSurgeryTotal
    const allSurgeries: BillBreakdown["surgeries"] = [
      ...surgeries,
      ...surgeryCustomChargesRecords.map(c => ({
        id: c.id,
        procedureName: c.name,
        surgeonName: "Manual OT Entry",
        date: c.date.toISOString(),
        charge: c.totalAmount,
        status: "COMPLETED",
        chargeBreakdown: [],
        otMedicines: [],
        isManual: true,
      }))
    ]

    // ── Nursing Charges (Fully Manual — No Automatic Multiplication of Calendar Days) ──
    const nursingTotal = nursingChargesRecords.reduce((sum, na) => sum + na.totalAmount, 0)
    const nurseAssignments: BillBreakdown["nurseAssignments"] = nursingChargesRecords.map(na => ({
      id: na.id,
      nurseName: na.name,
      shift: "General",
      cost: na.amount,
      days: na.quantity,
      totalCost: na.totalAmount,
      assignedAt: na.date.toISOString(),
      date: na.date.toISOString(),
    }))

    // ── Equipment Charges (Fully Manual — No Automatic Running Clock Timers) ──
    const equipmentTotal = equipmentChargesRecords.reduce((sum, e) => sum + e.totalAmount, 0)
    const equipments: BillBreakdown["equipments"] = equipmentChargesRecords.map((usage) => ({
      id: usage.id,
      equipmentId: usage.id,
      name: usage.name,
      code: null,
      category: "Equipment",
      chargeType: "PER_DAY",
      ratePerUnit: usage.amount,
      quantity: usage.quantity,
      startTime: usage.date.toISOString(),
      endTime: null,
      duration: `${usage.quantity} day${usage.quantity > 1 ? "s" : ""}`,
      totalCharge: usage.totalAmount,
      status: "ACTIVE",
      notes: null,
      date: usage.date.toISOString(),
    }))

    // ── Other charges (from admission record if stored) ──
    const otherCharges = admission.totalOtherCharges || 0

    // ── Canteen Charges (meals served to this patient) ──
    const canteenMealOrders = await prisma.canteenMealOrder.findMany({
      where: {
        admissionId: admission.id,
        status: { not: "CANCELLED" },
      },
      include: {
        items: true,
        mealSlot: true,
      },
      orderBy: { orderDate: "asc" },
    })
    const canteenTotal = canteenMealOrders.reduce((sum, order) => sum + order.totalAmount, 0)
    const canteenOrders = canteenMealOrders.map((order) => ({
      orderNumber: order.orderNumber,
      mealSlot: order.mealSlot.name,
      date: order.orderDate.toISOString(),
      totalAmount: order.totalAmount,
      itemCount: order.items.length,
    }))

    // ── Custom Charges (Addons) ──
    const customChargesTotal = addonChargesRecords.reduce((sum, charge) => sum + charge.totalAmount, 0)
    const customCharges: BillBreakdown["customCharges"] = addonChargesRecords.map((charge) => ({
      id: charge.id,
      name: charge.name,
      amount: charge.amount,
      quantity: charge.quantity,
      discountPercent: charge.discountPercent,
      discountAmount: charge.discountAmount,
      totalAmount: charge.totalAmount,
      date: charge.date.toISOString(),
      category: charge.category,
    }))

    // ── Discount ──
    const discountAmount = admission.discountAmount || 0
    const discountPercent = admission.discountPercent || 0
    const discountType = admission.discountType || null
    const discountReason = admission.discountReason || null

    // ── Totals ──
    const grossSubtotal = roomRent + pharmacyTotal + labTotal + doctorFees + surgeryTotal + nursingTotal + equipmentTotal + otherCharges + canteenTotal + customChargesTotal
    
    // Apply discount
    let discountValue = 0
    if (discountType === "PERCENTAGE" && discountPercent > 0) {
      discountValue = grossSubtotal * (discountPercent / 100)
    } else if (discountType === "FLAT" && discountAmount > 0) {
      discountValue = discountAmount
    }
    
    const subtotal = grossSubtotal - discountValue
    // pharmacyTax is now calculated above as the inclusive GST amount
    const advanceDeposit = admission.initialDeposit || 0

    // ── Payment History ──
    const paymentRecords = await prisma.billing.findMany({
      where: {
        patientId: admission.patientId,
        type: "IPD",
        status: "PAID",
      },
      orderBy: { billDate: "desc" },
    })
    const totalPaidViaPayments = paymentRecords.reduce((sum, p) => sum + (p.paidAmount || 0), 0)
    
    // Check if the advance deposit was already created as a Billing receipt during admission.
    // (ipd-actions.ts creates a receipt with notes containing "IPD Admission Deposit")
    const isDepositBilled = paymentRecords.some(p => p.notes?.includes("IPD Admission Deposit") || p.notes?.includes("Deposit"))
    
    // If it's already billed, totalPaidViaPayments includes it. Otherwise, add it manually.
    const totalAmountPaid = (isDepositBilled ? 0 : advanceDeposit) + totalPaidViaPayments
    
    // Fetch any split transactions if split amounts were stored only in Transaction table
    const splitPaymentRecordsWithoutCols = paymentRecords.filter(
      p => p.paymentMethod === "SPLIT" && !p.splitCashAmount && !p.splitUpiAmount && !p.splitCardAmount
    )
    const splitRefIds = Array.from(new Set([
      ...splitPaymentRecordsWithoutCols.map(p => p.id),
      ...splitPaymentRecordsWithoutCols.map(p => p.billNumber).filter(Boolean) as string[],
    ]))

    const fallbackSplitMap = new Map<string, { cash?: number; upi?: number; card?: number }>()
    if (splitRefIds.length > 0) {
      const splitTxs = await prisma.transaction.findMany({
        where: { referenceId: { in: splitRefIds } }
      })
      for (const st of splitTxs) {
        if (!st.referenceId) continue
        const existing = fallbackSplitMap.get(st.referenceId) || {}
        if (st.paymentMethod === "CASH") existing.cash = (existing.cash || 0) + st.amount
        else if (st.paymentMethod === "UPI") existing.upi = (existing.upi || 0) + st.amount
        else if (st.paymentMethod === "CARD") existing.card = (existing.card || 0) + st.amount
        fallbackSplitMap.set(st.referenceId, existing)
      }
    }

    const payments: BillBreakdown["payments"] = paymentRecords.map(p => {
      let splitDetails: { cash?: number; upi?: number; card?: number } | null = null
      if (p.paymentMethod === "SPLIT" || p.splitCashAmount || p.splitUpiAmount || p.splitCardAmount) {
        const fallback = fallbackSplitMap.get(p.id) || (p.billNumber ? fallbackSplitMap.get(p.billNumber) : undefined)
        const cash = (p.splitCashAmount ?? fallback?.cash) || undefined
        const upi = (p.splitUpiAmount ?? fallback?.upi) || undefined
        const card = (p.splitCardAmount ?? fallback?.card) || undefined
        if (cash || upi || card) {
          splitDetails = { cash, upi, card }
        }
      }

      // Fallback: parse split details from notes if not present yet
      if (!splitDetails && p.notes) {
        const cashM = p.notes.match(/Cash:\s*₹?([\d,.]+)/i)
        const upiM = p.notes.match(/UPI:\s*₹?([\d,.]+)/i)
        const cardM = p.notes.match(/Card:\s*₹?([\d,.]+)/i)
        if (cashM || upiM || cardM) {
          const cashVal = cashM ? parseFloat(cashM[1].replace(/,/g, "")) : undefined
          const upiVal = upiM ? parseFloat(upiM[1].replace(/,/g, "")) : undefined
          const cardVal = cardM ? parseFloat(cardM[1].replace(/,/g, "")) : undefined
          if (cashVal || upiVal || cardVal) {
            splitDetails = {
              cash: cashVal,
              upi: upiVal,
              card: cardVal,
            }
          }
        }
      }

      return {
        id: p.id,
        billNumber: p.billNumber,
        amount: p.paidAmount || 0,
        mode: p.paymentMethod || "CASH",
        date: p.billDate.toISOString(),
        notes: p.notes || null,
        splitDetails,
      }
    })

    const netPayable = subtotal - totalAmountPaid

    // ── Insurance check ──
    const activePolicies = admission.patient.insurancePolicies || []
    const hasActivePolicy = activePolicies.length > 0

    // Check for pre-authorization budget (search by admissionId first, fallback to patientId)
    let preAuth = await prisma.preAuthorization.findFirst({
      where: {
        admissionId: admission.id,
        status: { in: ["APPROVED", "APPROVED_WITH_MODIFICATION", "ENHANCEMENT_APPROVED", "DISCHARGE_APPROVED"] },
      },
      orderBy: { createdAt: "desc" },
    })
    // Fallback: search by patientId if no admission-linked PreAuth found
    if (!preAuth) {
      preAuth = await prisma.preAuthorization.findFirst({
        where: {
          patientId: admission.patientId,
          status: { in: ["APPROVED", "APPROVED_WITH_MODIFICATION", "ENHANCEMENT_APPROVED", "DISCHARGE_APPROVED"] },
        },
        orderBy: { createdAt: "desc" },
      })
    }

    let insuranceApprovedAmount = 0
    let insuranceCoveredAmount = 0
    const totalBill = subtotal
    let patientLiability = totalBill // Default to totalBill if no insurance

    if (preAuth && preAuth.approvedAmount) {
      insuranceApprovedAmount = preAuth.approvedAmount
      
      if (totalBill <= insuranceApprovedAmount) {
        insuranceCoveredAmount = totalBill
        patientLiability = 0
      } else {
        insuranceCoveredAmount = insuranceApprovedAmount
        patientLiability = totalBill - insuranceApprovedAmount
      }
    } else if (admission.patient.isBsky || hasActivePolicy) {
      const isSpecialScheme = admission.patient.isBsky || activePolicies.some(p => p.schemeType === "PMJAY" || p.schemeType === "BSKY");
      
      if (isSpecialScheme) {
        insuranceApprovedAmount = 500000;
        insuranceCoveredAmount = totalBill;
        patientLiability = 0;
      } else {
        const allClaims = activePolicies.flatMap(p => p.claims || [])
        const approvedClaim = allClaims.find(c => c.status === "APPROVED" && c.approvedAmount)
        
        if (approvedClaim && approvedClaim.approvedAmount) {
          insuranceApprovedAmount = approvedClaim.approvedAmount
        } else {
          const bestPolicy = activePolicies.reduce((best, p) => 
            (p.coverageAmount || 0) > (best?.coverageAmount || 0) ? p : best, 
            activePolicies[0]
          )
          insuranceApprovedAmount = bestPolicy?.coverageAmount || 0
        }

        if (insuranceApprovedAmount > 0) {
          if (totalBill <= insuranceApprovedAmount) {
            insuranceCoveredAmount = totalBill
            patientLiability = 0
          } else {
            insuranceCoveredAmount = insuranceApprovedAmount
            patientLiability = totalBill - insuranceApprovedAmount
          }
        }
      }
    }

    const balanceDue = patientLiability - totalAmountPaid

    writeAuditLog({ userId: authResult.session.userId, action: "PROCESS", module: "FinalBill", recordId: admissionId, changes: { totalAmount: subtotal } })

    return {
      success: true,
      message: "Bill calculated successfully",
      data: {
        admissionId,
        patientName: admission.patient.user.name || "Unknown",
        patientId: admission.patient.patientId,
        bedNumber: admission.bed.bedNumber,
        wardName: admission.bed.ward.name,
        wardType: admission.bed.ward.type,
        doctorName: admission.primaryDoctor.user.name || "Unknown",
        admissionDate: admissionDate.toISOString(),
        daysAdmitted,
        bedRatePerDay,
        roomRent,
        bedCharges,
        pharmacyTotal,
        labTotal,
        doctorFees,
        doctorFeePerDay: 0,
        otherCharges,
        canteenTotal,
        surgeryTotal,
        nursingTotal,
        equipmentTotal,
        customChargesTotal,
        labTests,
        medicines,
        canteenOrders,
        surgeries: allSurgeries,
        nurseAssignments,
        doctorVisits,
        equipments,
        customCharges,
        discountAmount: discountValue,
        discountPercent,
        discountType,
        discountReason,
        subtotal,
        pharmacyTax: 0,
        totalBillAmount: subtotal,
        advanceDeposit,
        amountPaid: totalAmountPaid,
        netPayable,
        balanceDue,
        hasInsuranceCoverage: hasActivePolicy || !!preAuth || admission.patient.isBsky,
        insuranceApprovedAmount,
        insuranceCoveredAmount,
        patientLiability,
        isBsky: admission.patient.isBsky,
        payments,
        dischargeDate: admission.dischargeDate ? admission.dischargeDate.toISOString() : (options?.asOfDate ? new Date(options.asOfDate).toISOString() : null),
      },
    }
  } catch (error: any) {
    console.error("[ERROR] calculateFinalBill:", error)
    return {
      success: false,
      message: error.message || "Failed to calculate bill",
      data: null,
    }
  }
}
/**
 * Helper to parse frequency string into daily dose count
 */
function parseDailyDose(freq: string): number {
  const f = freq.toUpperCase()
  if (f.includes("-")) {
    return f.split("-").reduce((sum, n) => sum + (parseInt(n) || 0), 0)
  }
  if (f === "BD" || f === "BID") return 2
  if (f === "TDS" || f === "TID") return 3
  if (f === "QID") return 4
  if (f === "OD") return 1
  if (f === "STAT" || f === "SOS") return 1
  return 1
}

// ============================================
// PROCESS IPD PAYMENT
// ============================================

export async function processIpdPayment(
  admissionId: string,
  amount: number,
  paymentMode: string,
  notes?: string,
  splitPayments?: { cash?: number; upi?: number; card?: number },
  paymentDate?: string | Date
) {
  const authResult = await requireAuthSafe(["SUPER_ADMIN", "ACCOUNTANT", "RECEPTIONIST"])
  if (!authResult.ok) return { success: false, message: authResult.error }

  if (amount <= 0) {
    return { success: false, message: "Payment amount must be greater than zero." }
  }

  const isSplit = paymentMode === "SPLIT"

  // Validate split payment amounts match total
  if (isSplit) {
    if (!splitPayments) {
      return { success: false, message: "Split payment details are required." }
    }
    const splitTotal = (splitPayments.cash || 0) + (splitPayments.upi || 0) + (splitPayments.card || 0)
    if (Math.abs(splitTotal - amount) > 1) {
      return { success: false, message: `Split total (₹${splitTotal.toFixed(2)}) does not match payment amount (₹${amount.toFixed(2)}).` }
    }
  }

  try {
    const admission = await prisma.iPDAdmission.findUnique({
      where: { id: admissionId },
    })

    if (!admission) {
      return { success: false, message: "Admission not found" }
    }

    // Determine effective payment date and validate against patient's admission date
    const admissionDate = new Date(admission.admissionDate)
    let effectivePaymentDate = new Date()
    if (paymentDate) {
      const parsed = new Date(paymentDate)
      if (!isNaN(parsed.getTime())) {
        const admissionDayStart = new Date(admissionDate)
        admissionDayStart.setHours(0, 0, 0, 0)
        if (parsed < admissionDayStart) {
          return {
            success: false,
            message: `Payment date (${parsed.toLocaleDateString("en-IN")}) cannot be earlier than patient's admission date (${admissionDate.toLocaleDateString("en-IN")}).`
          }
        }
        effectivePaymentDate = parsed
      }
    }

    // Wrap in a transaction to ensure data integrity
    const result = await prisma.$transaction(async (tx) => {
      // 1. Create the billing record
      const billNumber = `IPD-PAY-${Date.now()}`
      const paymentRecord = await tx.billing.create({
        data: {
          billNumber,
          patientId: admission.patientId,
          ipdAdmissionId: admissionId,
          type: "IPD",
          status: "PAID",
          billDate: effectivePaymentDate,
          createdAt: effectivePaymentDate,
          totalAmount: amount,
          discountAmount: 0,
          netAmount: amount,
          paidAmount: amount,
          balanceAmount: 0,
          paymentMethod: paymentMode,
          notes: notes || null,
          // Store split amounts when payment is split
          ...(isSplit && splitPayments ? {
            splitCashAmount: splitPayments.cash || null,
            splitUpiAmount: splitPayments.upi || null,
            splitCardAmount: splitPayments.card || null,
          } : {}),
        },
      })

      // 2. Update admission amountPaid and balanceDue
      const newAmountPaid = (admission.amountPaid || 0) + amount
      
      const updatedAdmission = await tx.iPDAdmission.update({
        where: { id: admissionId },
        data: {
          amountPaid: newAmountPaid,
          balanceDue: Math.max(0, (admission.balanceDue || 0) - amount),
        },
      })

      // 3. Log event with accurate payment date
      const splitDescription = isSplit && splitPayments
        ? `Split (Cash: ₹${(splitPayments.cash || 0).toFixed(2)}, UPI: ₹${(splitPayments.upi || 0).toFixed(2)}, Card: ₹${(splitPayments.card || 0).toFixed(2)})`
        : paymentMode
      await tx.patientTimelineEvent.create({
        data: {
          admissionId,
          title: "Payment Received",
          description: `₹${amount.toFixed(2)} paid via ${splitDescription} (Date: ${effectivePaymentDate.toLocaleDateString("en-IN")}). ${notes ? `Notes: ${notes}` : ""}`,
          type: "GENERAL",
          timestamp: effectivePaymentDate,
        }
      })

      // 4. Create ledger transaction(s) + update account balance(s) with effective backdate
      if (isSplit && splitPayments) {
        // For split payments, create separate ledger entries per method
        const splits: Array<[string, number]> = [
          ["CASH", splitPayments.cash || 0],
          ["UPI", splitPayments.upi || 0],
          ["CARD", splitPayments.card || 0],
        ]
        for (const [method, splitAmount] of splits) {
          if (splitAmount > 0) {
            const accountId = await resolveFinancialAccount(tx, method)
            if (accountId) {
              const accountGroupCode = resolveAccountGroupCode("INCOME", "IPD_PAYMENT", "IPD")
              await tx.transaction.create({
                data: {
                  accountId,
                  type: "INCOME",
                  amount: splitAmount,
                  category: "IPD_PAYMENT",
                  paymentMethod: method,
                  referenceId: paymentRecord.id,
                  description: `IPD payment (split ${method}) for admission ${admissionId} - ${billNumber}`,
                  accountGroupCode,
                  billingType: "IPD",
                  date: effectivePaymentDate,
                  createdAt: effectivePaymentDate,
                },
              })
              await tx.financialAccount.update({
                where: { id: accountId },
                data: { currentBalance: { increment: splitAmount } },
              })
            }
          }
        }
      } else {
        // Single payment method — original logic
        const accountId = await resolveFinancialAccount(tx, paymentMode)
        if (accountId) {
          const accountGroupCode = resolveAccountGroupCode("INCOME", "IPD_PAYMENT", "IPD")
          await tx.transaction.create({
            data: {
              accountId,
              type: "INCOME",
              amount,
              category: "IPD_PAYMENT",
              paymentMethod: paymentMode,
              referenceId: paymentRecord.id,
              description: `IPD payment for admission ${admissionId} - ${billNumber}`,
              accountGroupCode,
              billingType: "IPD",
              date: effectivePaymentDate,
              createdAt: effectivePaymentDate,
            },
          })
          await tx.financialAccount.update({
            where: { id: accountId },
            data: { currentBalance: { increment: amount } },
          })
        }
      }

      return paymentRecord
    })

    writeAuditLog({
      userId: authResult.session.userId,
      action: "CREATE",
      module: "IPDPayment",
      recordId: result.id,
      changes: { amount, paymentMode, ...(isSplit ? { splitPayments } : {}) },
    })

    // Authoritative cache invalidation across all billing, IPD, and financial account views
    revalidatePath("/dashboard/billing-counter/ipd")
    revalidatePath("/dashboard/ipd")
    revalidatePath(`/dashboard/ipd/patient/${admissionId}`)
    revalidatePath("/dashboard/finance")
    revalidatePath("/dashboard/master-finance")
    revalidatePath("/dashboard/master-finance/cash-bank/accounts")
    revalidatePath("/dashboard/master-finance/general-ledger")
    revalidatePath("/dashboard/reports/day-book")
    revalidatePath("/dashboard/ipd/print/bill")

    return { success: true, message: "Payment processed successfully", data: result }
  } catch (error: any) {
    console.error("[ERROR] processIpdPayment:", error)
    return { success: false, message: error.message || "Failed to process payment" }
  }
}

// ============================================
// REVERSE IPD PAYMENT
// ============================================

export async function reverseIpdPayment(billingId: string, reason?: string) {
  const authResult = await requireAuthSafe(["SUPER_ADMIN", "ACCOUNTANT", "ADMIN"])
  if (!authResult.ok) return { success: false, message: authResult.error }

  try {
    const result = await prisma.$transaction(async (tx) => {
      // 1. Fetch the billing record
      const bill = await tx.billing.findUnique({
        where: { id: billingId },
        include: { ipdAdmission: true }
      })

      if (!bill) {
        throw new Error("Payment record not found")
      }
      if (bill.type !== "IPD" || bill.status !== "PAID") {
        throw new Error("Only completed IPD payment receipts can be reversed")
      }

      const amountToReverse = bill.paidAmount || bill.totalAmount || 0
      const admissionId = bill.ipdAdmissionId

      // 2. Find and reverse financial transactions
      const transactions = await tx.transaction.findMany({
        where: { referenceId: billingId }
      })

      for (const t of transactions) {
        if (t.accountId && t.amount > 0) {
          await tx.financialAccount.update({
            where: { id: t.accountId },
            data: { currentBalance: { decrement: t.amount } }
          })
        }
      }

      // Delete the transactions
      if (transactions.length > 0) {
        await tx.transaction.deleteMany({
          where: { referenceId: billingId }
        })
      }

      // 3. Update IPD admission amountPaid
      if (admissionId) {
        await tx.iPDAdmission.update({
          where: { id: admissionId },
          data: {
            amountPaid: { decrement: amountToReverse }
          }
        })
      }

      // 4. Delete the billing payment record
      await tx.billing.delete({
        where: { id: billingId }
      })

      return {
        billNumber: bill.billNumber,
        amount: amountToReverse,
        admissionId
      }
    })

    writeAuditLog({
      userId: authResult.session.userId,
      action: "DELETE",
      module: "IPDPayment",
      recordId: billingId,
      changes: {
        billNumber: result.billNumber,
        reversedAmount: result.amount,
        admissionId: result.admissionId,
        reason: reason || "Payment reversed by user"
      }
    })

    if (result.admissionId) {
      revalidatePath("/dashboard/billing-counter/ipd")
      revalidatePath(`/dashboard/ipd/patient/${result.admissionId}`)
      revalidatePath("/dashboard/ipd")
      revalidatePath("/dashboard/finance")
      revalidatePath("/dashboard/master-finance")
      revalidatePath("/dashboard/master-finance/cash-bank/accounts")
      revalidatePath("/dashboard/master-finance/general-ledger")
      revalidatePath("/dashboard/reports/day-book")
      revalidatePath("/dashboard/ipd/print/bill")
    }

    return { 
      success: true, 
      message: `Payment ${result.billNumber} of ₹${result.amount.toLocaleString('en-IN')} reversed successfully. Amount restored to pending balance.` 
    }
  } catch (error: any) {
    console.error("[ERROR] reverseIpdPayment:", error)
    return { success: false, message: error.message || "Failed to reverse payment" }
  }
}

// ============================================
// APPLY DISCOUNT
// ============================================

export async function applyDiscount(
  admissionId: string,
  discountType: "FLAT" | "PERCENTAGE",
  value: number,
  reason?: string
) {
  const authResult = await requireAuthSafe(["SUPER_ADMIN", "ACCOUNTANT"])
  if (!authResult.ok) return { success: false, message: authResult.error }

  if (value < 0) {
    return { success: false, message: "Discount value must be positive." }
  }
  if (discountType === "PERCENTAGE" && value > 100) {
    return { success: false, message: "Percentage discount cannot exceed 100%." }
  }

  try {
    const updateData: any = {
      discountType,
      discountReason: reason || null,
    }

    if (discountType === "FLAT") {
      updateData.discountAmount = value
      updateData.discountPercent = 0
    } else {
      updateData.discountPercent = value
      updateData.discountAmount = 0
    }

    await prisma.iPDAdmission.update({
      where: { id: admissionId },
      data: updateData,
    })

    // Remove any previous discount events from the timeline so they don't stack up
    await prisma.patientTimelineEvent.deleteMany({
      where: {
        admissionId,
        title: "Discount Applied"
      }
    })

    await prisma.patientTimelineEvent.create({
      data: {
        admissionId,
        title: "Discount Applied",
        description: discountType === "FLAT" 
          ? `₹${value.toFixed(2)} flat discount applied. ${reason ? `Reason: ${reason}` : ""}`
          : `${value}% discount applied. ${reason ? `Reason: ${reason}` : ""}`,
        type: "GENERAL",
      }
    })

    writeAuditLog({
      userId: authResult.session.userId,
      action: "UPDATE",
      module: "IPDDiscount",
      recordId: admissionId,
      changes: { discountType, value, reason },
    })

    revalidatePath("/dashboard/billing-counter/ipd")
    revalidatePath(`/dashboard/ipd/patient/${admissionId}`)
    revalidatePath("/dashboard/ipd/print/bill")

    return { success: true, message: "Discount applied successfully" }
  } catch (error: any) {
    console.error("[ERROR] applyDiscount:", error)
    return { success: false, message: error.message || "Failed to apply discount" }
  }
}

// ============================================
// CUSTOM CHARGES / ADDONS
// ============================================

export async function addCustomCharge(data: {
  admissionId: string
  category?: string
  name: string
  amount: number
  quantity: number
  discountPercent?: number
  discountAmount?: number
  date?: string
}) {
  const authResult = await requireAuthSafe(["SUPER_ADMIN", "ACCOUNTANT", "DOCTOR", "RECEPTIONIST", "NURSE"])
  if (!authResult.ok) return { success: false, message: authResult.error }

  if (!data.name || data.amount <= 0 || data.quantity <= 0) {
    return { success: false, message: "Invalid charge details." }
  }

  try {
    const totalBeforeDiscount = data.amount * data.quantity
    let discountValue = 0

    if (data.discountPercent && data.discountPercent > 0) {
      discountValue = totalBeforeDiscount * (data.discountPercent / 100)
    } else if (data.discountAmount && data.discountAmount > 0) {
      discountValue = data.discountAmount
    }

    const totalAmount = Math.max(0, totalBeforeDiscount - discountValue)
    const chargeDate = data.date ? new Date(data.date) : new Date()

    const admission = await prisma.iPDAdmission.findUnique({
      where: { id: data.admissionId },
      select: { admissionDate: true },
    })

    if (admission) {
      const admissionDayStart = new Date(admission.admissionDate)
      admissionDayStart.setHours(0, 0, 0, 0)
      if (chargeDate < admissionDayStart) {
        return {
          success: false,
          message: `Charge date (${chargeDate.toLocaleDateString("en-IN")}) cannot be earlier than patient's admission date (${admission.admissionDate.toLocaleDateString("en-IN")}).`
        }
      }
    }

    const charge = await prisma.iPDCustomCharge.create({
      data: {
        admissionId: data.admissionId,
        category: data.category || "ADDON",
        name: data.name,
        amount: data.amount,
        quantity: data.quantity,
        discountPercent: data.discountPercent || 0,
        discountAmount: data.discountAmount || 0,
        totalAmount,
        date: chargeDate,
      }
    })

    writeAuditLog({
      userId: authResult.session.userId,
      action: "CREATE",
      module: "IPDCustomCharge",
      recordId: charge.id,
      changes: { ...data, totalAmount, category: data.category || "ADDON" },
    })

    revalidatePath("/dashboard/billing-counter/ipd")
    revalidatePath(`/dashboard/ipd/patient/${data.admissionId}`)
    revalidatePath("/dashboard/ipd/print/bill")

    return { success: true, message: "Charge added successfully", data: charge }
  } catch (error: any) {
    console.error("[ERROR] addCustomCharge:", error)
    return { success: false, message: error.message || "Failed to add charge" }
  }
}

export async function removeCustomCharge(chargeId: string) {
  const authResult = await requireAuthSafe(["SUPER_ADMIN", "ACCOUNTANT", "DOCTOR", "RECEPTIONIST", "NURSE"])
  if (!authResult.ok) return { success: false, message: authResult.error }

  try {
    const charge = await prisma.iPDCustomCharge.delete({
      where: { id: chargeId },
    })

    writeAuditLog({
      userId: authResult.session.userId,
      action: "DELETE",
      module: "IPDCustomCharge",
      recordId: chargeId,
      changes: charge,
    })

    if (charge.admissionId) {
      revalidatePath("/dashboard/billing-counter/ipd")
      revalidatePath(`/dashboard/ipd/patient/${charge.admissionId}`)
      revalidatePath("/dashboard/ipd/print/bill")
    }

    return { success: true, message: "Charge removed successfully" }
  } catch (error: any) {
    console.error("[ERROR] removeCustomCharge:", error)
    return { success: false, message: error.message || "Failed to remove charge" }
  }
}
