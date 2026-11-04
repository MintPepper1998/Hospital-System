"use server"

import { prisma } from "@/lib/prisma"
import { revalidatePath } from "next/cache"
import { requireAuth, requireAuthSafe } from "@/lib/auth-guard"
import { writeAuditLog } from "@/lib/audit"
import { type PaginationParams, type PaginatedResult, getPaginationValues, paginatedResult } from "@/lib/pagination"
import { actionError, getErrorMessage } from "@/lib/action-result"
import { addToInventory, reverseFromInventory } from "@/lib/inventory-service"
import { resolveAccountGroupCode } from "@/lib/account-group-resolver"
import { supplierAllowedFor, normalizeSupplierScope, supplierScopeFilter } from "@/lib/supplier-scope"

// ============================================
// TYPES
// ============================================

export interface SupplierData {
  id: string
  name: string
  contactPerson: string | null
  phone: string | null
  email: string | null
  gstNumber: string | null
  address: string | null
  city: string | null
  state: string | null
  isActive: boolean
  openingBalance: number
  purchaseCount: number
  scope: string
}

export interface PurchaseInvoiceData {
  id: string
  invoiceNumber: string
  date: string
  supplierName: string
  subTotal: number
  taxTotal: number
  grandTotal: number
  amountPaid: number
  status: string
  itemCount: number
}

export interface PurchaseItemInput {
  itemName: string
  medicineId?: string | null
  generalItemId?: string | null
  batchNumber?: string
  expiryDate?: string // ISO string
  quantity: number    // Number of strips/packs (paid)
  freeQuantity?: number // Number of free/bonus strips/packs
  packSize?: number   // Units per strip/pack (e.g., 10 tablets per strip)
  hsnCode?: string
  rate: number        // Price per strip (will be divided by packSize for per-unit storage)
  sellPrice?: number | null // MRP per strip (will be divided by packSize for per-unit storage)
  taxPercent?: number
  totalAmount: number
  isFreeGood?: boolean
}

// ============================================
// GET SUPPLIERS
// ============================================

export async function getSuppliers(): Promise<SupplierData[]> {
  await requireAuth()

  const suppliers = await prisma.supplier.findMany({
    include: {
      _count: { select: { purchases: true } },
    },
    orderBy: { name: "asc" },
  })

  return suppliers.map((s) => ({
    id: s.id,
    name: s.name,
    contactPerson: s.contactPerson,
    phone: s.phone,
    email: s.email,
    gstNumber: s.gstNumber,
    address: s.address,
    city: s.city,
    state: s.state,
    isActive: s.isActive,
    openingBalance: s.openingBalance,
    purchaseCount: s._count.purchases,
    scope: normalizeSupplierScope(s.scope),
  }))
}

// ============================================
// ADD SUPPLIER
// ============================================

export async function addSupplier(data: {
  name: string
  contactPerson?: string
  phone?: string
  email?: string
  gstNumber?: string
  address?: string
  city?: string
  state?: string
  openingBalance?: number
  scope?: string
}): Promise<{ success: boolean; message: string; id?: string }> {
  const authResult = await requireAuthSafe(["SUPER_ADMIN", "ACCOUNTANT", "PHARMACIST"])
  if (!authResult.ok) return { success: false, message: authResult.error }

  try {
    if (!data.name?.trim()) {
      return { success: false, message: "Supplier name is required" }
    }

    const existing = await prisma.supplier.findUnique({ where: { name: data.name.trim() } })
    if (existing) {
      return { success: false, message: "A supplier with this name already exists" }
    }

    const supplier = await prisma.supplier.create({
      data: {
        name: data.name.trim(),
        contactPerson: data.contactPerson?.trim() || null,
        phone: data.phone?.trim() || null,
        email: data.email?.trim() || null,
        gstNumber: data.gstNumber?.trim() || null,
        address: data.address?.trim() || null,
        city: data.city?.trim() || null,
        state: data.state?.trim() || null,
        openingBalance: data.openingBalance || 0,
         scope: "HOSPITAL",
      },
    })

    revalidatePath("/dashboard/finance/purchases")
    return { success: true, message: "Supplier added successfully", id: supplier.id }
  } catch (error) {
    console.error("[ERROR] addSupplier:", error)
    return actionError(getErrorMessage(error))
  }
}

// ============================================
// CREATE PURCHASE INVOICE (3-Way Engine)
// ============================================

export async function createPurchaseInvoice(data: {
  invoiceNumber: string
  date: string
  supplierId: string
  items: PurchaseItemInput[]
  amountPaid: number
  accountId?: string // Required if amountPaid > 0
  paymentMethod?: string
}): Promise<{ success: boolean; message: string; id?: string }> {
  const authResult = await requireAuthSafe(["SUPER_ADMIN", "ACCOUNTANT", "PHARMACIST"])
  if (!authResult.ok) return { success: false, message: authResult.error }

  try {
    // ── Validate ──────────────────────────────
    if (!data.invoiceNumber?.trim()) return { success: false, message: "Invoice number is required" }
    if (!data.supplierId) return { success: false, message: "Select a supplier" }
    if (!data.items || data.items.length === 0) return { success: false, message: "Add at least one item" }
    if (data.amountPaid > 0 && !data.accountId) {
      return { success: false, message: "Select a payment account when paying" }
    }

    const supplier = await prisma.supplier.findUnique({ where: { id: data.supplierId }, select: { scope: true } })
    if (!supplier) return { success: false, message: "Supplier not found" }
    const requestedScope = data.items.some((item) => item.medicineId) ? "PHARMACY" : "HOSPITAL"
    if (!supplierAllowedFor(supplier.scope, requestedScope)) return { success: false, message: `Supplier is not available for ${requestedScope.toLowerCase()} purchases` }

    // Round to 2 decimal places to avoid floating-point drift
    const round2 = (n: number) => Number(n.toFixed(2))

    // ── Calculate totals ──────────────────────
    let subTotal = 0
    let taxTotal = 0
    for (const item of data.items) {
      if (item.isFreeGood) continue // Free goods don't count toward invoice totals
      const lineBase = round2(item.quantity * item.rate)
      const lineTax = round2(lineBase * ((item.taxPercent || 0) / 100))
      subTotal += lineBase
      taxTotal += lineTax
    }
    subTotal = round2(subTotal)
    taxTotal = round2(taxTotal)
    const grandTotal = round2(subTotal + taxTotal)

    const createBalanceDue = grandTotal - data.amountPaid
    const status =
      createBalanceDue <= 0.01 ? "PAID" : data.amountPaid > 0 ? "PARTIAL" : "UNPAID"

    // ── Prisma $transaction (3-way) ───────────
    const result = await prisma.$transaction(async (tx) => {
      // A. Create PurchaseInvoice + nested PurchaseItems
      const invoice = await tx.purchaseInvoice.create({
        data: {
          invoiceNumber: data.invoiceNumber.trim(),
          date: new Date(data.date),
          supplierId: data.supplierId,
          subTotal,
          taxTotal,
          grandTotal,
          amountPaid: data.amountPaid,
          status,
          items: {
            create: data.items.map((item) => {
              const packSize = item.packSize || 1
              const totalUnits = item.quantity * packSize
              const freeUnits = (item.freeQuantity || 0) * packSize
              const perUnitRate = round2(item.rate / packSize)
              const perUnitSellPrice = item.sellPrice ? round2(item.sellPrice / packSize) : null
              const lineBase = round2(item.quantity * item.rate)
              const lineTax = round2(lineBase * ((item.taxPercent || 0) / 100))
              return {
                itemName: item.itemName.trim(),
                medicineId: item.medicineId || null,
                generalItemId: item.generalItemId || null,
                batchNumber: item.batchNumber?.trim() || null,
                expiryDate: item.expiryDate ? new Date(item.expiryDate) : null,
                hsnCode: item.hsnCode?.trim() || null,
                quantity: totalUnits,
                freeQuantity: freeUnits,
                packSize: packSize,
                rate: item.isFreeGood ? 0 : perUnitRate,
                sellPrice: perUnitSellPrice,
                taxPercent: item.isFreeGood ? 0 : (item.taxPercent || 0),
                totalAmount: item.isFreeGood ? 0 : round2(lineBase + lineTax),
                isFreeGood: item.isFreeGood || false,
              }
            }),
          },
        },
      })

      // B. Ledger update: record the expense if paid
      // Determine if this is a pharmacy purchase (has any medicine items) or general
      const hasPharmacyItems = data.items.some(i => i.medicineId)
      const purchaseScope = hasPharmacyItems ? "PHARMACY" : "HOSPITAL"
      if (data.amountPaid > 0 && data.accountId) {
        const account = await tx.financialAccount.findUnique({
          where: { id: data.accountId },
          select: { name: true, scope: true, isActive: true },
        })
        if (!account) throw new Error("Payment account not found")
        if (!account.isActive) throw new Error(`Account "${account.name}" is inactive`)
        if (account.scope !== purchaseScope) {
          throw new Error(`Account "${account.name}" is not a ${purchaseScope.toLowerCase()} account`)
        }

        const accountGroupCode = resolveAccountGroupCode("EXPENSE", "PURCHASE", purchaseScope, purchaseScope)
        await tx.transaction.create({
          data: {
            accountId: data.accountId,
            type: "EXPENSE",
            amount: data.amountPaid,
            category: "PURCHASE",
            paymentMethod: data.paymentMethod || "CASH",
            scope: purchaseScope,
            referenceId: invoice.id,
            description: `Purchase Bill #${data.invoiceNumber} from supplier`,
            accountGroupCode,
            billingType: purchaseScope,
          },
        })
        await tx.financialAccount.update({
          where: { id: data.accountId },
          data: { currentBalance: { decrement: data.amountPaid } },
        })
      }

      // C. Inventory update: route stock based on item type
      for (const item of data.items) {
        const packSize = item.packSize || 1

        if (item.medicineId) {
          // ── Pharmacy inventory via centralized service ──
          const batchKey = item.batchNumber?.trim() || `PURCH-${invoice.id.slice(-6)}`
          const expiryDate = item.expiryDate
            ? new Date(item.expiryDate)
            : new Date(Date.now() + 365 * 24 * 60 * 60 * 1000)

          await addToInventory(tx, {
            medicineId: item.medicineId,
            batchNumber: batchKey,
            supplierId: data.supplierId,
            paidStrips: item.isFreeGood ? 0 : item.quantity,
            freeStrips: item.isFreeGood ? item.quantity : (item.freeQuantity || 0),
            packSize,
            purchasePricePerStrip: item.isFreeGood ? 0 : item.rate,
            sellingPricePerStrip: item.sellPrice || (item.isFreeGood ? 0 : item.rate * 1.2),
            expiryDate,
            invoiceNumber: data.invoiceNumber.trim(),
            invoiceDate: new Date(data.date),
          })
        } else if (item.generalItemId) {
          // ── General inventory (GeneralItem) ──
          await tx.generalItem.update({
            where: { id: item.generalItemId },
            data: { stock: { increment: item.quantity } },
          })
        }
      }

      return invoice
    })

    revalidatePath("/dashboard/finance/purchases")
    revalidatePath("/dashboard/pharmacy/inventory")
    revalidatePath("/dashboard/inventory/general")
    revalidatePath("/dashboard/finance")

    writeAuditLog({ userId: authResult.session.userId, action: "CREATE", module: "PurchaseInvoice", recordId: result.id, changes: { invoiceNumber: data.invoiceNumber, grandTotal, supplierId: data.supplierId } })

    return { success: true, message: `Purchase Bill #${data.invoiceNumber} saved successfully`, id: result.id }
  } catch (error) {
    console.error("[ERROR] createPurchaseInvoice:", error)
    return actionError(getErrorMessage(error))
  }
}

// ============================================
// GET PURCHASE INVOICES
// ============================================

export async function getPurchaseInvoices(params?: PaginationParams): Promise<PaginatedResult<PurchaseInvoiceData>> {
  await requireAuth()

  const { page, limit, skip } = getPaginationValues(params)

  const [invoices, total] = await Promise.all([
    prisma.purchaseInvoice.findMany({
      include: {
        supplier: { select: { name: true } },
        _count: { select: { items: true } },
      },
      orderBy: { date: "desc" },
      skip,
      take: limit,
    }),
    prisma.purchaseInvoice.count(),
  ])

  const data = invoices.map((inv) => ({
    id: inv.id,
    invoiceNumber: inv.invoiceNumber,
    date: inv.date.toISOString(),
    supplierName: inv.supplier.name,
    subTotal: inv.subTotal,
    taxTotal: inv.taxTotal,
    grandTotal: inv.grandTotal,
    amountPaid: inv.amountPaid,
    status: inv.status,
    itemCount: inv._count.items,
  }))

  return paginatedResult(data, total, page, limit)
}

// ============================================
// PURCHASE RETURNS
// ============================================

export interface PurchaseReturnItemInput {
  medicineId: string
  batchNumber: string
  quantity: number
  rate: number
}

export interface PurchaseReturnInput {
  supplierId: string
  invoiceId?: string | null
  reason: string
  items: PurchaseReturnItemInput[]
}

export async function createPurchaseReturn(data: PurchaseReturnInput) {
  try {
    const authResult = await requireAuthSafe()
    if (!authResult.ok) return actionError("Unauthorized")

    if (!data.supplierId) return actionError("Supplier is required")
    if (!data.reason) return actionError("Reason is required")
    if (!data.items || data.items.length === 0) return actionError("At least one item is required")

    const supplier = await prisma.supplier.findUnique({ where: { id: data.supplierId }, select: { scope: true } })
    if (!supplier || !supplierAllowedFor(supplier.scope, "PHARMACY")) return actionError("Supplier is not available for pharmacy returns")

    // Calculate total amount
    let totalAmount = 0
    for (const item of data.items) {
      totalAmount += item.quantity * item.rate
    }

    // Generate return number (timestamp-based to avoid race conditions)
    const now = new Date()
    const ts = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}${String(now.getHours()).padStart(2, '0')}${String(now.getMinutes()).padStart(2, '0')}${String(now.getSeconds()).padStart(2, '0')}`
    const rand = Math.random().toString(36).slice(2, 5).toUpperCase()
    const returnNumber = `PR-${ts}-${rand}`

    const result = await prisma.$transaction(async (tx) => {
      if (data.invoiceId) {
        const invoice = await tx.purchaseInvoice.findUnique({
          where: { id: data.invoiceId },
          select: { supplierId: true },
        })
        if (!invoice) throw new Error("Invoice not found")
        if (invoice.supplierId !== data.supplierId) {
          throw new Error("Return invoice does not belong to the selected supplier")
        }
      }

      // 1. Create PurchaseReturn
      const purchaseReturn = await tx.purchaseReturn.create({
        data: {
          returnNumber,
          supplierId: data.supplierId,
          invoiceId: data.invoiceId,
          reason: data.reason,
          totalAmount,
          items: {
            create: data.items.map(item => ({
              medicineId: item.medicineId,
              batchNumber: item.batchNumber,
              quantity: item.quantity,
              rate: item.rate,
              totalAmount: item.quantity * item.rate
            }))
          }
        }
      })

      // 2. Adjust InventoryBatch quantities via centralized service
      for (const item of data.items) {
        await reverseFromInventory(tx, {
          medicineId: item.medicineId,
          batchNumber: item.batchNumber,
          totalUnits: item.quantity,
        })
      }

      // 3. Purchase returns are NON-CASH: they reduce the supplier payable,
      //    not increase cash. The Payables page subtracts PurchaseReturn.totalAmount
      //    from what is owed. If the supplier refunds cash, record a SUPPLIER_REFUND instead.

      return purchaseReturn
    })

    revalidatePath("/dashboard/pharmacy/inventory")
    revalidatePath("/dashboard/pharmacy/purchase-returns")

    writeAuditLog({ userId: authResult.session.userId, action: "CREATE", module: "PurchaseReturn", recordId: result.id, changes: { returnNumber, totalAmount, supplierId: data.supplierId } })

    return { success: true, message: `Purchase Return #${returnNumber} processed successfully`, id: result.id }
  } catch (error) {
    console.error("[ERROR] createPurchaseReturn:", error)
    return actionError(getErrorMessage(error))
  }
}

export async function getPurchaseReturns(params?: PaginationParams) {
  try {
    await requireAuth()

    const { page, limit, skip } = getPaginationValues(params)

    const [returns, total] = await Promise.all([
      prisma.purchaseReturn.findMany({
        where: { supplier: supplierScopeFilter("PHARMACY") },
        include: {
          supplier: { select: { name: true } },
          items: {
            include: { medicine: { select: { name: true } } }
          }
        },
        orderBy: { date: "desc" },
        skip,
        take: limit,
      }),
      prisma.purchaseReturn.count({ where: { supplier: supplierScopeFilter("PHARMACY") } }),
    ])

    return { success: true as const, data: returns, total, page, limit, totalPages: Math.ceil(total / limit) }
  } catch (error) {
    console.error("[ERROR] getPurchaseReturns:", error)
    return { success: false as const, data: null, message: getErrorMessage(error) }
  }
}
