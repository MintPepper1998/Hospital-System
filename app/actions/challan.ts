"use server"

import { prisma } from "@/lib/prisma"
import { revalidatePath } from "next/cache"
import { requireAuth, requireAuthSafe } from "@/lib/auth-guard"
import { writeAuditLog } from "@/lib/audit"
import { actionError, getErrorMessage } from "@/lib/action-result"
import { addToInventory, reverseFromInventory } from "@/lib/inventory-service"

// ============================================
// TYPES
// ============================================

export interface ChallanItemInput {
  itemName: string
  medicineId?: string | null
  batchNumber?: string
  expiryDate?: string // ISO string
  quantity: number     // Number of strips/packs (paid)
  freeQuantity?: number // Free/Bonus strips from supplier schemes
  packSize?: number    // Units per strip/pack
  sellPrice: number    // MRP per strip
  hsnCode?: string
  isFreeGood?: boolean
}

export interface ChallanListData {
  id: string
  challanNumber: string
  date: string
  supplierName: string
  itemCount: number
  status: string
  convertedToInvoice: string | null
}

export interface ChallanDetailData {
  id: string
  challanNumber: string
  date: string
  supplierId: string
  supplierName: string
  status: string
  notes: string | null
  convertedToId: string | null
  items: {
    id: string
    itemName: string
    medicineId: string | null
    batchNumber: string | null
    expiryDate: string | null
    quantity: number
    freeQuantity: number
    packSize: number
    sellPrice: number
    hsnCode: string | null
    isFreeGood: boolean
  }[]
}

// ============================================
// GET CHALLANS (List)
// ============================================

export async function getChallans(): Promise<{ success: boolean; data?: ChallanListData[]; message?: string }> {
  try {
    await requireAuth()

    const challans = await prisma.challan.findMany({
      include: {
        supplier: { select: { name: true } },
        _count: { select: { items: true } },
        convertedTo: { select: { invoiceNumber: true } },
      },
      orderBy: { date: "desc" },
    })

    const data: ChallanListData[] = challans.map((c) => ({
      id: c.id,
      challanNumber: c.challanNumber,
      date: c.date.toISOString(),
      supplierName: c.supplier.name,
      itemCount: c._count.items,
      status: c.status,
      convertedToInvoice: c.convertedTo?.invoiceNumber || null,
    }))

    return { success: true, data }
  } catch (error) {
    console.error("[ERROR] getChallans:", error)
    return { success: false, message: getErrorMessage(error) }
  }
}

// ============================================
// GET CHALLAN BY ID (Detail)
// ============================================

export async function getChallanById(id: string): Promise<{ success: boolean; data?: ChallanDetailData; message?: string }> {
  try {
    await requireAuth()

    const challan = await prisma.challan.findUnique({
      where: { id },
      include: {
        supplier: { select: { name: true } },
        items: true,
      },
    })

    if (!challan) return { success: false, message: "Challan not found" }

    return {
      success: true,
      data: {
        id: challan.id,
        challanNumber: challan.challanNumber,
        date: challan.date.toISOString(),
        supplierId: challan.supplierId,
        supplierName: challan.supplier.name,
        status: challan.status,
        notes: challan.notes,
        convertedToId: challan.convertedToId,
        items: challan.items.map((item) => ({
          id: item.id,
          itemName: item.itemName,
          medicineId: item.medicineId,
          batchNumber: item.batchNumber,
          expiryDate: item.expiryDate?.toISOString() || null,
          quantity: item.quantity,
          freeQuantity: item.freeQuantity,
          packSize: item.packSize,
          sellPrice: item.sellPrice,
          hsnCode: item.hsnCode,
          isFreeGood: item.isFreeGood,
        })),
      },
    }
  } catch (error) {
    console.error("[ERROR] getChallanById:", error)
    return { success: false, message: getErrorMessage(error) }
  }
}

// ============================================
// HELPERS
// ============================================

const round2 = (n: number) => Number(n.toFixed(2))

// ============================================
// CREATE CHALLAN
// ============================================

export async function createChallan(data: {
  challanNumber: string
  date: string
  supplierId: string
  notes?: string
  items: ChallanItemInput[]
}): Promise<{ success: boolean; message: string; id?: string }> {
  const authResult = await requireAuthSafe(["SUPER_ADMIN", "ACCOUNTANT", "PHARMACIST"])
  if (!authResult.ok) return { success: false, message: authResult.error }

  try {
    if (!data.challanNumber?.trim()) return { success: false, message: "Challan number is required" }
    if (!data.supplierId) return { success: false, message: "Select a supplier" }
    if (!data.items || data.items.length === 0) return { success: false, message: "Add at least one item" }

    const result = await prisma.$transaction(async (tx) => {
      // A. Create Challan + nested ChallanItems
      const challan = await tx.challan.create({
        data: {
          challanNumber: data.challanNumber.trim(),
          date: new Date(data.date),
          supplierId: data.supplierId,
          notes: data.notes?.trim() || null,
          status: "PENDING",
          items: {
            create: data.items.map((item) => ({
              itemName: item.itemName.trim(),
              medicineId: item.medicineId || null,
              batchNumber: item.batchNumber?.trim() || null,
              expiryDate: item.expiryDate ? new Date(item.expiryDate) : null,
              quantity: Math.max(1, Math.round(item.quantity)),
              freeQuantity: item.isFreeGood ? 0 : Math.max(0, Math.round(item.freeQuantity || 0)),
              packSize: Math.max(1, Math.round(item.packSize || 1)),
              sellPrice: round2(item.sellPrice),
              hsnCode: item.hsnCode?.trim() || null,
              isFreeGood: item.isFreeGood || false,
            })),
          },
        },
      })

      // B. Add stock to inventory (purchase price = 0, selling price = MRP)
      for (const item of data.items) {
        if (item.medicineId) {
          const packSize = Math.max(1, Math.round(item.packSize || 1))
          const batchKey = item.batchNumber?.trim() || `CH-${challan.id.slice(-6)}`
          const expiryDate = item.expiryDate
            ? new Date(item.expiryDate)
            : new Date(Date.now() + 365 * 24 * 60 * 60 * 1000)

          await addToInventory(tx, {
            medicineId: item.medicineId,
            batchNumber: batchKey,
            supplierId: data.supplierId,
            paidStrips: item.isFreeGood ? 0 : Math.max(1, Math.round(item.quantity)),
            freeStrips: item.isFreeGood ? Math.max(1, Math.round(item.quantity)) : Math.max(0, Math.round(item.freeQuantity || 0)),
            packSize,
            purchasePricePerStrip: 0, // No purchase price on challan
            sellingPricePerStrip: round2(item.sellPrice),
            expiryDate,
            invoiceNumber: `CH-${data.challanNumber.trim()}`,
            invoiceDate: new Date(data.date),
          })
        }
      }

      return challan
    })

    revalidatePath("/dashboard/pharmacy/challans")
    revalidatePath("/dashboard/pharmacy/inventory")

    writeAuditLog({
      userId: authResult.session.userId,
      action: "CREATE",
      module: "Challan",
      recordId: result.id,
      changes: { challanNumber: data.challanNumber, supplierId: data.supplierId },
    })

    return { success: true, message: `Challan #${data.challanNumber} created. Stock added to inventory.`, id: result.id }
  } catch (error) {
    console.error("[ERROR] createChallan:", error)
    return actionError(getErrorMessage(error))
  }
}

// ============================================
// UPDATE CHALLAN (Edit — only if PENDING)
// ============================================

export async function updateChallan(data: {
  id: string
  challanNumber: string
  date: string
  supplierId: string
  notes?: string
  items: ChallanItemInput[]
}): Promise<{ success: boolean; message: string }> {
  const authResult = await requireAuthSafe(["SUPER_ADMIN", "ACCOUNTANT", "PHARMACIST"])
  if (!authResult.ok) return { success: false, message: authResult.error }

  try {
    if (!data.challanNumber?.trim()) return { success: false, message: "Challan number is required" }
    if (!data.supplierId) return { success: false, message: "Select a supplier" }
    if (!data.items || data.items.length === 0) return { success: false, message: "Add at least one item" }

    const existing = await prisma.challan.findUnique({
      where: { id: data.id },
      include: { items: true },
    })

    if (!existing) return { success: false, message: "Challan not found" }
    if (existing.status === "CONVERTED") {
      return { success: false, message: "Cannot edit a converted challan" }
    }

    await prisma.$transaction(async (tx) => {
      // A. Reverse OLD inventory for each medicine item
      for (const oldItem of existing.items) {
        if (!oldItem.medicineId) continue
        const batchKey = oldItem.batchNumber || `CH-${existing.id.slice(-6)}`
        const totalUnits = (oldItem.quantity + (oldItem.freeQuantity || 0)) * (oldItem.packSize || 1)

        try {
          await reverseFromInventory(tx, {
            medicineId: oldItem.medicineId,
            batchNumber: batchKey,
            totalUnits,
          })
        } catch (e) {
          console.warn(`[WARN] Could not reverse old inventory for batch ${batchKey}:`, e)
        }
      }

      // B. Delete old items
      await tx.challanItem.deleteMany({ where: { challanId: data.id } })

      // C. Update challan header + create new items
      await tx.challan.update({
        where: { id: data.id },
        data: {
          challanNumber: data.challanNumber.trim(),
          date: new Date(data.date),
          supplierId: data.supplierId,
          notes: data.notes?.trim() || null,
          items: {
            create: data.items.map((item) => ({
              itemName: item.itemName.trim(),
              medicineId: item.medicineId || null,
              batchNumber: item.batchNumber?.trim() || null,
              expiryDate: item.expiryDate ? new Date(item.expiryDate) : null,
              quantity: Math.max(1, Math.round(item.quantity)),
              freeQuantity: item.isFreeGood ? 0 : Math.max(0, Math.round(item.freeQuantity || 0)),
              packSize: Math.max(1, Math.round(item.packSize || 1)),
              sellPrice: round2(item.sellPrice),
              hsnCode: item.hsnCode?.trim() || null,
              isFreeGood: item.isFreeGood || false,
            })),
          },
        },
      })

      // D. Add NEW inventory
      for (const item of data.items) {
        if (item.medicineId) {
          const packSize = Math.max(1, Math.round(item.packSize || 1))
          const batchKey = item.batchNumber?.trim() || `CH-${existing.id.slice(-6)}`
          const expiryDate = item.expiryDate
            ? new Date(item.expiryDate)
            : new Date(Date.now() + 365 * 24 * 60 * 60 * 1000)

          await addToInventory(tx, {
            medicineId: item.medicineId,
            batchNumber: batchKey,
            supplierId: data.supplierId,
            paidStrips: item.isFreeGood ? 0 : Math.max(1, Math.round(item.quantity)),
            freeStrips: item.isFreeGood ? Math.max(1, Math.round(item.quantity)) : Math.max(0, Math.round(item.freeQuantity || 0)),
            packSize,
            purchasePricePerStrip: 0,
            sellingPricePerStrip: round2(item.sellPrice),
            expiryDate,
            invoiceNumber: `CH-${data.challanNumber.trim()}`,
            invoiceDate: new Date(data.date),
          })
        }
      }
    })

    revalidatePath("/dashboard/pharmacy/challans")
    revalidatePath("/dashboard/pharmacy/inventory")

    writeAuditLog({
      userId: authResult.session.userId,
      action: "UPDATE",
      module: "Challan",
      recordId: data.id,
      changes: { challanNumber: data.challanNumber },
    })

    return { success: true, message: `Challan #${data.challanNumber} updated. Inventory adjusted.` }
  } catch (error) {
    console.error("[ERROR] updateChallan:", error)
    return actionError(getErrorMessage(error))
  }
}

// ============================================
// CONVERT CHALLAN TO PURCHASE INVOICE
// ============================================

export async function convertChallanToInvoice(data: {
  challanId: string
  invoiceNumber: string
  date: string
  items: {
    challanItemId: string
    rate: number        // Purchase price per strip
    taxPercent?: number
    discountPercent?: number
  }[]
  amountPaid: number
  accountId?: string
  paymentMethod?: string
}): Promise<{ success: boolean; message: string; invoiceId?: string }> {
  const authResult = await requireAuthSafe(["SUPER_ADMIN", "ACCOUNTANT", "PHARMACIST"])
  if (!authResult.ok) return { success: false, message: authResult.error }

  try {
    if (!data.invoiceNumber?.trim()) return { success: false, message: "Invoice number is required" }
    if (!data.items || data.items.length === 0) return { success: false, message: "No items to convert" }
    if (data.amountPaid > 0 && !data.accountId) {
      return { success: false, message: "Select a payment account when paying" }
    }

    // Get the challan with items
    const challan = await prisma.challan.findUnique({
      where: { id: data.challanId },
      include: { items: true },
    })

    if (!challan) return { success: false, message: "Challan not found" }
    if (challan.status === "CONVERTED") return { success: false, message: "This challan is already converted" }



    // Build a map of challanItemId → conversion data
    const conversionMap = new Map(data.items.map((i) => [i.challanItemId, i]))

    // Calculate totals
    let subTotal = 0
    let taxTotal = 0
    for (const challanItem of challan.items) {
      const conv = conversionMap.get(challanItem.id)
      if (!conv) continue
      if (challanItem.isFreeGood) continue // Free goods don't count toward invoice totals

      const lineBase = round2(challanItem.quantity * conv.rate)
      const lineDiscount = round2(lineBase * ((conv.discountPercent || 0) / 100))
      const lineAfterDiscount = round2(lineBase - lineDiscount)
      const lineTax = round2(lineAfterDiscount * ((conv.taxPercent || 0) / 100))
      subTotal += lineAfterDiscount
      taxTotal += lineTax
    }
    subTotal = round2(subTotal)
    taxTotal = round2(taxTotal)
    const grandTotal = round2(subTotal + taxTotal)

    const balanceDue = grandTotal - data.amountPaid
    const status = balanceDue <= 0.01 ? "PAID" : data.amountPaid > 0 ? "PARTIAL" : "UNPAID"

    const result = await prisma.$transaction(async (tx) => {
      // A. Create PurchaseInvoice with proper prices
      const invoice = await tx.purchaseInvoice.create({
        data: {
          invoiceNumber: data.invoiceNumber.trim(),
          date: new Date(data.date),
          supplierId: challan.supplierId,
          subTotal,
          taxTotal,
          grandTotal,
          amountPaid: data.amountPaid,
          status,
          items: {
            create: challan.items.map((challanItem) => {
              const conv = conversionMap.get(challanItem.id)
              const rate = conv?.rate || 0
              const taxPercent = conv?.taxPercent || 0
              const discountPercent = conv?.discountPercent || 0
              const lineBase = round2(challanItem.quantity * rate)
              const lineDiscount = round2(lineBase * (discountPercent / 100))
              const lineAfterDiscount = round2(lineBase - lineDiscount)
              const lineTax = round2(lineAfterDiscount * (taxPercent / 100))

              return {
                itemName: challanItem.itemName,
                medicineId: challanItem.medicineId,
                batchNumber: challanItem.batchNumber,
                expiryDate: challanItem.expiryDate,
                hsnCode: challanItem.hsnCode,
                quantity: challanItem.quantity,
                packSize: challanItem.packSize,
                rate: challanItem.isFreeGood ? 0 : rate,
                sellPrice: challanItem.sellPrice,
                taxPercent: challanItem.isFreeGood ? 0 : taxPercent,
                discountPercent: challanItem.isFreeGood ? 0 : discountPercent,
                totalAmount: challanItem.isFreeGood ? 0 : round2(lineAfterDiscount + lineTax),
                isFreeGood: challanItem.isFreeGood,
              }
            }),
          },
        },
      })

      // B. Update challan status
      await tx.challan.update({
        where: { id: data.challanId },
        data: { status: "CONVERTED", convertedToId: invoice.id },
      })

      // C. Update inventory batch purchase prices
      for (const challanItem of challan.items) {
        if (!challanItem.medicineId) continue
        const conv = conversionMap.get(challanItem.id)
        if (!conv) continue

        const batchKey = challanItem.batchNumber || `CH-${challan.id.slice(-6)}`
        const packSize = challanItem.packSize || 1
        const purchasePricePerUnit = Number((conv.rate / packSize).toFixed(4))

        // Update the batch's purchase price (was 0 from challan creation)
        await tx.inventoryBatch.updateMany({
          where: {
            medicineId: challanItem.medicineId,
            batchNumber: batchKey,
          },
          data: {
            purchasePrice: purchasePricePerUnit,
            taxPercent: conv.taxPercent || 0,
          },
        })
      }

      // D. Ledger update if paid
      if (data.amountPaid > 0 && data.accountId) {
        await tx.transaction.create({
          data: {
            accountId: data.accountId,
            type: "EXPENSE",
            amount: data.amountPaid,
            category: "PURCHASE",
            paymentMethod: data.paymentMethod || "CASH",
            referenceId: invoice.id,
            description: `Purchase Invoice #${data.invoiceNumber} (from Challan #${challan.challanNumber})`,
          },
        })
        await tx.financialAccount.update({
          where: { id: data.accountId },
          data: { currentBalance: { decrement: data.amountPaid } },
        })
      }

      return invoice
    })

    revalidatePath("/dashboard/pharmacy/challans")
    revalidatePath("/dashboard/pharmacy/purchase-invoices")
    revalidatePath("/dashboard/pharmacy/inventory")
    revalidatePath("/dashboard/finance")

    writeAuditLog({
      userId: authResult.session.userId,
      action: "UPDATE",
      module: "Challan",
      recordId: data.challanId,
      changes: { action: "CONVERT", invoiceId: result.id, invoiceNumber: data.invoiceNumber },
    })

    return { success: true, message: `Challan converted to Purchase Invoice #${data.invoiceNumber}`, invoiceId: result.id }
  } catch (error) {
    console.error("[ERROR] convertChallanToInvoice:", error)
    return actionError(getErrorMessage(error))
  }
}

// ============================================
// DELETE CHALLAN (only if PENDING)
// ============================================

export async function deleteChallan(id: string): Promise<{ success: boolean; message: string }> {
  const authResult = await requireAuthSafe(["SUPER_ADMIN", "PHARMACIST"])
  if (!authResult.ok) return { success: false, message: authResult.error }

  try {
    const challan = await prisma.challan.findUnique({
      where: { id },
      include: { items: true },
    })

    if (!challan) return { success: false, message: "Challan not found" }
    if (challan.status === "CONVERTED") {
      return { success: false, message: "Cannot delete a converted challan. Delete the purchase invoice instead." }
    }

    await prisma.$transaction(async (tx) => {
      // Reverse inventory for each medicine item
      for (const item of challan.items) {
        if (!item.medicineId) continue
        const batchKey = item.batchNumber || `CH-${challan.id.slice(-6)}`
        const packSize = item.packSize || 1
        const totalUnits = (item.quantity + (item.freeQuantity || 0)) * packSize

        try {
          await reverseFromInventory(tx, {
            medicineId: item.medicineId,
            batchNumber: batchKey,
            totalUnits,
          })
        } catch (e) {
          // If batch doesn't exist or units already sold, log and continue
          console.warn(`[WARN] Could not reverse inventory for batch ${batchKey}:`, e)
        }
      }

      // Delete challan (cascade deletes items)
      await tx.challan.delete({ where: { id } })
    })

    revalidatePath("/dashboard/pharmacy/challans")
    revalidatePath("/dashboard/pharmacy/inventory")

    writeAuditLog({
      userId: authResult.session.userId,
      action: "DELETE",
      module: "Challan",
      recordId: id,
      changes: { challanNumber: challan.challanNumber },
    })

    return { success: true, message: `Challan #${challan.challanNumber} deleted and inventory reversed` }
  } catch (error) {
    console.error("[ERROR] deleteChallan:", error)
    return actionError(getErrorMessage(error))
  }
}
