"use server"

import { prisma } from "@/lib/prisma"
import { revalidatePath } from "next/cache"
import { requireAuthSafe } from "@/lib/auth-guard"
import { writeAuditLog } from "@/lib/audit"
import { PurchaseOrderStatus } from "@prisma/client"
import { supplierAllowedFor, supplierScopeFilter } from "@/lib/supplier-scope"

export async function getPurchaseOrders() {
  const authResult = await requireAuthSafe(["SUPER_ADMIN", "PHARMACIST"])
  if (!authResult.ok) return { success: false, message: authResult.error }

  try {
    const orders = await prisma.purchaseOrder.findMany({
      where: { supplier: supplierScopeFilter("PHARMACY") },
      include: {
        supplier: true,
        items: {
          include: { medicine: true }
        }
      },
      orderBy: { date: "desc" }
    })
    return { success: true, data: orders }
  } catch (error: any) {
    console.error("[ERROR] getPurchaseOrders:", error)
    return { success: false, message: error.message || "Failed to fetch purchase orders" }
  }
}

export async function getPurchaseOrderById(id: string) {
  const authResult = await requireAuthSafe(["SUPER_ADMIN", "PHARMACIST"])
  if (!authResult.ok) return { success: false, message: authResult.error }

  try {
    const order = await prisma.purchaseOrder.findUnique({
      where: { id },
      include: {
        supplier: true,
        items: {
          include: { medicine: true }
        }
      }
    })
    if (order && !supplierAllowedFor(order.supplier.scope, "PHARMACY")) {
      return { success: false, message: "Purchase order is outside pharmacy scope" }
    }
    return { success: true, data: order }
  } catch (error: any) {
    console.error("[ERROR] getPurchaseOrderById:", error)
    return { success: false, message: error.message || "Failed to fetch purchase order" }
  }
}

export async function createPurchaseOrder(data: {
  supplierId: string
  expectedDate?: Date
  notes?: string
  items: {
    medicineId: string
    quantity: number
    unitCost: number
  }[]
}) {
  const authResult = await requireAuthSafe(["SUPER_ADMIN", "PHARMACIST"])
  if (!authResult.ok) return { success: false, message: authResult.error }

  try {
    const supplier = await prisma.supplier.findUnique({ where: { id: data.supplierId }, select: { scope: true } })
    if (!supplier || !supplierAllowedFor(supplier.scope, "PHARMACY")) return { success: false, message: "Supplier is not available for pharmacy purchase orders" }
    // Generate order number
    const count = await prisma.purchaseOrder.count()
    const orderNumber = `PO-${new Date().getFullYear()}-${String(count + 1).padStart(4, "0")}`

    let totalAmount = 0
    const itemsData = data.items.map(item => {
      const totalCost = item.quantity * item.unitCost
      totalAmount += totalCost
      return {
        ...item,
        totalCost
      }
    })

    const newOrder = await prisma.purchaseOrder.create({
      data: {
        orderNumber,
        supplierId: data.supplierId,
        expectedDate: data.expectedDate,
        notes: data.notes,
        totalAmount,
        createdBy: authResult.session.name || "System",
        items: {
          create: itemsData
        }
      }
    })

    writeAuditLog({
      userId: authResult.session.userId,
      action: "CREATE",
      module: "PurchaseOrder",
      recordId: newOrder.id,
      changes: { orderNumber },
    })

    revalidatePath("/dashboard/pharmacy/purchase-orders")
    return { success: true, message: "Purchase order created successfully", data: newOrder }
  } catch (error: any) {
    console.error("[ERROR] createPurchaseOrder:", error)
    return { success: false, message: error.message || "Failed to create purchase order" }
  }
}

export async function updatePurchaseOrder(
  id: string,
  data: {
    supplierId: string
    expectedDate?: Date
    notes?: string
    items: {
      medicineId: string
      quantity: number
      unitCost: number
    }[]
  }
) {
  const authResult = await requireAuthSafe(["SUPER_ADMIN", "PHARMACIST"])
  if (!authResult.ok) return { success: false, message: authResult.error }

  try {
    const supplier = await prisma.supplier.findUnique({ where: { id: data.supplierId }, select: { scope: true } })
    if (!supplier || !supplierAllowedFor(supplier.scope, "PHARMACY")) return { success: false, message: "Supplier is not available for pharmacy purchase orders" }
    let totalAmount = 0
    const itemsData = data.items.map(item => {
      const totalCost = item.quantity * item.unitCost
      totalAmount += totalCost
      return {
        ...item,
        totalCost
      }
    })

    const updated = await prisma.$transaction(async (tx) => {
      await tx.purchaseOrderItem.deleteMany({
        where: { purchaseOrderId: id }
      })

      return await tx.purchaseOrder.update({
        where: { id },
        data: {
          supplierId: data.supplierId,
          expectedDate: data.expectedDate,
          notes: data.notes,
          totalAmount,
          items: {
            create: itemsData
          }
        },
        include: { items: true, supplier: true }
      })
    })

    writeAuditLog({
      userId: authResult.session.userId,
      action: "UPDATE",
      module: "PurchaseOrder",
      recordId: id,
      changes: { totalAmount },
    })

    revalidatePath("/dashboard/pharmacy/purchase-orders")
    return { success: true, message: "Purchase order updated successfully", data: updated }
  } catch (error: any) {
    console.error("[ERROR] updatePurchaseOrder:", error)
    return { success: false, message: error.message || "Failed to update purchase order" }
  }
}

export async function deletePurchaseOrder(id: string) {
  const authResult = await requireAuthSafe(["SUPER_ADMIN", "PHARMACIST"])
  if (!authResult.ok) return { success: false, message: authResult.error }

  try {
    await prisma.$transaction(async (tx) => {
      const order = await tx.purchaseOrder.findFirst({
        where: { id, supplier: supplierScopeFilter("PHARMACY") },
        select: { id: true },
      })
      if (!order) throw new Error("Purchase order is outside pharmacy scope")
      await tx.purchaseOrderItem.deleteMany({
        where: { purchaseOrderId: id }
      })
      await tx.purchaseOrder.delete({
        where: { id }
      })
    })

    writeAuditLog({
      userId: authResult.session.userId,
      action: "DELETE",
      module: "PurchaseOrder",
      recordId: id,
      changes: { id },
    })

    revalidatePath("/dashboard/pharmacy/purchase-orders")
    return { success: true, message: "Purchase order deleted successfully" }
  } catch (error: any) {
    console.error("[ERROR] deletePurchaseOrder:", error)
    return { success: false, message: error.message || "Failed to delete purchase order" }
  }
}

export async function updatePurchaseOrderStatus(id: string, status: PurchaseOrderStatus) {
  const authResult = await requireAuthSafe(["SUPER_ADMIN", "PHARMACIST"])
  if (!authResult.ok) return { success: false, message: authResult.error }

  try {
    const order = await prisma.purchaseOrder.findFirst({
      where: { id, supplier: supplierScopeFilter("PHARMACY") },
      select: { id: true },
    })
    if (!order) return { success: false, message: "Purchase order is outside pharmacy scope" }
    const updated = await prisma.purchaseOrder.update({
      where: { id },
      data: { status }
    })
    revalidatePath("/dashboard/pharmacy/purchase-orders")
    return { success: true, message: "Status updated successfully", data: updated }
  } catch (error: any) {
    console.error("[ERROR] updatePurchaseOrderStatus:", error)
    return { success: false, message: error.message || "Failed to update status" }
  }
}

export async function getLowStockMedicines() {
  const authResult = await requireAuthSafe(["SUPER_ADMIN", "PHARMACIST"])
  if (!authResult.ok) return { success: false, message: authResult.error }

  try {
    const medicines = await prisma.medicine.findMany({
      where: { isActive: true },
      include: {
        inventoryBatches: {
          where: { isActive: true, isExpired: false }
        }
      }
    })

    const lowStock = medicines
      .map(med => {
        const totalStock = med.inventoryBatches.reduce((sum, b) => sum + b.quantity, 0)
        return { ...med, totalStock }
      })
      .filter(med => med.totalStock <= med.minStockLevel)
      
    return { success: true, data: lowStock }
  } catch (error: any) {
    console.error("[ERROR] getLowStockMedicines:", error)
    return { success: false, message: "Failed to fetch low stock medicines" }
  }
}
