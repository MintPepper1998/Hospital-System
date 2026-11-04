"use server"

import { prisma } from "@/lib/prisma"
import { resolveFinancialAccount } from "@/lib/payment-routing"
import { revalidatePath } from "next/cache"
import { BillingStatus, BillingType } from "@prisma/client"

// ============================================
// CANTEEN MANAGEMENT — SERVER ACTIONS
// ============================================

// ── MENU ITEM CRUD ─────────────────────────

export async function getMenuItems() {
  return prisma.canteenMenuItem.findMany({
    where: { isActive: true },
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
  })
}

export async function createMenuItem(data: {
  name: string
  category: "VEG" | "NON_VEG" | "EGG"
  subCategory?: string
  description?: string
  imageUrl?: string
  price: number
  ipdPrice?: number
  nutritionInfo?: string
  allergens?: string
}) {
  try {
    const item = await prisma.canteenMenuItem.create({ data })
    revalidatePath("/dashboard/canteen/menu")
    return { success: true, item }
  } catch (error) {
    console.error("❌ CREATE MENU ITEM ERROR:", error)
    return { success: false, error: error instanceof Error ? error.message : "Failed to create menu item" }
  }
}

export async function updateMenuItem(
  id: string,
  data: {
    name?: string
    category?: "VEG" | "NON_VEG" | "EGG"
    subCategory?: string
    description?: string
    imageUrl?: string
    price?: number
    ipdPrice?: number
    nutritionInfo?: string
    allergens?: string
    isActive?: boolean
  }
) {
  try {
    const item = await prisma.canteenMenuItem.update({ where: { id }, data })
    revalidatePath("/dashboard/canteen/menu")
    return { success: true, item }
  } catch (error) {
    console.error("❌ UPDATE MENU ITEM ERROR:", error)
    return { success: false, error: error instanceof Error ? error.message : "Failed to update menu item" }
  }
}

export async function deleteMenuItem(id: string) {
  try {
    await prisma.canteenMenuItem.update({ where: { id }, data: { isActive: false } })
    revalidatePath("/dashboard/canteen/menu")
    return { success: true }
  } catch (error) {
    console.error("❌ DELETE MENU ITEM ERROR:", error)
    return { success: false, error: error instanceof Error ? error.message : "Failed to delete menu item" }
  }
}

// ── MEAL SLOTS ──────────────────────────────

export async function getMealSlots() {
  return prisma.canteenMealSlot.findMany({
    where: { isActive: true },
    orderBy: { sortOrder: "asc" },
  })
}

export async function createMealSlot(data: {
  name: string
  code: string
  startTime: string
  endTime: string
  sortOrder?: number
}) {
  try {
    const slot = await prisma.canteenMealSlot.create({ data })
    revalidatePath("/dashboard/canteen")
    revalidatePath("/dashboard/admin/settings/canteen")
    return { success: true, slot }
  } catch (error) {
    console.error("❌ CREATE MEAL SLOT ERROR:", error)
    return { success: false, error: error instanceof Error ? error.message : "Failed to create meal slot" }
  }
}

export async function updateMealSlot(
  id: string,
  data: { name?: string; code?: string; startTime?: string; endTime?: string; sortOrder?: number; isActive?: boolean }
) {
  try {
    const slot = await prisma.canteenMealSlot.update({ where: { id }, data })
    revalidatePath("/dashboard/canteen")
    revalidatePath("/dashboard/admin/settings/canteen")
    return { success: true, slot }
  } catch (error) {
    console.error("❌ UPDATE MEAL SLOT ERROR:", error)
    return { success: false, error: error instanceof Error ? error.message : "Failed to update meal slot" }
  }
}

// ── DIET PLANS ──────────────────────────────

export async function getDietPlans() {
  return prisma.canteenDietPlan.findMany({
    where: { isActive: true },
    orderBy: { name: "asc" },
  })
}

export async function createDietPlan(data: {
  name: string
  code: string
  description?: string
  restrictions?: string
  calorieTarget?: number
}) {
  try {
    const plan = await prisma.canteenDietPlan.create({ data })
    revalidatePath("/dashboard/canteen/ipd-diets")
    return { success: true, plan }
  } catch (error) {
    console.error("❌ CREATE DIET PLAN ERROR:", error)
    return { success: false, error: error instanceof Error ? error.message : "Failed to create diet plan" }
  }
}

// ── DAILY MENU ──────────────────────────────

export async function getDailyMenu(date: Date) {
  const startOfDay = new Date(date)
  startOfDay.setHours(0, 0, 0, 0)
  const endOfDay = new Date(date)
  endOfDay.setHours(23, 59, 59, 999)

  return prisma.canteenDailyMenu.findMany({
    where: {
      date: { gte: startOfDay, lte: endOfDay },
    },
    include: {
      mealSlot: true,
      menuItem: true,
    },
    orderBy: [{ mealSlot: { sortOrder: "asc" } }, { menuItem: { sortOrder: "asc" } }],
  })
}

export async function setDailyMenu(data: {
  date: Date
  mealSlotId: string
  menuItemIds: string[]
}) {
  try {
    const dateOnly = new Date(data.date)
    dateOnly.setHours(0, 0, 0, 0)

    // Remove existing items for this slot+date, then add new ones
    await prisma.canteenDailyMenu.deleteMany({
      where: { date: dateOnly, mealSlotId: data.mealSlotId },
    })

    if (data.menuItemIds.length > 0) {
      await prisma.canteenDailyMenu.createMany({
        data: data.menuItemIds.map((menuItemId) => ({
          date: dateOnly,
          mealSlotId: data.mealSlotId,
          menuItemId,
        })),
      })
    }

    revalidatePath("/dashboard/canteen/menu")
    return { success: true }
  } catch (error) {
    console.error("❌ SET DAILY MENU ERROR:", error)
    return { success: false, error: error instanceof Error ? error.message : "Failed to set daily menu" }
  }
}

export async function copyDailyMenu(fromDate: Date, toDate: Date) {
  try {
    const from = new Date(fromDate)
    from.setHours(0, 0, 0, 0)
    const to = new Date(toDate)
    to.setHours(0, 0, 0, 0)

    const existing = await prisma.canteenDailyMenu.findMany({
      where: { date: from },
    })

    if (existing.length === 0) {
      return { success: false, error: "No menu items found for source date" }
    }

    // Clear target date first
    await prisma.canteenDailyMenu.deleteMany({ where: { date: to } })

    await prisma.canteenDailyMenu.createMany({
      data: existing.map((item) => ({
        date: to,
        mealSlotId: item.mealSlotId,
        menuItemId: item.menuItemId,
      })),
    })

    revalidatePath("/dashboard/canteen/menu")
    return { success: true, count: existing.length }
  } catch (error) {
    console.error("❌ COPY DAILY MENU ERROR:", error)
    return { success: false, error: error instanceof Error ? error.message : "Failed to copy menu" }
  }
}

// ── PATIENT DIET ASSIGNMENT (Doctor) ────────

export async function assignPatientDiet(data: {
  admissionId?: string
  emergencyVisitId?: string
  dietPlanId: string
  assignedById: string
  assignedByName: string
  customNotes?: string
  excludedItems?: string
}) {
  try {
    if (!data.admissionId && !data.emergencyVisitId) return { success: false, error: "Required Admission or ER Visit ID" }

    // Deactivate any existing active diet for this admission/visit
    await prisma.canteenPatientDiet.updateMany({
      where: data.admissionId 
        ? { admissionId: data.admissionId, isActive: true }
        : { emergencyVisitId: data.emergencyVisitId, isActive: true },
      data: { isActive: false, endDate: new Date() },
    })

    const diet = await prisma.canteenPatientDiet.create({
      data: {
        admissionId: data.admissionId || null,
        emergencyVisitId: data.emergencyVisitId || null,
        dietPlanId: data.dietPlanId,
        assignedById: data.assignedById,
        assignedByName: data.assignedByName,
        customNotes: data.customNotes,
        excludedItems: data.excludedItems,
      },
      include: { dietPlan: true },
    })

    revalidatePath("/dashboard/canteen/ipd-diets")
    if (data.admissionId) revalidatePath(`/dashboard/ipd/patient/${data.admissionId}`)
    if (data.emergencyVisitId) revalidatePath(`/dashboard/clinical/emergency/patient/${data.emergencyVisitId}`)
    return { success: true, diet }
  } catch (error) {
    console.error("❌ ASSIGN PATIENT DIET ERROR:", error)
    return { success: false, error: error instanceof Error ? error.message : "Failed to assign diet" }
  }
}

export async function getActivePatientDiets() {
  return prisma.canteenPatientDiet.findMany({
    where: { isActive: true },
    include: {
      dietPlan: true,
      admission: {
        include: {
          patient: { include: { user: true } },
          bed: { include: { ward: true } },
        },
      },
    },
    orderBy: { createdAt: "desc" },
  })
}

export async function stopPatientDiet(dietId: string, admissionId?: string, emergencyVisitId?: string) {
  try {
    const diet = await prisma.canteenPatientDiet.update({
      where: { id: dietId },
      data: { isActive: false, endDate: new Date() },
    })
    if (admissionId) revalidatePath(`/dashboard/ipd/patient/${admissionId}`)
    if (emergencyVisitId) revalidatePath(`/dashboard/clinical/emergency/patient/${emergencyVisitId}`)
    return { success: true, diet }
  } catch (error) {
    console.error("❌ STOP DIET ERROR:", error)
    return { success: false, error: error instanceof Error ? error.message : "Failed to stop diet plan" }
  }
}

// ── MEAL ORDERS (IPD serving) ────────────────

export async function createMealOrder(data: {
  admissionId?: string
  emergencyVisitId?: string
  mealSlotId: string
  items: Array<{ menuItemId: string; itemName: string; quantity: number; unitPrice: number }>
  notes?: string
}) {
  try {
    let patientName = "Unknown"
    let wardName = ""
    let bedNumber = ""

    if (data.admissionId) {
      const admission = await prisma.iPDAdmission.findUnique({
        where: { id: data.admissionId },
        include: { patient: { include: { user: true } }, bed: { include: { ward: true } } },
      })
      if (!admission) return { success: false, error: "Admission not found" }
      patientName = admission.patient.user.name || "Unknown"
      wardName = admission.bed.ward.name
      bedNumber = admission.bed.bedNumber
    } else if (data.emergencyVisitId) {
      const visit = await prisma.emergencyVisit.findUnique({
        where: { id: data.emergencyVisitId },
        include: { patient: { include: { user: true } }, bed: { include: { ward: true } } },
      })
      if (!visit) return { success: false, error: "ER Visit not found" }
      patientName = visit.patient?.user.name || "Unknown"
      wardName = visit.bed?.ward.name || ""
      bedNumber = visit.bed?.bedNumber || ""
    } else {
      return { success: false, error: "Missing Admission or ER Visit ID" }
    }

    // Generate order number
    const year = new Date().getFullYear()
    const count = await prisma.canteenMealOrder.count()
    const orderNumber = `CMO-${year}-${String(count + 1).padStart(4, "0")}`

    const totalAmount = data.items.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0)

    const order = await prisma.canteenMealOrder.create({
      data: {
        orderNumber,
        orderType: "IPD",
        mealSlotId: data.mealSlotId,
        admissionId: data.admissionId || null,
        emergencyVisitId: data.emergencyVisitId || null,
        patientName,
        wardName,
        bedNumber,
        totalAmount,
        notes: data.notes,
        items: {
          create: data.items.map((item) => ({
            menuItemId: item.menuItemId,
            itemName: item.itemName,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            totalPrice: item.quantity * item.unitPrice,
          })),
        },
      },
      include: { items: true },
    })

    revalidatePath("/dashboard/canteen")
    revalidatePath("/dashboard/canteen/ipd-diets")
    return { success: true, order }
  } catch (error) {
    console.error("❌ CREATE MEAL ORDER ERROR:", error)
    return { success: false, error: error instanceof Error ? error.message : "Failed to create meal order" }
  }
}

export async function updateMealOrderStatus(orderId: string, status: string, servedBy?: string) {
  try {
    await prisma.canteenMealOrder.update({
      where: { id: orderId },
      data: {
        status,
        servedAt: status === "SERVED" ? new Date() : undefined,
        servedBy: status === "SERVED" ? servedBy : undefined,
      },
    })
    revalidatePath("/dashboard/canteen")
    revalidatePath("/dashboard/canteen/ipd-diets")
    return { success: true }
  } catch (error) {
    console.error("❌ UPDATE MEAL ORDER STATUS ERROR:", error)
    return { success: false, error: error instanceof Error ? error.message : "Failed to update order status" }
  }
}

// ── WALK-IN TOKENS (POS) ────────────────────

export async function issueWalkInToken(data: {
  customerName?: string
  customerPhone?: string
  items: Array<{ menuItemId: string; itemName: string; quantity: number; unitPrice: number }>
  paymentMethod: string
  issuedBy?: string
}) {
  try {
    const totalAmount = data.items.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0)

    // Generate token number (daily reset)
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const todayCount = await prisma.canteenToken.count({
      where: { issuedAt: { gte: today } },
    })
    const tokenNumber = `TKN-${String(todayCount + 1).padStart(4, "0")}`

    // Generate bill number
    const year = new Date().getFullYear()
    const lastBill = await prisma.billing.findFirst({
      where: { billNumber: { startsWith: `CAN-${year}-` } },
      orderBy: { billNumber: 'desc' }
    })
    const lastSeq = lastBill?.billNumber ? parseInt(lastBill.billNumber.split('-')[2]) || 0 : 0
    const billNumber = `CAN-${year}-${String(lastSeq + 1).padStart(4, "0")}`

    const result = await prisma.$transaction(async (tx) => {
      // We need a dummy patient for billing — use the first system patient or skip billing
      // For walk-in tokens, we create a token record and optionally a billing record
      const token = await tx.canteenToken.create({
        data: {
          tokenNumber,
          customerName: data.customerName,
          customerPhone: data.customerPhone,
          totalAmount,
          paymentMethod: data.paymentMethod,
          paymentStatus: "PAID",
          status: "ISSUED",
          issuedBy: data.issuedBy,
          items: {
            create: data.items.map((item) => ({
              menuItemId: item.menuItemId,
              itemName: item.itemName,
              quantity: item.quantity,
              unitPrice: item.unitPrice,
              totalPrice: item.quantity * item.unitPrice,
            })),
          },
        },
        include: { items: true },
      })

      // Route payment to financial ledger
      if (totalAmount > 0) {
        const accountId = await resolveFinancialAccount(tx, data.paymentMethod)
        if (accountId) {
          await tx.transaction.create({
            data: {
              accountId,
              type: "INCOME",
              amount: totalAmount,
              category: "CANTEEN_WALKIN",
              paymentMethod: data.paymentMethod,
              referenceId: token.id,
              description: `Canteen Walk-in Token ${tokenNumber}`,
            },
          })
          await tx.financialAccount.update({
            where: { id: accountId },
            data: { currentBalance: { increment: totalAmount } },
          })
        }
      }

      return { token }
    })

    revalidatePath("/dashboard/canteen/tokens")
    revalidatePath("/dashboard/canteen")
    return { success: true, token: result.token, tokenNumber }
  } catch (error) {
    console.error("❌ ISSUE WALK-IN TOKEN ERROR:", error)
    return { success: false, error: error instanceof Error ? error.message : "Failed to issue token" }
  }
}

export async function updateTokenStatus(tokenId: string, status: string) {
  try {
    await prisma.canteenToken.update({
      where: { id: tokenId },
      data: {
        status: status as any,
        servedAt: status === "SERVED" ? new Date() : undefined,
      },
    })
    revalidatePath("/dashboard/canteen/tokens")
    return { success: true }
  } catch (error) {
    console.error("❌ UPDATE TOKEN STATUS ERROR:", error)
    return { success: false, error: error instanceof Error ? error.message : "Failed to update token status" }
  }
}

// ── CANTEEN INVENTORY ───────────────────────

export async function getCanteenInventory() {
  return prisma.canteenInventoryItem.findMany({
    where: { isActive: true },
    orderBy: [{ category: "asc" }, { name: "asc" }],
  })
}

export async function createInventoryItem(data: {
  name: string
  category?: string
  unit?: string
  currentStock?: number
  minStockLevel?: number
  costPerUnit?: number
}) {
  try {
    const item = await prisma.canteenInventoryItem.create({ data })
    revalidatePath("/dashboard/canteen/inventory")
    return { success: true, item }
  } catch (error) {
    console.error("❌ CREATE INVENTORY ITEM ERROR:", error)
    return { success: false, error: error instanceof Error ? error.message : "Failed to create inventory item" }
  }
}

export async function addStockEntry(data: {
  inventoryItemId: string
  entryType: string
  quantity: number
  costPerUnit?: number
  supplierName?: string
  invoiceNumber?: string
  notes?: string
  enteredBy?: string
}) {
  try {
    const result = await prisma.$transaction(async (tx) => {
      const entry = await tx.canteenStockEntry.create({
        data: {
          inventoryItemId: data.inventoryItemId,
          entryType: data.entryType,
          quantity: data.quantity,
          costPerUnit: data.costPerUnit,
          totalCost: data.costPerUnit ? data.quantity * data.costPerUnit : undefined,
          supplierName: data.supplierName,
          invoiceNumber: data.invoiceNumber,
          notes: data.notes,
          enteredBy: data.enteredBy,
        },
      })

      // Update current stock
      await tx.canteenInventoryItem.update({
        where: { id: data.inventoryItemId },
        data: {
          currentStock: { increment: data.quantity },
          ...(data.costPerUnit ? { costPerUnit: data.costPerUnit } : {}),
        },
      })

      return entry
    })

    revalidatePath("/dashboard/canteen/inventory")
    return { success: true, entry: result }
  } catch (error) {
    console.error("❌ ADD STOCK ENTRY ERROR:", error)
    return { success: false, error: error instanceof Error ? error.message : "Failed to add stock entry" }
  }
}

// ── DASHBOARD STATS ─────────────────────────

export async function getCanteenDashboardStats() {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const tomorrow = new Date(today)
  tomorrow.setDate(tomorrow.getDate() + 1)

  const [
    todayOrders,
    todayTokens,
    activeIpdDiets,
    mealSlots,
    todayMenu,
    lowStockItems,
  ] = await Promise.all([
    prisma.canteenMealOrder.findMany({
      where: { orderDate: { gte: today, lt: tomorrow } },
      include: { items: true, mealSlot: true },
    }),
    prisma.canteenToken.findMany({
      where: { issuedAt: { gte: today, lt: tomorrow } },
      include: { items: true },
    }),
    prisma.canteenPatientDiet.count({ where: { isActive: true } }),
    prisma.canteenMealSlot.findMany({ where: { isActive: true }, orderBy: { sortOrder: "asc" } }),
    prisma.canteenDailyMenu.findMany({
      where: { date: { gte: today, lt: tomorrow } },
      include: { mealSlot: true, menuItem: true },
    }),
    prisma.canteenInventoryItem.findMany({
      where: {
        isActive: true,
        currentStock: { lte: prisma.canteenInventoryItem.fields.minStockLevel as any },
      },
    }),
  ])

  const ipdRevenue = todayOrders.reduce((sum, o) => sum + o.totalAmount, 0)
  const walkinRevenue = todayTokens.reduce((sum, t) => sum + t.totalAmount, 0)

  const perSlotStats = mealSlots.map((slot) => {
    const slotOrders = todayOrders.filter((o) => o.mealSlotId === slot.id)
    const slotTokens = todayTokens.filter((t) => t.mealSlotId === slot.id)
    return {
      slot,
      ipdCount: slotOrders.length,
      walkinCount: slotTokens.length,
      totalServed: slotOrders.filter((o) => o.status === "SERVED").length + slotTokens.filter((t) => t.status === "SERVED").length,
      totalPending: slotOrders.filter((o) => o.status === "PENDING").length + slotTokens.filter((t) => t.status === "ISSUED").length,
    }
  })

  return {
    todayIpdOrders: todayOrders.length,
    todayWalkinTokens: todayTokens.length,
    activeIpdDiets,
    ipdRevenue,
    walkinRevenue,
    totalRevenue: ipdRevenue + walkinRevenue,
    perSlotStats,
    todayMenu,
    lowStockCount: lowStockItems.length,
  }
}

// ── IPD CANTEEN CHARGES (for discharge) ─────

export async function getAdmissionCanteenCharges(admissionId: string) {
  const orders = await prisma.canteenMealOrder.findMany({
    where: { admissionId, status: { not: "CANCELLED" } },
    include: { items: true, mealSlot: true },
    orderBy: { orderDate: "asc" },
  })

  const totalCharges = orders.reduce((sum, order) => sum + order.totalAmount, 0)
  return { orders, totalCharges }
}


