"use server"

import { prisma } from "@/lib/prisma"
import { revalidatePath } from "next/cache"
import { BillingStatus, InsuranceClaimStatus, PaymentMethod, Prisma } from "@prisma/client"
import { z } from "zod"
import { requireAuth, requireAuthSafe } from "@/lib/auth-guard"
import { type PaginationParams, getPaginationValues, paginatedResult } from "@/lib/pagination"
import { writeAuditLog } from "@/lib/audit"

// ============================================
// VALIDATION SCHEMAS
// ============================================

const updateClaimSchema = z.object({
  claimId: z.string().min(1, "Claim ID is required"),
  status: z.enum(["APPROVED", "REJECTED", "QUERY_RAISED", "UNDER_REVIEW", "IN_PROCESS", "SETTLED"]),
  approvedAmount: z.number().optional(),
  transactionRef: z.string().optional(),
  remarks: z.string().optional(),
})

// ============================================
// UPDATE CLAIM STATUS
// ============================================

export async function updateClaimStatus(formData: FormData) {
  const authResult = await requireAuthSafe(["SUPER_ADMIN", "ACCOUNTANT"])
  if (!authResult.ok) return { success: false, message: authResult.error }
  try {
    const rawData = {
      claimId: formData.get("claimId") as string,
      status: formData.get("status") as string,
      approvedAmount: formData.get("approvedAmount")
        ? parseFloat(formData.get("approvedAmount") as string)
        : undefined,
      transactionRef: (formData.get("transactionRef") as string) || undefined,
      remarks: (formData.get("remarks") as string) || undefined,
    }

    // Validate
    const parsed = updateClaimSchema.safeParse(rawData)
    if (!parsed.success) {
      const errors = parsed.error.flatten().fieldErrors
      const firstError = Object.values(errors).flat()[0] || "Validation failed"
      return { success: false, message: firstError }
    }

    const { claimId, status, approvedAmount, transactionRef, remarks } = parsed.data

    // Fetch the claim with its billing relation
    const claim = await prisma.insuranceClaim.findUnique({
      where: { id: claimId },
      include: {
        billing: true,
        policy: true,
      },
    })

    if (!claim) {
      return { success: false, message: "Claim not found" }
    }

    // Prevent updating already-settled claims
    if (claim.status === InsuranceClaimStatus.SETTLED) {
      return { success: false, message: "This claim has already been settled" }
    }

    // ── CRITICAL: If APPROVED and approvedAmount > 0, record a payment ──
    if (status === "APPROVED" && approvedAmount && approvedAmount > 0 && claim.billingId) {
      const billing = claim.billing!

      // Calculate new invoice amounts
      const newPaidAmount = billing.paidAmount + approvedAmount
      const newBalance = Math.max(0, billing.netAmount - newPaidAmount)

      // Determine new billing status
      let newBillingStatus: BillingStatus
      if (newBalance <= 0.01) {
        newBillingStatus = BillingStatus.PAID
      } else if (newPaidAmount > 0) {
        newBillingStatus = BillingStatus.PARTIALLY_PAID
      } else {
        newBillingStatus = BillingStatus.PENDING
      }

      // Execute atomically
      await prisma.$transaction(async (tx) => {
        // 1. Update the claim
        await tx.insuranceClaim.update({
          where: { id: claimId },
          data: {
            status: InsuranceClaimStatus.APPROVED,
            approvedAmount,
            remarks: remarks || null,
            updatedAt: new Date(),
          },
        })

        // 2. Create a Payment record on the linked invoice
        await tx.payment.create({
          data: {
            billingId: claim.billingId!,
            amount: approvedAmount,
            method: PaymentMethod.INSURANCE,
            paymentMethod: "INSURANCE",
            transactionId: transactionRef || null,
            reference: claim.claimNumber,
            notes: `Insurance claim ${claim.claimNumber} approved. Provider: ${claim.policy?.providerName || "N/A"}`,
            paymentDate: new Date(),
          },
        })

        // 3. Update the Invoice/Billing with new amounts
        await tx.billing.update({
          where: { id: claim.billingId! },
          data: {
            paidAmount: newPaidAmount,
            balanceAmount: newBalance,
            status: newBillingStatus,
          },
        })
      })

      console.log(
        `[INSURANCE] Claim ${claim.claimNumber} APPROVED for ₹${approvedAmount.toFixed(2)}. ` +
        `Invoice ${billing.billNumber}: new balance ₹${newBalance.toFixed(2)} (${newBillingStatus})`
      )
    } else {
      // Non-payment status update (REJECTED, QUERY_RAISED, UNDER_REVIEW, etc.)
      await prisma.insuranceClaim.update({
        where: { id: claimId },
        data: {
          status: status as InsuranceClaimStatus,
          approvedAmount: status === "APPROVED" ? approvedAmount : undefined,
          remarks: remarks || null,
          updatedAt: new Date(),
        },
      })

      console.log(`[INSURANCE] Claim ${claim.claimNumber} status updated to ${status}`)
    }

    // Revalidate pages
    revalidatePath("/dashboard/finance/insurance-tpa")
    revalidatePath("/dashboard/finance/billing")
    if (claim.billingId) {
      revalidatePath(`/dashboard/finance/billing/${claim.billingId}`)
    }
    revalidatePath("/dashboard")

    const statusMessages: Record<string, string> = {
      APPROVED: `Claim approved for ₹${approvedAmount?.toFixed(2) || "0.00"}. Payment recorded on the invoice.`,
      REJECTED: "Claim has been rejected.",
      QUERY_RAISED: "Query raised on the claim. Awaiting additional documents.",
      UNDER_REVIEW: "Claim moved to Under Review.",
      IN_PROCESS: "Claim is now In Process.",
      SETTLED: "Claim has been settled.",
    }

    writeAuditLog({ userId: authResult.session.userId, action: "UPDATE", module: "InsuranceClaim", recordId: claimId, changes: { status } })

    return {
      success: true,
      message: statusMessages[status] || `Claim status updated to ${status}.`,
    }
  } catch (error: unknown) {
    console.error("[ERROR] updateClaimStatus failed:", error)
    const message = error instanceof Error ? error.message : "Failed to update claim status"
    return { success: false, message }
  }
}

// ============================================
// GET ACTIVE CLAIMS (Pending / In-Process / Query Raised)
// ============================================

export async function getActiveClaims() {
  await requireAuth()
  try {
    const claims = await prisma.insuranceClaim.findMany({
      where: {
        status: {
          notIn: [
            InsuranceClaimStatus.APPROVED,
            InsuranceClaimStatus.REJECTED,
            InsuranceClaimStatus.SETTLED,
          ],
        },
      },
      include: {
        policy: {
          include: {
            patient: {
              include: {
                user: true,
              },
            },
          },
        },
        billing: true,
      },
      orderBy: { submittedAt: "desc" },
    })

    return { success: true, data: claims }
  } catch (error: unknown) {
    console.error("[ERROR] getActiveClaims failed:", error)
    const message = error instanceof Error ? error.message : "Failed to fetch claims"
    return { success: false, message, data: [] }
  }
}

// ============================================
// GET ALL CLAIMS (with optional status filter)
// ============================================

export async function getAllClaims(statusFilter?: string, params?: PaginationParams) {
  await requireAuth()
  try {
    const { page, limit, skip } = getPaginationValues(params)

    const where: Prisma.InsuranceClaimWhereInput = {}
    if (statusFilter && statusFilter !== "ALL") {
      where.status = statusFilter as InsuranceClaimStatus
    }

    const [claims, total] = await Promise.all([
      prisma.insuranceClaim.findMany({
        where,
        include: {
          policy: {
            include: {
              patient: {
                include: {
                  user: true,
                },
              },
            },
          },
          billing: true,
        },
        orderBy: { submittedAt: "desc" },
        skip,
        take: limit,
      }),
      prisma.insuranceClaim.count({ where }),
    ])

    return { success: true, ...paginatedResult(claims, total, page, limit) }
  } catch (error: unknown) {
    console.error("[ERROR] getAllClaims failed:", error)
    const message = error instanceof Error ? error.message : "Failed to fetch claims"
    return { success: false, message, data: [], total: 0, page: 1, limit: 20, totalPages: 0 }
  }
}

// ============================================
// GET CLAIM STATISTICS
// ============================================

export async function getClaimStats() {
  await requireAuth()
  try {
    const [submitted, underReview, inProcess, queryRaised, approved, rejected] = await Promise.all([
      prisma.insuranceClaim.count({ where: { status: InsuranceClaimStatus.SUBMITTED } }),
      prisma.insuranceClaim.count({ where: { status: InsuranceClaimStatus.UNDER_REVIEW } }),
      prisma.insuranceClaim.count({ where: { status: InsuranceClaimStatus.IN_PROCESS } }),
      prisma.insuranceClaim.count({ where: { status: InsuranceClaimStatus.QUERY_RAISED } }),
      prisma.insuranceClaim.count({ where: { status: InsuranceClaimStatus.APPROVED } }),
      prisma.insuranceClaim.count({ where: { status: InsuranceClaimStatus.REJECTED } }),
    ])

    const totalActive = submitted + underReview + inProcess + queryRaised

    // Sum of approved amounts
    const approvedSum = await prisma.insuranceClaim.aggregate({
      _sum: { approvedAmount: true },
      where: { status: InsuranceClaimStatus.APPROVED },
    })

    // Sum of pending claim amounts
    const pendingSum = await prisma.insuranceClaim.aggregate({
      _sum: { claimAmount: true },
      where: {
        status: {
          notIn: [InsuranceClaimStatus.APPROVED, InsuranceClaimStatus.REJECTED, InsuranceClaimStatus.SETTLED],
        },
      },
    })

    return {
      success: true,
      data: {
        submitted,
        underReview,
        inProcess,
        queryRaised,
        approved,
        rejected,
        totalActive,
        totalApprovedAmount: approvedSum._sum.approvedAmount || 0,
        totalPendingAmount: pendingSum._sum.claimAmount || 0,
      },
    }
  } catch (error: unknown) {
    console.error("[ERROR] getClaimStats failed:", error)
    return {
      success: false,
      message: "Failed to fetch stats",
      data: {
        submitted: 0,
        underReview: 0,
        inProcess: 0,
        queryRaised: 0,
        approved: 0,
        rejected: 0,
        totalActive: 0,
        totalApprovedAmount: 0,
        totalPendingAmount: 0,
      },
    }
  }
}
