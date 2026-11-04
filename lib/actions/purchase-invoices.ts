"use server"

import { prisma } from "@/lib/prisma"
import { requireAuthSafe } from "@/lib/auth-guard"
import { revalidatePath } from "next/cache"
import { writeAuditLog } from "@/lib/audit"
import { addToInventory, reverseFromInventory } from "@/lib/inventory-service"
import { supplierAllowedFor, supplierScopeFilter } from "@/lib/supplier-scope"

const REVALIDATION_PATH = "/dashboard/pharmacy/purchase-invoices"

/**
 * Fetch all purchase invoices with supplier and item counts.
 */
export async function getPurchaseInvoices() {
  const authResult = await requireAuthSafe(["SUPER_ADMIN", "PHARMACIST"])
  if (!authResult.ok) return { success: false, message: authResult.error }

  try {
    const invoices = await prisma.purchaseInvoice.findMany({
      where: { supplier: supplierScopeFilter("PHARMACY") },
      include: {
        supplier: { select: { id: true, name: true, phone: true, gstNumber: true, scope: true } },
        items: {
          select: { id: true, itemName: true, quantity: true, freeQuantity: true, rate: true, taxPercent: true, discountPercent: true, totalAmount: true, batchNumber: true, hsnCode: true, expiryDate: true, sellPrice: true, medicineId: true, packSize: true, isFreeGood: true, medicine: { select: { type: true, strength: true } } }
        },
      },
      orderBy: { date: "desc" },
    })

    return { success: true, data: invoices }
  } catch (error) {
    console.error("[getPurchaseInvoices] Error:", error)
    return { success: false, message: "Failed to fetch purchase invoices" }
  }
}

/**
 * Fetch a single purchase invoice by ID with all details.
 */
export async function getPurchaseInvoiceById(id: string) {
  const authResult = await requireAuthSafe(["SUPER_ADMIN", "PHARMACIST"])
  if (!authResult.ok) return { success: false, message: authResult.error }

  try {
    const invoice = await prisma.purchaseInvoice.findUnique({
      where: { id },
      include: {
        supplier: true,
        items: {
          include: { medicine: { select: { type: true, strength: true } } },
          orderBy: { itemName: "asc" },
        },
        supplierPayments: {
          include: { account: { select: { name: true } } },
          orderBy: { date: "desc" },
        },
        purchaseReturns: {
          orderBy: { date: "desc" },
        },
      },
    })

    if (!invoice) return { success: false, message: "Purchase invoice not found" }
    if (!supplierAllowedFor(invoice.supplier.scope, "PHARMACY")) return { success: false, message: "Purchase invoice is outside pharmacy scope" }

    return { success: true, data: invoice }
  } catch (error) {
    console.error("[getPurchaseInvoiceById] Error:", error)
    return { success: false, message: "Failed to fetch purchase invoice" }
  }
}

/**
 * Record a payment against a purchase invoice.
 * Updates amountPaid and auto-sets status (UNPAID / PARTIAL / PAID).
 */
export async function recordPurchasePayment(
  invoiceId: string,
  paymentAmount: number,
  paymentMode?: string,
  referenceNumber?: string
) {
  const authResult = await requireAuthSafe(["SUPER_ADMIN", "PHARMACIST"])
  if (!authResult.ok) return { success: false, message: authResult.error }

  if (paymentAmount <= 0) return { success: false, message: "Payment amount must be greater than 0" }

  try {
    const invoice = await prisma.purchaseInvoice.findUnique({ where: { id: invoiceId } })
    if (!invoice) return { success: false, message: "Invoice not found" }
    const supplier = await prisma.supplier.findUnique({ where: { id: invoice.supplierId }, select: { scope: true } })
    if (!supplier || !supplierAllowedFor(supplier.scope, "PHARMACY")) return { success: false, message: "Supplier is not available for pharmacy payments" }

    const newPaid = invoice.amountPaid + paymentAmount
    const balanceDue = invoice.grandTotal - newPaid

    let newStatus: string
    if (balanceDue <= 0.01) {
      newStatus = "PAID"
    } else if (newPaid > 0) {
      newStatus = "PARTIAL"
    } else {
      newStatus = "UNPAID"
    }

    await prisma.purchaseInvoice.update({
      where: { id: invoiceId },
      data: {
        amountPaid: Math.min(newPaid, invoice.grandTotal),
        status: newStatus,
      },
    })

    revalidatePath(REVALIDATION_PATH)
    writeAuditLog({ userId: authResult.session.userId, action: "PROCESS", module: "PurchasePayment", recordId: invoiceId, changes: { amount: paymentAmount } })
    return { success: true, message: `Payment of ₹${paymentAmount.toFixed(2)} recorded successfully` }
  } catch (error) {
    console.error("[recordPurchasePayment] Error:", error)
    return { success: false, message: "Failed to record payment" }
  }
}

/**
 * Full edit of a purchase invoice: header fields + items + stock adjustment.
 * Uses a "reverse-then-reapply" strategy inside a single transaction.
 */
export async function updatePurchaseInvoiceFull(
  invoiceId: string,
  data: {
    invoiceNumber: string
    date: string
    supplierId: string
    amountPaid?: number
    roundOff?: number
    items: {
      itemName: string
      medicineId?: string | null
      generalItemId?: string | null
      batchNumber?: string
      expiryDate?: string
      hsnCode?: string
      quantity: number
      freeQuantity?: number
      packSize?: number
      rate: number
      sellPrice?: number | null
      taxPercent?: number
      discountPercent?: number
      totalAmount: number
      // Original DB units — when present, used INSTEAD of re-multiplying strips×packSize
      _dbQuantityUnits?: number
      _dbFreeQuantityUnits?: number
      isFreeGood?: boolean
    }[]
  }
) {
  const authResult = await requireAuthSafe(["SUPER_ADMIN", "PHARMACIST"])
  if (!authResult.ok) return { success: false, message: authResult.error }

  if (authResult.session.role === "PHARMACIST") {
    const { hasTemporaryPermission } = await import("@/lib/actions/permissions")
    const hasPerm = await hasTemporaryPermission(authResult.session.userId, "PHARMACY_EDIT")
    if (!hasPerm) return { success: false, message: "You do not have temporary access to edit invoices. Please request access from HR." }
  }

  try {
    if (!data.invoiceNumber?.trim()) return { success: false, message: "Invoice number is required" }
    if (!data.supplierId) return { success: false, message: "Select a supplier" }
    if (!data.items || data.items.length === 0) return { success: false, message: "Add at least one item" }

    // Round to 2 decimal places — for display totals and financial amounts
    const round2 = (n: number) => Number(n.toFixed(2))
    // Round to 4 decimal places — for per-unit rates (preserves precision after dividing by packSize)
    const round4 = (n: number) => Number(n.toFixed(4))

    // Calculate new totals
    // Note: item.quantity = strips, item.rate = strip price (from the form)
    // Invoice totals are computed at strip level (Qty × Rate = strips × strip price)
    let subTotal = 0
    let discountTotal = 0
    let taxTotal = 0
    for (const item of data.items) {
      if (item.isFreeGood) continue // Free goods don't count toward invoice totals
      const lineBase = round2(item.quantity * item.rate)
      const lineDiscountAmt = round2(lineBase * ((item.discountPercent || 0) / 100))
      const lineTaxable = round2(lineBase - lineDiscountAmt)
      const lineTax = round2(lineTaxable * ((item.taxPercent || 0) / 100))
      subTotal += lineBase
      discountTotal += lineDiscountAmt
      taxTotal += lineTax
    }
    subTotal = round2(subTotal)
    discountTotal = round2(discountTotal)
    taxTotal = round2(taxTotal)
    const roundOffVal = round2(data.roundOff || 0)
    const grandTotal = round2((subTotal - discountTotal) + taxTotal + roundOffVal)

    // Track all affected medicine IDs to recalculate stock at the end
    const affectedMedicineIds = new Set<string>()

    await prisma.$transaction(async (tx) => {
      // 1. Fetch old invoice with items
      const oldInvoice = await tx.purchaseInvoice.findUnique({
        where: { id: invoiceId },
        include: { items: true },
      })
      if (!oldInvoice) throw new Error("Invoice not found")
      const oldSupplier = await tx.supplier.findUnique({ where: { id: oldInvoice.supplierId }, select: { scope: true } })
      if (!oldSupplier || !supplierAllowedFor(oldSupplier.scope, "PHARMACY")) throw new Error("Existing supplier is not available for pharmacy invoices")
      const newSupplier = await tx.supplier.findUnique({ where: { id: data.supplierId }, select: { scope: true } })
      if (!newSupplier || !supplierAllowedFor(newSupplier.scope, "PHARMACY")) throw new Error("Supplier is not available for pharmacy invoices")

      // 2. REVERSE old stock for each old item
      // Old items store quantity as total units (strips × packSize) and freeQuantity as total free units
      for (const oldItem of oldInvoice.items) {
        if (oldItem.medicineId) {
          affectedMedicineIds.add(oldItem.medicineId)
          const batchKey = oldItem.batchNumber?.trim() || `PURCH-${oldInvoice.id.slice(-6)}`
          const totalOldUnits = oldItem.quantity + (oldItem.freeQuantity || 0)
          await reverseFromInventory(tx, {
            medicineId: oldItem.medicineId,
            batchNumber: batchKey,
            totalUnits: totalOldUnits,
          })
        } else if (oldItem.generalItemId) {
          await tx.generalItem.update({
            where: { id: oldItem.generalItemId },
            data: { stock: { decrement: oldItem.quantity } },
          })
        }
      }

      // 3. Delete all old PurchaseItems
      await tx.purchaseItem.deleteMany({ where: { invoiceId } })

      // Resolve medicines for all items (by ID -> by Name -> or Auto-Create)
      const resolvedMedicineMap = new Map<number, string>()
      for (let i = 0; i < data.items.length; i++) {
        const item = data.items[i]
        let mId = item.medicineId || null
        if (!mId && !item.generalItemId && item.itemName?.trim()) {
          let med = await tx.medicine.findFirst({
            where: { name: { equals: item.itemName.trim(), mode: "insensitive" } }
          })
          if (!med) {
            med = await tx.medicine.create({
              data: {
                name: item.itemName.trim(),
                type: "TABLET",
                hsnCode: item.hsnCode?.trim() || "3004",
                unitPrice: item.sellPrice ? round4(item.sellPrice / (item.packSize || 1)) : 0,
                minStockLevel: 50,
                isActive: true,
              }
            })
          }
          mId = med.id
        }
        if (mId) resolvedMedicineMap.set(i, mId)
      }

      // 4. Create new PurchaseItems
      await tx.purchaseItem.createMany({
        data: data.items.map((item, idx) => {
          const packSize = item.packSize || 1
          const totalUnits = item._dbQuantityUnits != null ? item._dbQuantityUnits : item.quantity * packSize
          const freeUnits = item._dbFreeQuantityUnits != null ? item._dbFreeQuantityUnits : (item.freeQuantity || 0) * packSize
          const perUnitRate = round4(item.rate / packSize)
          const perUnitSellPrice = item.sellPrice ? round4(item.sellPrice / packSize) : null

          const lineBase = round2(item.quantity * item.rate)
          const lineDiscountAmt = round2(lineBase * ((item.discountPercent || 0) / 100))
          const lineTaxable = round2(lineBase - lineDiscountAmt)
          const lineTax = round2(lineTaxable * ((item.taxPercent || 0) / 100))
          return {
            invoiceId,
            itemName: item.itemName.trim(),
            medicineId: resolvedMedicineMap.get(idx) || item.medicineId || null,
            generalItemId: item.generalItemId || null,
            batchNumber: item.batchNumber?.trim() || null,
            expiryDate: item.expiryDate ? new Date(item.expiryDate) : null,
            hsnCode: item.hsnCode?.trim() || null,
            quantity: totalUnits,
            freeQuantity: freeUnits,
            packSize,
            rate: item.isFreeGood ? 0 : perUnitRate,
            sellPrice: perUnitSellPrice,
            taxPercent: item.isFreeGood ? 0 : (item.taxPercent || 0),
            discountPercent: item.isFreeGood ? 0 : (item.discountPercent || 0),
            totalAmount: item.isFreeGood ? 0 : round2(lineTaxable + lineTax),
            isFreeGood: item.isFreeGood || false,
          }
        }),
      })

      // 5. APPLY new stock for each new item via centralized service
      for (let idx = 0; idx < data.items.length; idx++) {
        const item = data.items[idx]
        const finalMedicineId = resolvedMedicineMap.get(idx) || item.medicineId
        if (finalMedicineId) {
          affectedMedicineIds.add(finalMedicineId)
          const batchKey = item.batchNumber?.trim() || `PURCH-${invoiceId.slice(-6)}`
          const expiryDate = item.expiryDate
            ? new Date(item.expiryDate)
            : new Date(Date.now() + 365 * 24 * 60 * 60 * 1000)

          const packSize = item.packSize || 1
          const hasDbUnits = item._dbQuantityUnits != null
          const paidStrips = hasDbUnits ? (item._dbQuantityUnits ?? item.quantity) : item.quantity
          const freeStrips = hasDbUnits
            ? (item._dbFreeQuantityUnits ?? (item.freeQuantity || 0))
            : (item.freeQuantity || 0)

          await addToInventory(tx, {
            medicineId: finalMedicineId,
            batchNumber: batchKey,
            supplierId: data.supplierId,
            paidStrips: item.isFreeGood ? 0 : paidStrips,
            freeStrips: item.isFreeGood ? paidStrips : freeStrips,
            packSize: hasDbUnits ? 1 : packSize,
            actualPackSize: packSize,
            purchasePricePerStrip: item.isFreeGood ? 0 : item.rate,
            sellingPricePerStrip: item.sellPrice || (item.isFreeGood ? 0 : item.rate * 1.2),
            expiryDate,
            invoiceNumber: data.invoiceNumber.trim(),
            invoiceDate: new Date(data.date),
            taxPercent: item.isFreeGood ? 0 : (item.taxPercent || 0),
          })
        } else if (item.generalItemId) {
          await tx.generalItem.update({
            where: { id: item.generalItemId },
            data: { stock: { increment: item.quantity } },
          })
        }
      }

      // 6. Recalculate Medicine.stock for all affected medicines
      // Stock is computed dynamically from InventoryBatches, so we don't store it on Medicine.

      // 7. Update invoice header
      const newAmountPaid = data.amountPaid ?? oldInvoice.amountPaid
      const balanceDue = grandTotal - newAmountPaid
      const newStatus =
        balanceDue <= 0.01 ? "PAID" : newAmountPaid > 0 ? "PARTIAL" : "UNPAID"

      await tx.purchaseInvoice.update({
        where: { id: invoiceId },
        data: {
          invoiceNumber: data.invoiceNumber.trim(),
          date: new Date(data.date),
          supplierId: data.supplierId,
          subTotal,
          discountAmount: discountTotal,
          taxTotal,
          roundOff: roundOffVal,
          grandTotal,
          amountPaid: newAmountPaid,
          status: newStatus,
        },
      })
    }, { timeout: 15000 })

    revalidatePath(REVALIDATION_PATH)
    revalidatePath("/dashboard/pharmacy/inventory")
    revalidatePath("/dashboard/finance/purchases")
    revalidatePath(`/dashboard/pharmacy/purchase-invoices/${invoiceId}`)

    writeAuditLog({ userId: authResult.session.userId, action: "UPDATE", module: "PurchaseInvoice", recordId: invoiceId, changes: {} })

    return { success: true, message: "Invoice updated successfully with stock adjustments" }
  } catch (error) {
    console.error("[updatePurchaseInvoiceFull] Error:", error)
    return { success: false, message: (error as Error).message || "Failed to update invoice" }
  }
}


/**
 * Delete a purchase invoice and all its items.
 * Also reverses the stock added to inventory.
 */
export async function deletePurchaseInvoice(invoiceId: string) {
  const authResult = await requireAuthSafe(["SUPER_ADMIN", "PHARMACIST"])
  if (!authResult.ok) return { success: false, message: authResult.error }

  try {
    await prisma.$transaction(async (tx) => {
      // 1. Fetch the invoice and its items
      const invoice = await tx.purchaseInvoice.findUnique({
        where: { id: invoiceId },
        include: { items: true },
      })
      
      if (!invoice) throw new Error("Purchase invoice not found")

      // 2. Check if this invoice was created from a challan
      const linkedChallan = await tx.challan.findFirst({
        where: { convertedToId: invoiceId },
        include: { items: true },
      })

      if (linkedChallan) {
        // ── Challan-originated invoice ──
        // Stock was added by the challan, NOT the invoice.
        // So do NOT reverse stock — only reset the batch purchase prices back to 0
        // and revert the challan to PENDING.
        for (const item of invoice.items) {
          if (!item.medicineId) continue
          const batchKey = item.batchNumber?.trim() || `CH-${linkedChallan.id.slice(-6)}`
          await tx.inventoryBatch.updateMany({
            where: { medicineId: item.medicineId, batchNumber: batchKey },
            data: { purchasePrice: 0, taxPercent: 0 },
          })
        }

        // Reset challan back to PENDING
        await tx.challan.update({
          where: { id: linkedChallan.id },
          data: { status: "PENDING", convertedToId: null },
        })
      } else {
        // ── Normal purchase invoice (not from challan) ──
        // PurchaseItem.quantity is already stored as total units (strips × packSize was applied at creation).
        // Do NOT multiply by packSize again — that would reverse 10× the actual stock.
        for (const item of invoice.items) {
          if (item.medicineId) {
            const batchKey = item.batchNumber?.trim() || `PURCH-${invoice.id.slice(-6)}`
            const totalUnits = item.quantity + (item.freeQuantity || 0)
            await reverseFromInventory(tx, {
              medicineId: item.medicineId,
              batchNumber: batchKey,
              totalUnits,
            })
          } else if (item.generalItemId) {
            await tx.generalItem.update({
              where: { id: item.generalItemId },
              data: { stock: { decrement: item.quantity } },
            })
          }
        }
      }

      // 3. Reverse any financial transactions linked to this invoice
      const linkedTransactions = await tx.transaction.findMany({
        where: { referenceId: invoiceId },
      })
      for (const txn of linkedTransactions) {
        // Restore the balance that was deducted
        await tx.financialAccount.update({
          where: { id: txn.accountId },
          data: { currentBalance: { increment: txn.amount } },
        })
      }
      // Delete linked transactions
      if (linkedTransactions.length > 0) {
        await tx.transaction.deleteMany({ where: { referenceId: invoiceId } })
      }

      // 4. Delete the invoice (items are cascaded)
      await tx.purchaseInvoice.delete({ where: { id: invoiceId } })
    })

    revalidatePath(REVALIDATION_PATH)
    revalidatePath("/dashboard/pharmacy/inventory")
    revalidatePath("/dashboard/pharmacy/challans")
    revalidatePath("/dashboard/finance")
    writeAuditLog({ userId: authResult.session.userId, action: "DELETE", module: "PurchaseInvoice", recordId: invoiceId, changes: {} })
    return { success: true, message: "Purchase invoice deleted and stock reversed successfully" }
  } catch (error) {
    console.error("[deletePurchaseInvoice] Error:", error)
    return { success: false, message: (error as Error).message || "Failed to delete purchase invoice" }
  }
}

/**
 * Merge multiple purchase invoices from the same supplier into one.
 * The first invoice becomes the merged one; others are deleted.
 */
export async function mergePurchaseInvoices(invoiceIds: string[]) {
  const authResult = await requireAuthSafe(["SUPER_ADMIN", "PHARMACIST"])
  if (!authResult.ok) return { success: false, message: authResult.error }

  if (invoiceIds.length < 2) return { success: false, message: "Select at least 2 invoices to merge" }

  try {
    const invoices = await prisma.purchaseInvoice.findMany({
      where: { id: { in: invoiceIds } },
      include: { items: true },
      orderBy: { date: "asc" },
    })

    if (invoices.length < 2) return { success: false, message: "Could not find the selected invoices" }

    // Check all invoices are from same supplier
    const supplierIds = new Set(invoices.map((inv) => inv.supplierId))
    if (supplierIds.size > 1) {
      return { success: false, message: "Can only merge invoices from the same supplier" }
    }

    await prisma.$transaction(async (tx) => {
      const primary = invoices[0]
      const others = invoices.slice(1)

      // Move all items from other invoices to the primary
      for (const inv of others) {
        await tx.purchaseItem.updateMany({
          where: { invoiceId: inv.id },
          data: { invoiceId: primary.id },
        })
      }

      // Recalculate totals
      const allItems = await tx.purchaseItem.findMany({ where: { invoiceId: primary.id } })
      const subTotal = allItems.reduce((sum, item) => sum + (item.quantity * item.rate), 0)
      const taxTotal = allItems.reduce((sum, item) => {
        const itemBase = item.quantity * item.rate
        return sum + (itemBase * item.taxPercent / 100)
      }, 0)
      const totalAmountPaid = invoices.reduce((sum, inv) => sum + inv.amountPaid, 0)
      const grandTotal = subTotal + taxTotal
      const mergeBalanceDue = grandTotal - totalAmountPaid
      const newStatus = mergeBalanceDue <= 0.01 ? "PAID" : totalAmountPaid > 0 ? "PARTIAL" : "UNPAID"

      // Update primary invoice
      await tx.purchaseInvoice.update({
        where: { id: primary.id },
        data: {
          invoiceNumber: `MERGED-${primary.invoiceNumber}`,
          subTotal,
          taxTotal,
          grandTotal,
          amountPaid: Math.min(totalAmountPaid, grandTotal),
          status: newStatus,
          discountAmount: 0,
          discountPercent: 0,
        },
      })

      // Delete other invoices (items already moved)
      for (const inv of others) {
        await tx.purchaseInvoice.delete({ where: { id: inv.id } })
      }
    }, { timeout: 15000 })

    revalidatePath(REVALIDATION_PATH)
    writeAuditLog({ userId: authResult.session.userId, action: "PROCESS", module: "InvoiceMerge", changes: { count: invoiceIds.length } })

    return { success: true, message: `${invoiceIds.length} invoices merged successfully` }
  } catch (error) {
    console.error("[mergePurchaseInvoices] Error:", error)
    return { success: false, message: "Failed to merge invoices" }
  }
}

/**
 * Create a purchase invoice with items from the Add Stock form.
 * This is separate from addStock (which only manages InventoryBatch)
 * to prevent stock doubling when invoices are later edited.
 */
export async function createPurchaseInvoiceFromStock(data: {
  invoiceNumber: string
  invoiceDate: string
  supplierId: string
  items: {
    medicineName: string
    medicineId: string
    batchNumber: string
    expiryDate: string
    hsnCode?: string
    quantity: number
    freeQuantity: number
    packSize: number
    purchasePricePerUnit: number
    sellingPricePerUnit: number
    taxPercent: number
    discountPercent: number
    isFreeGood?: boolean
  }[]
}) {
  const authResult = await requireAuthSafe(["SUPER_ADMIN", "PHARMACIST"])
  if (!authResult.ok) return { success: false, message: authResult.error }

  try {
    const supplier = await prisma.supplier.findUnique({ where: { id: data.supplierId }, select: { scope: true } })
    if (!supplier || !supplierAllowedFor(supplier.scope, "PHARMACY")) return { success: false, message: "Supplier is not available for pharmacy purchases" }
    const round2 = (n: number) => Number(n.toFixed(2))

    await prisma.$transaction(async (tx) => {
      let invoice = await tx.purchaseInvoice.findFirst({
        where: { invoiceNumber: data.invoiceNumber, supplierId: data.supplierId }
      })

      if (!invoice) {
        invoice = await tx.purchaseInvoice.create({
          data: {
            invoiceNumber: data.invoiceNumber,
            date: new Date(data.invoiceDate),
            supplierId: data.supplierId,
            status: "UNPAID"
          }
        })
      }

      for (const item of data.items) {
        let medicineId = item.medicineId || null
        if (!medicineId && item.medicineName?.trim()) {
          const med = await tx.medicine.findFirst({
            where: { name: { equals: item.medicineName.trim(), mode: "insensitive" } },
            select: { id: true }
          })
          if (med) medicineId = med.id
        }

        const itemSubTotal = item.isFreeGood ? 0 : round2(item.quantity * item.purchasePricePerUnit)
        const itemDiscountAmount = item.isFreeGood ? 0 : round2(itemSubTotal * (item.discountPercent / 100))
        const taxableAmount = item.isFreeGood ? 0 : round2(itemSubTotal - itemDiscountAmount)
        const taxAmount = item.isFreeGood ? 0 : round2((taxableAmount * item.taxPercent) / 100)
        const totalAmount = item.isFreeGood ? 0 : round2(taxableAmount + taxAmount)

        await tx.purchaseItem.create({
          data: {
            invoiceId: invoice.id,
            itemName: item.medicineName,
            medicineId,
            batchNumber: item.batchNumber,
            expiryDate: new Date(item.expiryDate),
            hsnCode: item.hsnCode || null,
            quantity: item.quantity,
            freeQuantity: item.freeQuantity,
            packSize: item.packSize,
            rate: item.isFreeGood ? 0 : item.purchasePricePerUnit,
            sellPrice: item.sellingPricePerUnit,
            taxPercent: item.isFreeGood ? 0 : item.taxPercent,
            discountPercent: item.isFreeGood ? 0 : item.discountPercent,
            totalAmount,
            isFreeGood: item.isFreeGood || false,
          }
        })

        if (!item.isFreeGood) {
          await tx.purchaseInvoice.update({
            where: { id: invoice.id },
            data: {
              subTotal: { increment: itemSubTotal },
              discountAmount: { increment: itemDiscountAmount },
              taxTotal: { increment: taxAmount },
              grandTotal: { increment: totalAmount }
            }
          })
        }
      }
    }, { timeout: 15000 })

    revalidatePath(REVALIDATION_PATH)
    revalidatePath("/dashboard/pharmacy/inventory")
    writeAuditLog({ userId: authResult.session.userId, action: "CREATE", module: "PurchaseInvoice", changes: { invoiceNumber: data.invoiceNumber } })
    return { success: true, message: "Purchase invoice created successfully" }
  } catch (error) {
    console.error("[createPurchaseInvoiceFromStock] Error:", error)
    return { success: false, message: (error as Error).message || "Failed to create purchase invoice" }
  }
}
