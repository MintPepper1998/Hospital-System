"use server"

import { prisma } from "@/lib/prisma"
import { requireAuthSafe } from "@/lib/auth-guard"

export async function getMedicineOutReport(startDateStr: string, endDateStr: string) {
  try {
    const authResult = await requireAuthSafe(["SUPER_ADMIN", "PHARMACIST"])
    if (!authResult.ok) return { success: false, message: "Unauthorized" }

    // Parse date and create start/end boundaries
    const startOfDay = new Date(startDateStr)
    startOfDay.setHours(0, 0, 0, 0)
    
    const endOfDay = new Date(endDateStr)
    endOfDay.setHours(23, 59, 59, 999)

    const billingItems = await prisma.billingItem.findMany({
      where: {
        billing: {
          type: "PHARMACY",
          // Exclude refunded and cancelled bills
          status: { notIn: ["REFUNDED", "CANCELLED"] },
          billDate: {
            gte: startOfDay,
            lte: endOfDay,
          },
        },
        serviceCategory: "PHARMACY", // Only medicine items, not lab tests
      },
      include: {
        billing: {
          include: {
            patient: {
              include: {
                user: true,
              },
            },
            // Include approved sales returns to subtract returned quantities
            salesReturns: {
              where: { refundStatus: "APPROVED" },
              include: { items: true },
            },
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    })

    // Build a map of billingItemId → total returned quantity from approved returns
    // SalesReturnItem.medicineId stores the batch ID (= BillingItem.referenceId)
    // We need to match by billing + batchId + itemName
    const returnedQtyByBillingAndBatch: Record<string, number> = {}
    for (const item of billingItems) {
      for (const sr of item.billing.salesReturns) {
        for (const srItem of sr.items) {
          // Match return item to billing item by batchId (medicineId = referenceId)
          if (srItem.medicineId === item.referenceId) {
            const key = `${item.billing.id}_${item.referenceId}_${item.id}`
            returnedQtyByBillingAndBatch[key] = (returnedQtyByBillingAndBatch[key] || 0) + srItem.quantity
          }
        }
      }
    }

    const formattedData = billingItems
      .map((item) => {
        const key = `${item.billing.id}_${item.referenceId}_${item.id}`
        const returnedQty = returnedQtyByBillingAndBatch[key] || 0
        const effectiveQty = item.quantity - returnedQty

        // Skip items that are fully returned
        if (effectiveQty <= 0) return null

        // Extract medicine name from description (e.g. "Medicine Name (Batch: X) - Y unit(s)")
        let medicineName = item.description
        const match = medicineName.match(/^(.*?)\s*\(Batch:/i)
        if (match) {
          medicineName = match[1].trim()
        }

        // Determine customer type
        let customerType = "Patient"
        if (item.billing.notes?.includes("Walk-In") || !item.billing.patientId) {
          customerType = "Walk-In Customer"
        } else if (item.billing.emergencyVisitId) {
          customerType = "ER Patient"
        } else if (item.billing.appointmentId) {
          customerType = "OPD Patient"
        }

        const patientName =
          customerType === "Walk-In Customer"
            ? "Walk-In"
            : item.billing.patient?.user?.name || "Unknown Patient"

        // Calculate amounts based on effective (net-of-return) quantity
        const ratio = effectiveQty / item.quantity
        const itemMrpTotal = item.unitPrice * effectiveQty
        const effectiveGstAmount = Math.round(item.gstAmount * ratio * 100) / 100
        const effectiveTotalAmount = Math.round(item.totalAmount * ratio * 100) / 100

        // Calculate per-item share of bill discount
        const billDiscountAmount = item.billing.discountAmount || 0
        const billTotalAmount = item.billing.totalAmount || 1
        const itemDiscountShare = billTotalAmount > 0
          ? Math.round((itemMrpTotal / billTotalAmount) * billDiscountAmount * 100) / 100
          : 0
        const sellPriceAfterDiscount = Math.round((effectiveTotalAmount - itemDiscountShare) * 100) / 100

        return {
          id: item.id,
          medicineName,
          unitsSold: effectiveQty,
          returnedUnits: returnedQty,
          customerName: patientName,
          customerType,
          paymentMethod: item.billing.paymentMethod || "N/A",
          // Pricing
          mrpPerUnit: item.unitPrice,
          mrpTotal: itemMrpTotal,
          gstRate: item.gstRate,
          gstAmount: effectiveGstAmount,
          totalAmount: effectiveTotalAmount,
          discountAmount: itemDiscountShare,
          sellPriceAfterDiscount,
          billDate: item.billing.billDate,
          billNumber: item.billing.billNumber,
        }
      })
      .filter(Boolean) as any[]

    // Compute summary stats
    const summary = {
      totalUnitsSold: formattedData.reduce((s, i) => s + i.unitsSold, 0),
      totalMRP: formattedData.reduce((s, i) => s + i.mrpTotal, 0),
      totalGST: formattedData.reduce((s, i) => s + i.gstAmount, 0),
      totalGrossAmount: formattedData.reduce((s, i) => s + i.totalAmount, 0),
      totalDiscount: formattedData.reduce((s, i) => s + i.discountAmount, 0),
      totalSellPrice: formattedData.reduce((s, i) => s + i.sellPriceAfterDiscount, 0),
      totalTransactions: new Set(formattedData.map(i => i.billNumber)).size,
      uniqueMedicines: new Set(formattedData.map(i => i.medicineName)).size,
    }

    return { success: true, data: formattedData, summary }
  } catch (error: any) {
    console.error("[ERROR] getMedicineOutByDate failed:", error)
    return { success: false, message: "Failed to fetch medicine out records" }
  }
}
