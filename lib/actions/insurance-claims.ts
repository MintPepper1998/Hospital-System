"use server"

import { prisma } from "@/lib/prisma"
import { revalidatePath } from "next/cache"
import { BillingStatus, InsuranceClaimStatus, InsuranceClaimType, PaymentMethod, Prisma } from "@prisma/client"
import { z } from "zod"
import { requireAuth, requireAuthSafe } from "@/lib/auth-guard"
import { type PaginationParams, getPaginationValues, paginatedResult } from "@/lib/pagination"
import { writeAuditLog } from "@/lib/audit"

export async function createCashlessClaim(formData: FormData) {
  const authResult = await requireAuthSafe(["SUPER_ADMIN", "ACCOUNTANT"])
  if (!authResult.ok) return { success: false, message: authResult.error }

  try {
    const policyId = formData.get("policyId") as string
    const billingId = formData.get("billingId") as string
    const preAuthId = (formData.get("preAuthId") as string) || null
    const claimAmount = parseFloat(formData.get("claimAmount") as string)

    if (!policyId || !claimAmount) {
      return { success: false, message: "Policy ID and claim amount are required" }
    }

    const currentYear = new Date().getFullYear()
    const count = await prisma.insuranceClaim.count()
    const claimNumber = `CLM-${currentYear}-${String(count + 1).padStart(5, "0")}`

    const claim = await prisma.insuranceClaim.create({
      data: {
        policyId,
        billingId: billingId || null,
        preAuthId,
        claimNumber,
        claimType: InsuranceClaimType.CASHLESS,
        claimAmount,
        status: InsuranceClaimStatus.SUBMITTED,
        submittedAt: new Date(),
      },
    })

    revalidatePath("/dashboard/insurance/claims/cashless")
    revalidatePath("/dashboard/finance/insurance-tpa")
    writeAuditLog({ userId: authResult.session.userId, action: "CREATE", module: "CashlessClaim", recordId: claim.id, changes: {} })

    return {
      success: true,
      message: `Cashless claim ${claimNumber} submitted`,
      data: { claimId: claim.id, claimNumber },
    }
  } catch (error: unknown) {
    console.error("[ERROR] createCashlessClaim:", error)
    const message = error instanceof Error ? error.message : "Failed to create claim"
    return { success: false, message }
  }
}

export async function createReimbursementClaim(formData: FormData) {
  const authResult = await requireAuthSafe(["SUPER_ADMIN", "ACCOUNTANT", "RECEPTIONIST"])
  if (!authResult.ok) return { success: false, message: authResult.error }

  try {
    const policyId = formData.get("policyId") as string
    const billingId = (formData.get("billingId") as string) || null
    const claimAmount = parseFloat(formData.get("claimAmount") as string)
    const bankAccountNumber = (formData.get("bankAccountNumber") as string) || null
    const bankName = (formData.get("bankName") as string) || null
    const bankIfsc = (formData.get("bankIfsc") as string) || null
    const panNumber = (formData.get("panNumber") as string) || null

    if (!policyId || !claimAmount) {
      return { success: false, message: "Policy ID and claim amount are required" }
    }

    const currentYear = new Date().getFullYear()
    const count = await prisma.insuranceClaim.count()
    const claimNumber = `RMB-${currentYear}-${String(count + 1).padStart(5, "0")}`

    const claim = await prisma.insuranceClaim.create({
      data: {
        policyId,
        billingId,
        claimNumber,
        claimType: InsuranceClaimType.REIMBURSEMENT,
        claimAmount,
        status: InsuranceClaimStatus.SUBMITTED,
        bankAccountNumber,
        bankName,
        bankIfsc,
        panNumber,
        submittedAt: new Date(),
      },
    })

    revalidatePath("/dashboard/insurance/claims/reimbursement")
    writeAuditLog({ userId: authResult.session.userId, action: "CREATE", module: "ReimbursementClaim", recordId: claim.id, changes: {} })

    return {
      success: true,
      message: `Reimbursement claim ${claimNumber} submitted`,
      data: { claimId: claim.id, claimNumber },
    }
  } catch (error: unknown) {
    console.error("[ERROR] createReimbursementClaim:", error)
    const message = error instanceof Error ? error.message : "Failed to create reimbursement claim"
    return { success: false, message }
  }
}

export async function calculatePatientLiability(claimId: string) {
  const authResult = await requireAuthSafe(["SUPER_ADMIN", "ACCOUNTANT"])
  if (!authResult.ok) return { success: false, message: authResult.error }

  try {
    const claim = await prisma.insuranceClaim.findUnique({
      where: { id: claimId },
      include: {
        policy: true,
        billing: true,
      },
    })

    if (!claim) return { success: false, message: "Claim not found" }
    if (!claim.billing) return { success: false, message: "No billing linked to this claim" }

    const totalBill = claim.billing.netAmount
    const approvedAmount = claim.approvedAmount || 0
    const copayPercentage = claim.policy.copayPercentage || 0
    const deductible = claim.policy.deductibleAmount || 0

    const copayAmount = approvedAmount * (copayPercentage / 100)
    const effectiveInsurancePay = Math.max(0, approvedAmount - copayAmount - deductible)
    const patientLiability = Math.max(0, totalBill - effectiveInsurancePay)

    await prisma.insuranceClaim.update({
      where: { id: claimId },
      data: {
        copayAmount: copayAmount > 0 ? copayAmount : null,
        deductibleApplied: deductible > 0 ? deductible : null,
        totalPatientLiability: patientLiability,
      },
    })

    return {
      success: true,
      data: {
        totalBill,
        approvedAmount,
        copayAmount,
        deductible,
        effectiveInsurancePay,
        patientLiability,
      },
    }
  } catch (error: unknown) {
    console.error("[ERROR] calculatePatientLiability:", error)
    return { success: false, message: "Failed to calculate liability" }
  }
}

export async function getCashlessClaims(statusFilter?: string, params?: PaginationParams) {
  await requireAuth()
  try {
    const { page, limit, skip } = getPaginationValues(params)
    const where: Prisma.InsuranceClaimWhereInput = { claimType: "CASHLESS" }
    if (statusFilter && statusFilter !== "ALL") {
      where.status = statusFilter as InsuranceClaimStatus
    }

    const [claims, total] = await Promise.all([
      prisma.insuranceClaim.findMany({
        where,
        include: {
          policy: { include: { patient: { include: { user: true } } } },
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
    console.error("[ERROR] getCashlessClaims:", error)
    return { success: false, data: [], total: 0, page: 1, limit: 20, totalPages: 0 }
  }
}

export async function getReimbursementClaims(statusFilter?: string, params?: PaginationParams) {
  await requireAuth()
  try {
    const { page, limit, skip } = getPaginationValues(params)
    const where: Prisma.InsuranceClaimWhereInput = { claimType: "REIMBURSEMENT" }
    if (statusFilter && statusFilter !== "ALL") {
      where.status = statusFilter as InsuranceClaimStatus
    }

    const [claims, total] = await Promise.all([
      prisma.insuranceClaim.findMany({
        where,
        include: {
          policy: { include: { patient: { include: { user: true } } } },
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
    console.error("[ERROR] getReimbursementClaims:", error)
    return { success: false, data: [], total: 0, page: 1, limit: 20, totalPages: 0 }
  }
}
