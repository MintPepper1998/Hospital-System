"use server"

import { prisma } from "@/lib/prisma"
import type { Prisma } from "@prisma/client"
import { hospitalPurchaseWhere } from "@/lib/finance-scope"
import { supplierScopeFilter, supplierAllowedFor, normalizeSupplierScope } from "@/lib/supplier-scope"
import { requireAuth, requireAuthSafe } from "@/lib/auth-guard"
import { writeAuditLog } from "@/lib/audit"
import { revalidatePath } from "next/cache"
import { resolveAccountGroupCode } from "@/lib/account-group-resolver"

// ═══════════════════════════════════════════════════════════════════
// 5B. PURCHASE INVOICES — Read views
// ═══════════════════════════════════════════════════════════════════

export async function getPurchaseInvoices(params: {
  from?: string; to?: string; supplierId?: string; status?: string; search?: string
  page?: number; limit?: number
}) {
  const page = params.page || 1
  const limit = params.limit || 25
  const skip = (page - 1) * limit
  const where: Prisma.PurchaseInvoiceWhereInput = hospitalPurchaseWhere()

  if (params.from) {
    const date = where.date as Prisma.DateTimeFilter | undefined
    where.date = { ...date, gte: new Date(params.from) }
  }
  if (params.to) {
    const toDate = new Date(params.to); toDate.setHours(23, 59, 59, 999)
    const date = where.date as Prisma.DateTimeFilter | undefined
    where.date = { ...date, lte: toDate }
  }
  if (params.supplierId) where.supplierId = params.supplierId
  if (params.status) where.status = params.status
  if (params.search) {
    where.OR = [
      { invoiceNumber: { contains: params.search, mode: "insensitive" } },
      { supplier: { name: { contains: params.search, mode: "insensitive" } } },
    ]
  }

  const [invoices, total] = await Promise.all([
    prisma.purchaseInvoice.findMany({
      where,
      include: {
        supplier: { select: { id: true, name: true, gstNumber: true } },
        _count: { select: { items: true, supplierPayments: true } },
      },
      orderBy: { date: "desc" },
      skip, take: limit,
    }),
    prisma.purchaseInvoice.count({ where }),
  ])

  return { invoices, total, page, totalPages: Math.ceil(total / limit) }
}

export async function getPurchaseInvoiceSummary() {
  const now = new Date()
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)

  const [totalUnpaid, monthPurchases, totalPayable] = await Promise.all([
    prisma.purchaseInvoice.aggregate({
      where: hospitalPurchaseWhere({ status: { in: ["UNPAID", "PARTIAL"] } }),
      _sum: { grandTotal: true, amountPaid: true },
      _count: true,
    }),
    prisma.purchaseInvoice.aggregate({
      where: hospitalPurchaseWhere({ date: { gte: startOfMonth } }),
      _sum: { grandTotal: true },
      _count: true,
    }),
    prisma.purchaseInvoice.aggregate({
      where: hospitalPurchaseWhere({ status: { in: ["UNPAID", "PARTIAL"] } }),
      _sum: { grandTotal: true, amountPaid: true },
    }),
  ])

  const outstanding = (totalPayable._sum.grandTotal || 0) - (totalPayable._sum.amountPaid || 0)

  return {
    unpaidCount: totalUnpaid._count,
    unpaidAmount: (totalUnpaid._sum.grandTotal || 0) - (totalUnpaid._sum.amountPaid || 0),
    monthCount: monthPurchases._count,
    monthAmount: monthPurchases._sum.grandTotal || 0,
    totalOutstanding: outstanding,
  }
}

export async function getHospitalPurchaseInvoiceDetails(invoiceId: string) {
  return prisma.purchaseInvoice.findUnique({
    where: { id: invoiceId },
    include: {
      supplier: true,
      items: true,
      supplierPayments: {
        include: { account: { select: { name: true, type: true } } },
        orderBy: { date: "desc" },
      },
      purchaseReturns: {
        include: { items: true },
        orderBy: { date: "desc" },
      },
    },
  })
}

// ═══════════════════════════════════════════════════════════════════
// 5C. PURCHASE INVOICE CREATION
// ═══════════════════════════════════════════════════════════════════

export async function createHospitalPurchaseInvoice(data: {
  supplierId: string
  invoiceNumber: string
  date: string
  items: Array<{
    itemName: string
    hsnCode?: string
    quantity: number
    rate: number
    taxPercent?: number
    totalAmount: number
  }>
  subTotal: number
  taxTotal: number
  discountAmount?: number
  grandTotal: number
  amountPaid?: number
  accountId?: string
  paymentMethod?: string
  referenceNo?: string
  notes?: string
}) {
  const auth = await requireAuthSafe(["SUPER_ADMIN", "ACCOUNTANT", "ADMIN"])
  if (!auth.ok) return { success: false, message: auth.error }

  const trimmedInvoiceNo = data.invoiceNumber?.trim()
  if (!trimmedInvoiceNo) return { success: false, message: "Invoice number is required" }
  if (!data.supplierId) return { success: false, message: "Supplier is required" }
  if (!data.items || data.items.length === 0) return { success: false, message: "At least one item is required" }

  const supplier = await prisma.supplier.findUnique({
    where: { id: data.supplierId },
    select: { id: true, name: true, scope: true },
  })
  if (!supplier || !supplierAllowedFor(supplier.scope, "HOSPITAL")) {
    return { success: false, message: "Supplier is not valid for hospital purchases" }
  }

  const existingInv = await prisma.purchaseInvoice.findFirst({
    where: { invoiceNumber: trimmedInvoiceNo, supplierId: data.supplierId },
  })
  if (existingInv) {
    return { success: false, message: `Invoice #${trimmedInvoiceNo} already exists for this supplier` }
  }

  const amountPaid = Math.max(0, Number(data.amountPaid) || 0)
  const grandTotal = Math.round(Number(data.grandTotal) * 100) / 100
  const subTotal = Math.round(Number(data.subTotal) * 100) / 100
  const taxTotal = Math.round(Number(data.taxTotal) * 100) / 100
  const discountAmount = Math.round((Number(data.discountAmount) || 0) * 100) / 100

  if (amountPaid > 0 && !data.accountId) {
    return { success: false, message: "Please select an account for the payment" }
  }

  const invoiceDate = data.date ? new Date(data.date) : new Date()
  const status = amountPaid >= grandTotal - 0.01 ? "PAID" : amountPaid > 0 ? "PARTIAL" : "UNPAID"

  try {
    const result = await prisma.$transaction(async (tx) => {
      let account = null
      if (amountPaid > 0 && data.accountId) {
        account = await tx.financialAccount.findUnique({
          where: { id: data.accountId },
          select: { id: true, name: true, scope: true, isActive: true, currentBalance: true },
        })
        if (!account || !account.isActive) throw new Error("Selected payment account is inactive or not found")
        if (account.scope !== "HOSPITAL") throw new Error("Account must belong to hospital finance")
        if (account.currentBalance < amountPaid) {
          throw new Error(
            `Insufficient balance in ${account.name} (Current: ₹${account.currentBalance.toLocaleString("en-IN")}, Required: ₹${amountPaid.toLocaleString("en-IN")})`
          )
        }
      }

      const invoice = await tx.purchaseInvoice.create({
        data: {
          invoiceNumber: trimmedInvoiceNo,
          date: invoiceDate,
          supplierId: data.supplierId,
          subTotal,
          taxTotal,
          discountAmount,
          grandTotal,
          amountPaid,
          status,
          items: {
            create: data.items.map((item) => ({
              itemName: item.itemName.trim(),
              medicineId: null,
              generalItemId: null,
              hsnCode: item.hsnCode?.trim() || null,
              quantity: Number(item.quantity),
              freeQuantity: 0,
              packSize: 1,
              rate: Number(item.rate),
              taxPercent: Number(item.taxPercent) || 0,
              totalAmount: Number(item.totalAmount),
            })),
          },
        },
      })

      if (amountPaid > 0 && data.accountId && account) {
        await tx.supplierPayment.create({
          data: {
            supplierId: data.supplierId,
            invoiceId: invoice.id,
            amount: amountPaid,
            paymentMethod: data.paymentMethod || "CASH",
            accountId: data.accountId,
            referenceNo: data.referenceNo?.trim() || null,
            notes: data.notes?.trim() || `Payment for Invoice #${trimmedInvoiceNo}`,
            date: invoiceDate,
            createdBy: auth.session.userId,
          },
        })

        await tx.financialAccount.update({
          where: { id: data.accountId },
          data: { currentBalance: { decrement: amountPaid } },
        })

        const accountGroupCode = resolveAccountGroupCode("EXPENSE", "PURCHASE", null, "HOSPITAL") || "5120"
        await tx.transaction.create({
          data: {
            accountId: data.accountId,
            type: "EXPENSE",
            amount: amountPaid,
            category: "Hospital Purchases",
            paymentMethod: data.paymentMethod || "CASH",
            scope: "HOSPITAL",
            referenceId: invoice.id,
            description: `Hospital Purchase: Inv #${trimmedInvoiceNo} (${supplier.name})`,
            accountGroupCode,
            date: invoiceDate,
          },
        })
      }

      return invoice
    })

    writeAuditLog({
      userId: auth.session.userId,
      action: "CREATE",
      module: "PurchaseInvoice",
      recordId: result.id,
      changes: { invoiceNumber: trimmedInvoiceNo, grandTotal, amountPaid, supplierId: data.supplierId },
    })

    revalidatePath("/dashboard/master-finance/payables/invoices")
    revalidatePath("/dashboard/master-finance/payables/suppliers")
    revalidatePath("/dashboard/master-finance/payables/payments")
    revalidatePath("/dashboard/master-finance/payables/aging")

    return { success: true, message: `Invoice #${trimmedInvoiceNo} created successfully`, id: result.id }
  } catch (error: any) {
    console.error("[ERROR] createHospitalPurchaseInvoice:", error)
    return { success: false, message: error.message || "Failed to create purchase invoice" }
  }
}

// ═══════════════════════════════════════════════════════════════════
// 5D. PURCHASE RETURNS
// ═══════════════════════════════════════════════════════════════════

export async function getPurchaseReturns(params: { from?: string; to?: string; supplierId?: string; limit?: number }) {
  const where: Prisma.PurchaseReturnWhereInput = {
    supplier: supplierScopeFilter("HOSPITAL"),
    OR: [
      { invoice: hospitalPurchaseWhere() },
      { invoiceId: null, items: { none: { medicineId: { not: null } } } },
    ],
  }
  if (params.from) {
    const date = where.date as Prisma.DateTimeFilter | undefined
    where.date = { ...date, gte: new Date(params.from) }
  }
  if (params.to) {
    const toDate = new Date(params.to); toDate.setHours(23, 59, 59, 999)
    const date = where.date as Prisma.DateTimeFilter | undefined
    where.date = { ...date, lte: toDate }
  }
  if (params.supplierId) where.supplierId = params.supplierId

  const returns = await prisma.purchaseReturn.findMany({
    where,
    include: {
      supplier: { select: { name: true } },
      invoice: { select: { invoiceNumber: true } },
      items: {
        select: {
          id: true,
          itemName: true,
          quantity: true,
          rate: true,
          totalAmount: true,
          batchNumber: true,
          medicine: { select: { name: true } },
        },
      },
    },
    orderBy: { date: "desc" },
    take: params.limit || 50,
  })

  const totalReturns = returns.reduce((s, r) => s + r.totalAmount, 0)
  return { returns, totalReturns }
}

export async function createHospitalPurchaseReturn(data: {
  supplierId: string
  invoiceId?: string | null
  date?: string
  reason: string
  items: Array<{
    itemName: string
    quantity: number
    rate: number
    totalAmount: number
  }>
  totalAmount: number
}) {
  const auth = await requireAuthSafe(["SUPER_ADMIN", "ACCOUNTANT", "ADMIN"])
  if (!auth.ok) return { success: false, message: auth.error }

  if (!data.supplierId) return { success: false, message: "Supplier is required" }
  if (!data.reason?.trim()) return { success: false, message: "Reason for return is required" }
  if (!data.items || data.items.length === 0) return { success: false, message: "At least one item is required" }

  const supplier = await prisma.supplier.findUnique({
    where: { id: data.supplierId },
    select: { id: true, name: true, scope: true },
  })
  if (!supplier || !supplierAllowedFor(supplier.scope, "HOSPITAL")) {
    return { success: false, message: "Supplier is not valid for hospital returns" }
  }

  const returnDate = data.date ? new Date(data.date) : new Date()
  const now = new Date()
  const ts = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}${String(now.getDate()).padStart(2, "0")}${String(now.getHours()).padStart(2, "0")}${String(now.getMinutes()).padStart(2, "0")}`
  const rand = Math.random().toString(36).slice(2, 5).toUpperCase()
  const returnNumber = `HPR-${ts}-${rand}`
  const totalAmount = Math.round(Number(data.totalAmount) * 100) / 100

  try {
    const result = await prisma.$transaction(async (tx) => {
      if (data.invoiceId) {
        const inv = await tx.purchaseInvoice.findUnique({
          where: { id: data.invoiceId },
          select: { supplierId: true },
        })
        if (!inv || inv.supplierId !== data.supplierId) {
          throw new Error("Return invoice does not belong to the selected supplier")
        }
      }

      const pr = await tx.purchaseReturn.create({
        data: {
          returnNumber,
          date: returnDate,
          supplierId: data.supplierId,
          invoiceId: data.invoiceId || null,
          reason: data.reason.trim(),
          totalAmount,
          status: "COMPLETED",
          items: {
            create: data.items.map((i) => ({
              itemName: i.itemName.trim(),
              medicineId: null,
              quantity: Number(i.quantity),
              rate: Number(i.rate),
              totalAmount: Number(i.totalAmount),
            })),
          },
        },
      })

      return pr
    })

    writeAuditLog({
      userId: auth.session.userId,
      action: "CREATE",
      module: "PurchaseReturn",
      recordId: result.id,
      changes: { returnNumber, totalAmount, supplierId: data.supplierId },
    })

    revalidatePath("/dashboard/master-finance/payables/returns")
    revalidatePath("/dashboard/master-finance/payables/suppliers")
    revalidatePath("/dashboard/master-finance/payables/aging")

    return { success: true, message: `Purchase Return #${returnNumber} recorded successfully`, id: result.id }
  } catch (error: any) {
    console.error("[ERROR] createHospitalPurchaseReturn:", error)
    return { success: false, message: error.message || "Failed to record purchase return" }
  }
}

// ═══════════════════════════════════════════════════════════════════
// 6A. SUPPLIER DIRECTORY & CRUD
// ═══════════════════════════════════════════════════════════════════

export async function getSuppliers(params: { search?: string; active?: boolean }) {
  const filters: Prisma.SupplierWhereInput[] = [supplierScopeFilter("HOSPITAL")]
  if (params.active !== undefined) filters.push({ isActive: params.active })
  if (params.search) {
    filters.push({
      OR: [
        { name: { contains: params.search, mode: "insensitive" } },
        { gstNumber: { contains: params.search, mode: "insensitive" } },
        { contactPerson: { contains: params.search, mode: "insensitive" } },
      ],
    })
  }
  const where: Prisma.SupplierWhereInput = { AND: filters }

  const suppliers = await prisma.supplier.findMany({
    where,
    include: {
      _count: { select: { purchases: true, purchaseOrders: true, supplierPayments: true, purchaseReturns: true } },
    },
    orderBy: { name: "asc" },
  })

  return suppliers
}

export async function getSupplierLedger(supplierId: string) {
  const [supplier, invoices, payments, returns] = await Promise.all([
    prisma.supplier.findFirst({ where: { id: supplierId, OR: [{ scope: "HOSPITAL" }, { scope: "BOTH" }] } }),
    prisma.purchaseInvoice.findMany({
      where: { ...hospitalPurchaseWhere({ supplierId }), supplier: { OR: [{ scope: "HOSPITAL" }, { scope: "BOTH" }] } },
      orderBy: { date: "desc" },
      select: { id: true, invoiceNumber: true, date: true, grandTotal: true, amountPaid: true, status: true },
    }),
    prisma.supplierPayment.findMany({
      where: {
        supplierId,
        supplier: supplierScopeFilter("HOSPITAL"),
        OR: [
          { invoice: hospitalPurchaseWhere() },
          { invoiceId: null, account: { scope: "HOSPITAL" } },
        ],
      },
      orderBy: { date: "desc" },
      select: { id: true, amount: true, invoiceId: true, paymentMethod: true, referenceNo: true, date: true, notes: true },
    }),
    prisma.purchaseReturn.findMany({
      where: {
        supplierId,
        OR: [
          { invoice: hospitalPurchaseWhere() },
          { invoiceId: null, items: { none: { medicineId: { not: null } } } },
        ],
      },
      orderBy: { date: "desc" },
      select: { id: true, returnNumber: true, date: true, totalAmount: true, reason: true },
    }),
  ])

  const totalPurchases = invoices.reduce((s, i) => s + i.grandTotal, 0)
  const invoiceAmountPaid = invoices.reduce((s, i) => s + i.amountPaid, 0)
  const unlinkedPayments = payments
    .filter((p) => !p.invoiceId)
    .reduce((s, p) => s + p.amount, 0)
  const totalPaid = invoiceAmountPaid + unlinkedPayments
  const totalReturns = returns.reduce((s, r) => s + r.totalAmount, 0)
  const openingBalance = supplier?.openingBalance || 0
  const balance = openingBalance + totalPurchases - totalPaid - totalReturns

  return { supplier, invoices, payments, returns, openingBalance, totalPurchases, totalPaid, totalReturns, balance }
}

export async function createHospitalSupplier(data: {
  name: string
  contactPerson?: string
  phone?: string
  email?: string
  gstNumber?: string
  address?: string
  city?: string
  state?: string
  pincode?: string
  creditDays?: number
  openingBalance?: number
  scope?: "HOSPITAL" | "BOTH"
}) {
  const auth = await requireAuthSafe(["SUPER_ADMIN", "ACCOUNTANT", "ADMIN"])
  if (!auth.ok) return { success: false, message: auth.error }

  const trimmedName = data.name?.trim()
  if (!trimmedName) return { success: false, message: "Supplier name is required" }

  const existingName = await prisma.supplier.findUnique({ where: { name: trimmedName } })
  if (existingName) return { success: false, message: "A supplier with this name already exists" }

  const trimmedGst = data.gstNumber?.trim() || null
  if (trimmedGst) {
    const existingGst = await prisma.supplier.findUnique({ where: { gstNumber: trimmedGst } })
    if (existingGst) return { success: false, message: "A supplier with this GST number already exists" }
  }

  try {
    const supplier = await prisma.supplier.create({
      data: {
        name: trimmedName,
        contactPerson: data.contactPerson?.trim() || null,
        phone: data.phone?.trim() || null,
        email: data.email?.trim() || null,
        gstNumber: trimmedGst,
        address: data.address?.trim() || null,
        city: data.city?.trim() || null,
        state: data.state?.trim() || null,
        pincode: data.pincode?.trim() || null,
        creditDays: data.creditDays ? Number(data.creditDays) : null,
        openingBalance: data.openingBalance ? Number(data.openingBalance) : 0,
        scope: data.scope || "HOSPITAL",
      },
    })

    writeAuditLog({
      userId: auth.session.userId,
      action: "CREATE",
      module: "Supplier",
      recordId: supplier.id,
      changes: { name: supplier.name, scope: supplier.scope },
    })

    revalidatePath("/dashboard/master-finance/payables/suppliers")
    revalidatePath("/dashboard/master-finance/payables/invoices")
    revalidatePath("/dashboard/master-finance/payables/payments")

    return { success: true, message: "Supplier created successfully", supplier }
  } catch (error: any) {
    console.error("[ERROR] createHospitalSupplier:", error)
    return { success: false, message: error.message || "Failed to create supplier" }
  }
}

export async function updateHospitalSupplier(
  id: string,
  data: {
    name: string
    contactPerson?: string
    phone?: string
    email?: string
    gstNumber?: string
    address?: string
    city?: string
    state?: string
    pincode?: string
    creditDays?: number
    openingBalance?: number
    scope?: "HOSPITAL" | "BOTH"
    isActive?: boolean
  }
) {
  const auth = await requireAuthSafe(["SUPER_ADMIN", "ACCOUNTANT", "ADMIN"])
  if (!auth.ok) return { success: false, message: auth.error }

  const trimmedName = data.name?.trim()
  if (!trimmedName) return { success: false, message: "Supplier name is required" }

  const existing = await prisma.supplier.findFirst({
    where: { name: trimmedName, NOT: { id } },
  })
  if (existing) return { success: false, message: "Another supplier with this name already exists" }

  const trimmedGst = data.gstNumber?.trim() || null
  if (trimmedGst) {
    const existingGst = await prisma.supplier.findFirst({
      where: { gstNumber: trimmedGst, NOT: { id } },
    })
    if (existingGst) return { success: false, message: "Another supplier with this GST number already exists" }
  }

  try {
    const supplier = await prisma.supplier.update({
      where: { id },
      data: {
        name: trimmedName,
        contactPerson: data.contactPerson?.trim() || null,
        phone: data.phone?.trim() || null,
        email: data.email?.trim() || null,
        gstNumber: trimmedGst,
        address: data.address?.trim() || null,
        city: data.city?.trim() || null,
        state: data.state?.trim() || null,
        pincode: data.pincode?.trim() || null,
        creditDays: data.creditDays !== undefined ? (data.creditDays ? Number(data.creditDays) : null) : undefined,
        openingBalance: data.openingBalance !== undefined ? Number(data.openingBalance) : undefined,
        scope: data.scope || undefined,
        isActive: data.isActive !== undefined ? data.isActive : undefined,
      },
    })

    writeAuditLog({
      userId: auth.session.userId,
      action: "UPDATE",
      module: "Supplier",
      recordId: supplier.id,
      changes: { name: supplier.name, scope: supplier.scope },
    })

    revalidatePath("/dashboard/master-finance/payables/suppliers")
    revalidatePath("/dashboard/master-finance/payables/invoices")
    revalidatePath("/dashboard/master-finance/payables/payments")

    return { success: true, message: "Supplier updated successfully", supplier }
  } catch (error: any) {
    console.error("[ERROR] updateHospitalSupplier:", error)
    return { success: false, message: error.message || "Failed to update supplier" }
  }
}

export async function toggleSupplierStatus(id: string) {
  const auth = await requireAuthSafe(["SUPER_ADMIN", "ACCOUNTANT", "ADMIN"])
  if (!auth.ok) return { success: false, message: auth.error }

  const sup = await prisma.supplier.findUnique({ where: { id } })
  if (!sup) return { success: false, message: "Supplier not found" }

  try {
    await prisma.supplier.update({
      where: { id },
      data: { isActive: !sup.isActive },
    })

    revalidatePath("/dashboard/master-finance/payables/suppliers")
    return { success: true, message: `Supplier marked as ${!sup.isActive ? "active" : "inactive"}` }
  } catch (error: any) {
    return { success: false, message: error.message || "Failed to update supplier status" }
  }
}

// ═══════════════════════════════════════════════════════════════════
// 6B. HELPERS (ACCOUNTS & DROPDOWNS)
// ═══════════════════════════════════════════════════════════════════

export async function getHospitalAccountsForPayment() {
  return prisma.financialAccount.findMany({
    where: { scope: "HOSPITAL", isActive: true },
    select: { id: true, name: true, type: true, currentBalance: true },
    orderBy: { name: "asc" },
  })
}

export async function getHospitalSuppliersList() {
  return prisma.supplier.findMany({
    where: { ...supplierScopeFilter("HOSPITAL"), isActive: true },
    select: { id: true, name: true, gstNumber: true, phone: true, openingBalance: true },
    orderBy: { name: "asc" },
  })
}

export async function getHospitalUnpaidInvoices(supplierId: string) {
  return prisma.purchaseInvoice.findMany({
    where: {
      supplierId,
      ...hospitalPurchaseWhere({ status: { in: ["UNPAID", "PARTIAL"] } }),
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
}

// ═══════════════════════════════════════════════════════════════════
// 6C. SUPPLIER PAYMENTS
// ═══════════════════════════════════════════════════════════════════

export async function getSupplierPayments(params: { from?: string; to?: string; supplierId?: string; limit?: number }) {
  const where: Prisma.SupplierPaymentWhereInput = {
    supplier: supplierScopeFilter("HOSPITAL"),
    OR: [
      { invoice: hospitalPurchaseWhere() },
      { invoiceId: null, account: { scope: "HOSPITAL" } },
    ],
  }
  if (params.from) {
    const date = where.date as Prisma.DateTimeFilter | undefined
    where.date = { ...date, gte: new Date(params.from) }
  }
  if (params.to) {
    const toDate = new Date(params.to); toDate.setHours(23, 59, 59, 999)
    const date = where.date as Prisma.DateTimeFilter | undefined
    where.date = { ...date, lte: toDate }
  }
  if (params.supplierId) where.supplierId = params.supplierId

  const payments = await prisma.supplierPayment.findMany({
    where,
    include: {
      supplier: { select: { name: true } },
      invoice: { select: { invoiceNumber: true } },
      account: { select: { name: true, type: true } },
    },
    orderBy: { date: "desc" },
    take: params.limit || 50,
  })

  const totalPaid = payments.reduce((s, p) => s + p.amount, 0)
  return { payments, totalPaid }
}

export async function recordHospitalSupplierPayment(data: {
  supplierId: string
  invoiceId?: string | null
  amount: number
  paymentMethod: string
  accountId: string
  referenceNo?: string
  notes?: string
  date?: string
}) {
  const auth = await requireAuthSafe(["SUPER_ADMIN", "ACCOUNTANT", "ADMIN"])
  if (!auth.ok) return { success: false, message: auth.error }

  const amount = Math.round(Number(data.amount) * 100) / 100
  if (!amount || amount <= 0) return { success: false, message: "Payment amount must be greater than zero" }
  if (!data.supplierId) return { success: false, message: "Supplier is required" }
  if (!data.accountId) return { success: false, message: "Payment account is required" }

  const supplier = await prisma.supplier.findUnique({
    where: { id: data.supplierId },
    select: { id: true, name: true, scope: true },
  })
  if (!supplier || !supplierAllowedFor(supplier.scope, "HOSPITAL")) {
    return { success: false, message: "Supplier is not valid for hospital payments" }
  }

  const paymentDate = data.date ? new Date(data.date) : new Date()

  try {
    const result = await prisma.$transaction(async (tx) => {
      const account = await tx.financialAccount.findUnique({
        where: { id: data.accountId },
        select: { id: true, name: true, scope: true, isActive: true, currentBalance: true },
      })
      if (!account || !account.isActive) throw new Error("Payment account is inactive or not found")
      if (account.scope !== "HOSPITAL") throw new Error("Account must belong to hospital finance")
      if (account.currentBalance < amount) {
        throw new Error(
          `Insufficient balance in ${account.name} (Balance: ₹${account.currentBalance.toLocaleString("en-IN")}, Required: ₹${amount.toLocaleString("en-IN")})`
        )
      }

      let invoiceNumber = null
      if (data.invoiceId) {
        const invoice = await tx.purchaseInvoice.findUnique({
          where: { id: data.invoiceId },
          select: { id: true, invoiceNumber: true, supplierId: true, grandTotal: true, amountPaid: true },
        })
        if (!invoice) throw new Error("Linked invoice not found")
        if (invoice.supplierId !== data.supplierId) throw new Error("Invoice does not belong to this supplier")

        const remainingDue = Math.round((invoice.grandTotal - invoice.amountPaid) * 100) / 100
        if (amount > remainingDue + 0.01) {
          throw new Error(
            `Amount of ₹${amount.toLocaleString("en-IN")} exceeds invoice due amount of ₹${remainingDue.toLocaleString("en-IN")}`
          )
        }

        invoiceNumber = invoice.invoiceNumber
        const newPaid = Math.round((invoice.amountPaid + amount) * 100) / 100
        const newStatus = newPaid >= invoice.grandTotal - 0.01 ? "PAID" : "PARTIAL"

        await tx.purchaseInvoice.update({
          where: { id: data.invoiceId },
          data: {
            amountPaid: newPaid,
            status: newStatus,
          },
        })
      }

      const payment = await tx.supplierPayment.create({
        data: {
          supplierId: data.supplierId,
          invoiceId: data.invoiceId || null,
          amount,
          paymentMethod: data.paymentMethod || "BANK_TRANSFER",
          accountId: data.accountId,
          referenceNo: data.referenceNo?.trim() || null,
          notes: data.notes?.trim() || (invoiceNumber ? `Payment against Inv #${invoiceNumber}` : `Payment to ${supplier.name}`),
          date: paymentDate,
          createdBy: auth.session.userId,
        },
      })

      await tx.financialAccount.update({
        where: { id: data.accountId },
        data: { currentBalance: { decrement: amount } },
      })

      const accountGroupCode = resolveAccountGroupCode("EXPENSE", "PURCHASE", null, "HOSPITAL") || "5120"
      await tx.transaction.create({
        data: {
          accountId: data.accountId,
          type: "EXPENSE",
          amount,
          category: "Supplier Payment",
          paymentMethod: data.paymentMethod || "BANK_TRANSFER",
          scope: "HOSPITAL",
          referenceId: payment.id,
          description: invoiceNumber
            ? `Supplier Payment: ${supplier.name} (Inv #${invoiceNumber})`
            : `Supplier Payment: ${supplier.name}`,
          accountGroupCode,
          date: paymentDate,
        },
      })

      return payment
    })

    writeAuditLog({
      userId: auth.session.userId,
      action: "CREATE",
      module: "SupplierPayment",
      recordId: result.id,
      changes: { supplierId: data.supplierId, amount, invoiceId: data.invoiceId },
    })

    revalidatePath("/dashboard/master-finance/payables/payments")
    revalidatePath("/dashboard/master-finance/payables/invoices")
    revalidatePath("/dashboard/master-finance/payables/suppliers")
    revalidatePath("/dashboard/master-finance/payables/aging")

    return { success: true, message: `Payment of ₹${amount.toLocaleString("en-IN")} recorded successfully`, id: result.id }
  } catch (error: any) {
    console.error("[ERROR] recordHospitalSupplierPayment:", error)
    return { success: false, message: error.message || "Failed to record payment" }
  }
}

// ═══════════════════════════════════════════════════════════════════
// 5E. AP AGING REPORT
// ═══════════════════════════════════════════════════════════════════

export async function getAPAgingReport() {
  const now = new Date()
  const invoices = await prisma.purchaseInvoice.findMany({
    where: {
      status: { in: ["UNPAID", "PARTIAL"] },
      items: { none: { medicineId: { not: null } } },
      supplier: { OR: [{ scope: "HOSPITAL" }, { scope: "BOTH" }] },
    },
    include: { supplier: { select: { id: true, name: true } } },
    orderBy: { date: "asc" },
  })

  type AgingEntry = {
    id: string
    invoiceNumber: string
    supplierName: string
    supplierId: string
    date: Date
    grandTotal: number
    amountPaid: number
    balance: number
    daysPast: number
  }

  const buckets = {
    current: { count: 0, amount: 0, items: [] as AgingEntry[] },
    days31_60: { count: 0, amount: 0, items: [] as AgingEntry[] },
    days61_90: { count: 0, amount: 0, items: [] as AgingEntry[] },
    over90: { count: 0, amount: 0, items: [] as AgingEntry[] },
  }

  for (const inv of invoices) {
    const balance = inv.grandTotal - inv.amountPaid
    if (balance <= 0) continue
    const daysPast = Math.floor((now.getTime() - inv.date.getTime()) / (1000 * 60 * 60 * 24))
    const entry = {
      id: inv.id,
      invoiceNumber: inv.invoiceNumber,
      supplierName: inv.supplier.name,
      supplierId: inv.supplier.id,
      date: inv.date,
      grandTotal: inv.grandTotal,
      amountPaid: inv.amountPaid,
      balance,
      daysPast,
    }

    if (daysPast <= 30) {
      buckets.current.count++
      buckets.current.amount += balance
      buckets.current.items.push(entry)
    } else if (daysPast <= 60) {
      buckets.days31_60.count++
      buckets.days31_60.amount += balance
      buckets.days31_60.items.push(entry)
    } else if (daysPast <= 90) {
      buckets.days61_90.count++
      buckets.days61_90.amount += balance
      buckets.days61_90.items.push(entry)
    } else {
      buckets.over90.count++
      buckets.over90.amount += balance
      buckets.over90.items.push(entry)
    }
  }

  const totalOutstanding = Object.values(buckets).reduce((s, b) => s + b.amount, 0)
  const totalInvoices = Object.values(buckets).reduce((s, b) => s + b.count, 0)

  // Supplier-wise aggregation
  const supplierMap = new Map<string, { name: string; total: number; count: number }>()
  for (const inv of invoices) {
    const balance = inv.grandTotal - inv.amountPaid
    if (balance <= 0) continue
    const existing = supplierMap.get(inv.supplier.id) || { name: inv.supplier.name, total: 0, count: 0 }
    existing.total += balance
    existing.count++
    supplierMap.set(inv.supplier.id, existing)
  }
  const topSuppliers = Array.from(supplierMap.entries())
    .map(([id, v]) => ({ id, ...v }))
    .sort((a, b) => b.total - a.total)
    .slice(0, 10)

  return { buckets, totalOutstanding, totalInvoices, topSuppliers }
}
