"use server"

import { prisma } from "@/lib/prisma"
import { requireAuth, requireAuthSafe } from "@/lib/auth-guard"
import { revalidatePath } from "next/cache"
import { writeAuditLog } from "@/lib/audit"
import { getErrorMessage } from "@/lib/action-result"
import { resolveAccountGroupCode } from "@/lib/account-group-resolver"
import { supplierAllowedFor, supplierScopeFilter, normalizeSupplierScope } from "@/lib/supplier-scope"
import { pharmacyPurchaseWhere } from "@/lib/finance-scope"

// ============================================
// TYPES
// ============================================

export interface SupplierProfileData {
  id: string
  name: string
  contactPerson: string | null
  phone: string | null
  email: string | null
  gstNumber: string | null
  address: string | null
  city: string | null
  state: string | null
  pincode: string | null
  isActive: boolean
  scope: string
  creditDays: number | null
  openingBalance: number
  createdAt: string
  // Aggregated totals
  totalPurchased: number
  totalPaid: number
  totalReturns: number
  balanceDue: number
  // Payment breakdown
  paymentBreakdown: {
    method: string
    total: number
    count: number
  }[]
  // Purchase invoices
  invoices: {
    id: string
    invoiceNumber: string
    date: string
    grandTotal: number
    amountPaid: number
    status: string
    itemCount: number
  }[]
  // Challans
  challans: {
    id: string
    challanNumber: string
    date: string
    status: string
    itemCount: number
  }[]
  // Purchase returns
  returns: {
    id: string
    returnNumber: string
    date: string
    totalAmount: number
    reason: string
  }[]
  // Payment history
  payments: {
    id: string
    date: string
    amount: number
    paymentMethod: string
    referenceNo: string | null
    notes: string | null
    invoiceNumber: string | null
    accountName: string | null
    createdBy: string
  }[]
}

// ============================================
// GET SUPPLIER PROFILE
// ============================================

export async function getSupplierProfile(supplierId: string): Promise<{ success: boolean; data?: SupplierProfileData; message?: string }> {
  await requireAuth()

  try {
    const supplier = await prisma.supplier.findUnique({
      where: { id: supplierId },
      include: {
        purchases: {
          where: pharmacyPurchaseWhere(),
          include: {
            _count: { select: { items: true } },
          },
          orderBy: { date: "desc" },
        },
        challans: {
          where: { items: { some: { medicineId: { not: null } } } },
          include: {
            _count: { select: { items: true } },
          },
          orderBy: { date: "desc" },
        },
        purchaseReturns: {
          orderBy: { date: "desc" },
        },
        supplierPayments: {
          where: {
            OR: [
              { invoice: pharmacyPurchaseWhere() },
              { invoiceId: null, account: { scope: "PHARMACY" } },
            ],
          },
          include: {
            invoice: { select: { invoiceNumber: true } },
            account: { select: { name: true } },
          },
          orderBy: { date: "desc" },
        },
      },
    })

    if (!supplier) {
      return { success: false, message: "Supplier not found" }
    }
    if (!supplierAllowedFor(supplier.scope, "PHARMACY")) {
      return { success: false, message: "Supplier is not available in pharmacy" }
    }

    // Aggregated totals
    const totalPurchased = supplier.purchases.reduce((sum, inv) => sum + inv.grandTotal, 0)
    const totalReturns = supplier.purchaseReturns.reduce((sum, ret) => sum + ret.totalAmount, 0)

    // PurchaseInvoice.amountPaid already includes payments linked to that invoice.
    // Only unlinked SupplierPayment records are additional payments.
    const invoiceAmountPaid = supplier.purchases.reduce((sum, inv) => sum + inv.amountPaid, 0)
    const subsequentPayments = supplier.supplierPayments
      .filter((p) => !p.invoiceId)
      .reduce((sum, p) => sum + p.amount, 0)
    const totalPaid = invoiceAmountPaid + subsequentPayments

    const balanceDue = (supplier.openingBalance + totalPurchased) - totalPaid - totalReturns

    // Payment breakdown from SupplierPayment records
    const breakdownMap = new Map<string, { total: number; count: number }>()
    for (const p of supplier.supplierPayments) {
      const existing = breakdownMap.get(p.paymentMethod) || { total: 0, count: 0 }
      existing.total += p.amount
      existing.count += 1
      breakdownMap.set(p.paymentMethod, existing)
    }
    const paymentBreakdown = Array.from(breakdownMap.entries())
      .map(([method, data]) => ({ method, ...data }))
      .sort((a, b) => b.total - a.total)

    const data: SupplierProfileData = {
      id: supplier.id,
      name: supplier.name,
      contactPerson: supplier.contactPerson,
      phone: supplier.phone,
      email: supplier.email,
      gstNumber: supplier.gstNumber,
      address: supplier.address,
      city: supplier.city,
      state: supplier.state,
      pincode: supplier.pincode,
      isActive: supplier.isActive,
      scope: normalizeSupplierScope(supplier.scope),
      creditDays: supplier.creditDays,
      openingBalance: supplier.openingBalance,
      createdAt: supplier.createdAt.toISOString(),
      totalPurchased,
      totalPaid,
      totalReturns,
      balanceDue,
      paymentBreakdown,
      invoices: supplier.purchases.map((inv) => ({
        id: inv.id,
        invoiceNumber: inv.invoiceNumber,
        date: inv.date.toISOString(),
        grandTotal: inv.grandTotal,
        amountPaid: inv.amountPaid,
        status: inv.status,
        itemCount: inv._count.items,
      })),
      challans: supplier.challans.map((ch) => ({
        id: ch.id,
        challanNumber: ch.challanNumber,
        date: ch.date.toISOString(),
        status: ch.status,
        itemCount: ch._count.items,
      })),
      returns: supplier.purchaseReturns.map((ret) => ({
        id: ret.id,
        returnNumber: ret.returnNumber,
        date: ret.date.toISOString(),
        totalAmount: ret.totalAmount,
        reason: ret.reason,
      })),
      payments: supplier.supplierPayments.map((p) => ({
        id: p.id,
        date: p.date.toISOString(),
        amount: p.amount,
        paymentMethod: p.paymentMethod,
        referenceNo: p.referenceNo,
        notes: p.notes,
        invoiceNumber: p.invoice?.invoiceNumber || null,
        accountName: p.account?.name || null,
        createdBy: p.createdBy,
      })),
    }

    return { success: true, data }
  } catch (error) {
    console.error("[getSupplierProfile] Error:", error)
    return { success: false, message: getErrorMessage(error) }
  }
}

// ============================================
// GET ALL SUPPLIERS WITH BALANCES
// ============================================

export interface SupplierListItem {
  id: string
  name: string
  phone: string | null
  gstNumber: string | null
  city: string | null
  isActive: boolean
  scope: string
  openingBalance: number
  totalPurchased: number
  totalPaid: number
  totalReturns: number
  balanceDue: number
  invoiceCount: number
  lastPurchaseDate: string | null
}

export async function getSuppliersWithBalances(): Promise<SupplierListItem[]> {
  await requireAuth()

  const suppliers = await prisma.supplier.findMany({
    where: supplierScopeFilter("PHARMACY"),
    include: {
      purchases: {
        where: pharmacyPurchaseWhere(),
        select: { grandTotal: true, amountPaid: true, date: true },
      },
      purchaseReturns: {
        select: { totalAmount: true },
      },
      supplierPayments: {
        where: {
          OR: [
            { invoice: pharmacyPurchaseWhere() },
            { invoiceId: null, account: { scope: "PHARMACY" } },
          ],
        },
        select: { amount: true, invoiceId: true },
      },
    },
    orderBy: { name: "asc" },
  })

  return suppliers.map((s) => {
    const totalPurchased = s.purchases.reduce((sum, inv) => sum + inv.grandTotal, 0)
    const totalReturns = s.purchaseReturns.reduce((sum, ret) => sum + ret.totalAmount, 0)
    const invoiceAmountPaid = s.purchases.reduce((sum, inv) => sum + inv.amountPaid, 0)
    const subsequentPayments = s.supplierPayments
      .filter((p) => !p.invoiceId)
      .reduce((sum, p) => sum + p.amount, 0)
    const totalPaid = invoiceAmountPaid + subsequentPayments
    const balanceDue = (s.openingBalance + totalPurchased) - totalPaid - totalReturns

    const dates = s.purchases.map((inv) => inv.date.getTime())
    const lastPurchaseDate = dates.length > 0 ? new Date(Math.max(...dates)).toISOString() : null

    return {
      id: s.id,
      name: s.name,
      phone: s.phone,
      gstNumber: s.gstNumber,
      city: s.city,
      isActive: s.isActive,
      scope: normalizeSupplierScope(s.scope),
      openingBalance: s.openingBalance,
      totalPurchased,
      totalPaid,
      totalReturns,
      balanceDue,
      invoiceCount: s.purchases.length,
      lastPurchaseDate,
    }
  })
}

// ============================================
// RECORD SUPPLIER PAYMENT
// ============================================

export async function recordSupplierPayment(data: {
  supplierId: string
  invoiceId?: string | null
  amount: number
  paymentMethod: string
  accountId: string
  referenceNo?: string
  notes?: string
  date?: string
  // Split payment support — if provided, amount/paymentMethod/accountId are ignored
  splits?: {
    amount: number
    paymentMethod: string
    accountId: string
    referenceNo?: string
  }[]
}): Promise<{ success: boolean; message: string }> {
  const authResult = await requireAuthSafe(["SUPER_ADMIN", "ACCOUNTANT", "PHARMACIST"])
  if (!authResult.ok) return { success: false, message: authResult.error }

  try {
    if (!data.supplierId) return { success: false, message: "Supplier is required" }

    // Build splits array — either from explicit splits or from single payment fields
    const splits = data.splits && data.splits.length > 0
      ? data.splits
      : [{
          amount: data.amount,
          paymentMethod: data.paymentMethod,
          accountId: data.accountId,
          referenceNo: data.referenceNo,
        }]

    // Validate splits
    const totalAmount = Math.round(splits.reduce((s, sp) => s + sp.amount, 0) * 100) / 100
    if (totalAmount <= 0) return { success: false, message: "Total amount must be greater than 0" }
    for (let i = 0; i < splits.length; i++) {
      const sp = splits[i]
      if (!sp.amount || sp.amount <= 0) return { success: false, message: `Split ${i + 1}: amount must be greater than 0` }
      if (!sp.paymentMethod) return { success: false, message: `Split ${i + 1}: payment method is required` }
      if (!sp.accountId) return { success: false, message: `Split ${i + 1}: account is required` }
    }

    await prisma.$transaction(async (tx) => {
      // Validate supplier
      const supplier = await tx.supplier.findUnique({ where: { id: data.supplierId }, select: { scope: true, name: true, openingBalance: true } })
      if (!supplier || !supplierAllowedFor(supplier.scope, "PHARMACY")) throw new Error("Supplier is not available for pharmacy payments")

      // Calculate total supplier balance due to prevent overpayment
      const invoicesAgg = await tx.purchaseInvoice.aggregate({
        where: { supplierId: data.supplierId, ...pharmacyPurchaseWhere() },
        _sum: { grandTotal: true, amountPaid: true },
      })
      const returnsAgg = await tx.purchaseReturn.aggregate({
        where: { supplierId: data.supplierId },
        _sum: { totalAmount: true },
      })
      const unlinkedPayments = await tx.supplierPayment.aggregate({
        where: { supplierId: data.supplierId, invoiceId: null, account: { scope: "PHARMACY" } },
        _sum: { amount: true },
      })
      const totalPurchased = invoicesAgg._sum.grandTotal || 0
      const invoiceAmountPaid = invoicesAgg._sum.amountPaid || 0
      const totalReturns = returnsAgg._sum.totalAmount || 0
      const unlinkedPaid = unlinkedPayments._sum.amount || 0
      const supplierBalanceDue = Math.round(((supplier.openingBalance || 0) + totalPurchased - invoiceAmountPaid - unlinkedPaid - totalReturns) * 100) / 100

      if (totalAmount > supplierBalanceDue + 0.01) {
        throw new Error(
          `Payment of \u20b9${totalAmount.toLocaleString("en-IN")} exceeds total supplier balance due of \u20b9${supplierBalanceDue.toLocaleString("en-IN")}`
        )
      }

      // If linked to an invoice, check per-invoice overpayment
      if (data.invoiceId) {
        const invoice = await tx.purchaseInvoice.findUnique({
          where: { id: data.invoiceId },
          select: {
            supplierId: true,
            grandTotal: true,
            amountPaid: true,
            invoiceNumber: true,
            items: { select: { medicineId: true } },
          },
        })
        if (!invoice) throw new Error("Invoice not found")
        if (invoice.supplierId !== data.supplierId) {
          throw new Error("Invoice does not belong to the selected supplier")
        }
        if (!invoice.items.some((item) => item.medicineId)) {
          throw new Error("Invoice is not a pharmacy purchase")
        }

        const returnSum = await tx.purchaseReturn.aggregate({
          where: { invoiceId: data.invoiceId },
          _sum: { totalAmount: true },
        })
        const invReturns = returnSum._sum.totalAmount || 0
        const invoiceDue = Math.round((invoice.grandTotal - invoice.amountPaid - invReturns) * 100) / 100

        if (totalAmount > invoiceDue + 0.01) {
          throw new Error(
            `Amount exceeds invoice due of \u20b9${invoiceDue.toLocaleString("en-IN")} ` +
            `(Invoice: ${invoice.invoiceNumber}, Grand Total: \u20b9${invoice.grandTotal.toLocaleString("en-IN")}, ` +
            `Paid: \u20b9${invoice.amountPaid.toLocaleString("en-IN")}, Returns: \u20b9${invReturns.toLocaleString("en-IN")})`
          )
        }
      }

      const paymentDate = data.date ? new Date(data.date) : new Date()

      // Process each split
      for (const split of splits) {
        const account = await tx.financialAccount.findUnique({
          where: { id: split.accountId },
          select: { scope: true, name: true, isActive: true },
        })
        if (!account) throw new Error("Financial account not found")
        if (!account.isActive) throw new Error(`Account "${account.name}" is inactive`)
        if (account.scope !== "PHARMACY") throw new Error(`Account "${account.name}" is not a pharmacy account`)

        // Create SupplierPayment record
        const payment = await tx.supplierPayment.create({
          data: {
            supplierId: data.supplierId,
            invoiceId: data.invoiceId || null,
            amount: split.amount,
            paymentMethod: split.paymentMethod,
            accountId: split.accountId,
            referenceNo: split.referenceNo?.trim() || null,
            notes: data.notes?.trim() || null,
            date: paymentDate,
            createdBy: authResult.session.userId,
          },
        })

        // Guarded balance decrement
        const r = await tx.financialAccount.updateMany({
          where: { id: split.accountId, currentBalance: { gte: split.amount } },
          data: { currentBalance: { decrement: split.amount } },
        })
        if (r.count !== 1) {
          throw new Error(`Insufficient balance in "${account.name}" for payment of \u20b9${split.amount.toFixed(2)}`)
        }

        // Create finance transaction
        const accountGroupCode = resolveAccountGroupCode("EXPENSE", "SUPPLIER_PAYMENT", null, "PHARMACY")
        await tx.transaction.create({
          data: {
            accountId: split.accountId,
            type: "EXPENSE",
            amount: split.amount,
            category: "SUPPLIER_PAYMENT",
            paymentMethod: split.paymentMethod,
            scope: account.scope,
            referenceId: payment.id,
            description: `Supplier payment${data.invoiceId ? " against invoice" : ""} \u2014 ${split.paymentMethod}`,
            accountGroupCode,
            billingType: "PHARMACY",
            date: paymentDate,
          },
        })
      }

      // Update invoice amountPaid and status if linked
      if (data.invoiceId) {
        const invoice = await tx.purchaseInvoice.findUnique({
          where: { id: data.invoiceId },
          select: { grandTotal: true, amountPaid: true },
        })
        if (invoice) {
          const returnSum = await tx.purchaseReturn.aggregate({
            where: { invoiceId: data.invoiceId },
            _sum: { totalAmount: true },
          })
          const invReturns = returnSum._sum.totalAmount || 0
          const newAmountPaid = invoice.amountPaid + totalAmount
          const effectiveDue = invoice.grandTotal - invReturns
          const balanceDue = effectiveDue - newAmountPaid
          const status = balanceDue <= 0.01 ? "PAID" : newAmountPaid > 0 ? "PARTIAL" : "UNPAID"
          await tx.purchaseInvoice.update({
            where: { id: data.invoiceId },
            data: { amountPaid: newAmountPaid, status },
          })
        }
      }
    })

    revalidatePath("/dashboard/pharmacy/suppliers")
    revalidatePath(`/dashboard/pharmacy/suppliers/${data.supplierId}`)
    revalidatePath("/dashboard/pharmacy/purchase-invoices")
    if (data.invoiceId) {
      revalidatePath(`/dashboard/pharmacy/purchase-invoices/${data.invoiceId}`)
    }
    revalidatePath("/dashboard/pharmacy-finance")
    revalidatePath("/dashboard/pharmacy-finance/payables")
    revalidatePath(`/dashboard/pharmacy-finance/payables/${data.supplierId}`)
    revalidatePath("/dashboard/finance")

    writeAuditLog({
      userId: authResult.session.userId,
      action: "CREATE",
      module: "SupplierPayment",
      changes: { supplierId: data.supplierId, amount: totalAmount, splits: splits.length },
    })

    return { success: true, message: `Payment of \u20b9${totalAmount.toLocaleString("en-IN")} recorded successfully` }
  } catch (error) {
    console.error("[recordSupplierPayment] Error:", error)
    return { success: false, message: getErrorMessage(error) }
  }
}

// ============================================
// UPDATE PHARMACY SETTINGS
// ============================================

export async function updatePharmacySettings(data: {
  pharmacyName: string
  pharmacyGstNo?: string
  pharmacyDrugLicense?: string
  pharmacyAddress?: string
  pharmacyPhone?: string
}): Promise<{ success: boolean; message: string }> {
  const authResult = await requireAuthSafe(["SUPER_ADMIN", "PHARMACIST"])
  if (!authResult.ok) return { success: false, message: authResult.error }

  try {
    if (!data.pharmacyName?.trim()) {
      return { success: false, message: "Pharmacy name is required" }
    }

    await prisma.hospitalSettings.upsert({
      where: { id: 1 },
      create: {
        id: 1,
        pharmacyName: data.pharmacyName.trim(),
        pharmacyGstNo: data.pharmacyGstNo?.trim() || null,
        pharmacyDrugLicense: data.pharmacyDrugLicense?.trim() || null,
        pharmacyAddress: data.pharmacyAddress?.trim() || null,
        pharmacyPhone: data.pharmacyPhone?.trim() || null,
      },
      update: {
        pharmacyName: data.pharmacyName.trim(),
        pharmacyGstNo: data.pharmacyGstNo?.trim() || null,
        pharmacyDrugLicense: data.pharmacyDrugLicense?.trim() || null,
        pharmacyAddress: data.pharmacyAddress?.trim() || null,
        pharmacyPhone: data.pharmacyPhone?.trim() || null,
      },
    })

    revalidatePath("/dashboard/pharmacy/settings")
    revalidatePath("/dashboard/pharmacy")

    writeAuditLog({
      userId: authResult.session.userId,
      action: "UPDATE",
      module: "PharmacySettings",
      changes: { pharmacyName: data.pharmacyName, pharmacyGstNo: data.pharmacyGstNo },
    })

    return { success: true, message: "Pharmacy settings saved successfully" }
  } catch (error) {
    console.error("[updatePharmacySettings] Error:", error)
    return { success: false, message: getErrorMessage(error) }
  }
}

// ============================================
// GET PHARMACY ACCOUNTS (for payment dropdown)
// ============================================

export async function getPharmacyAccounts() {
  await requireAuth()
  return prisma.financialAccount.findMany({
    where: { isActive: true, scope: "PHARMACY" },
    select: { id: true, name: true, type: true, currentBalance: true, scope: true },
    orderBy: { name: "asc" },
  })
}

// ============================================
// GET SUPPLIER OPEN INVOICES (for per-invoice pay)
// ============================================

export async function getSupplierOpenInvoices(supplierId: string): Promise<{
  success: boolean
  data: {
    id: string
    invoiceNumber: string
    date: string
    grandTotal: number
    amountPaid: number
    returns: number
    balanceDue: number
    status: string
  }[]
}> {
  const auth = await requireAuthSafe(["SUPER_ADMIN", "ACCOUNTANT", "PHARMACIST"])
  if (!auth.ok) return { success: false, data: [] }

  try {
    const invoices = await prisma.purchaseInvoice.findMany({
      where: {
        supplierId,
        status: { not: "PAID" },
        ...pharmacyPurchaseWhere(),
      },
      select: {
        id: true,
        invoiceNumber: true,
        date: true,
        grandTotal: true,
        amountPaid: true,
        status: true,
      },
      orderBy: { date: "desc" },
    })

    const invIds = invoices.map((i) => i.id)
    const returns = await prisma.purchaseReturn.groupBy({
      by: ["invoiceId"],
      where: { invoiceId: { in: invIds } },
      _sum: { totalAmount: true },
    })

    const returnMap = new Map<string, number>()
    returns.forEach((r) => {
      if (r.invoiceId) returnMap.set(r.invoiceId, r._sum.totalAmount || 0)
    })

    const data = invoices
      .map((inv) => {
        const retTotal = returnMap.get(inv.id) || 0
        const balanceDue = Math.max(0, Math.round((inv.grandTotal - inv.amountPaid - retTotal) * 100) / 100)
        return {
          id: inv.id,
          invoiceNumber: inv.invoiceNumber,
          date: inv.date.toISOString(),
          grandTotal: inv.grandTotal,
          amountPaid: inv.amountPaid,
          returns: retTotal,
          balanceDue,
          status: inv.status,
        }
      })
      .filter((i) => i.balanceDue > 0.01)

    return { success: true, data }
  } catch (error) {
    console.error("[getSupplierOpenInvoices] Error:", error)
    return { success: false, data: [] }
  }
}

