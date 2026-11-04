"use server"

import { prisma } from "@/lib/prisma"
import { revalidatePath } from "next/cache"
import { InsuranceSchemeType, VerificationStatus } from "@prisma/client"
import { z } from "zod"
import { requireAuth, requireAuthSafe } from "@/lib/auth-guard"
import { writeAuditLog } from "@/lib/audit"

const verifyPolicySchema = z.object({
  policyNumber: z.string().min(1, "Policy number is required"),
  schemeType: z.enum(["PRIVATE", "PMJAY", "BSKY", "CGHS", "ECHS"]),
  providerName: z.string().min(1, "Provider name is required"),
  providerContact: z.string().optional(),
  tpaName: z.string().optional(),
  tpaId: z.string().optional(),
  healthCardNumber: z.string().optional(),
  policyType: z.string().optional(),
  corporateName: z.string().optional(),
  employeeId: z.string().optional(),
  coverageAmount: z.number().min(0, "Coverage amount must be positive"),
  balanceAvailable: z.number().optional(),
  startDate: z.string().min(1, "Start date is required"),
  endDate: z.string().min(1, "End date is required"),
  roomRentCap: z.number().optional(),
  roomRentCapType: z.string().optional(),
  icuRentCap: z.number().optional(),
  copayPercentage: z.number().optional(),
  deductibleAmount: z.number().optional(),
  deductibleType: z.string().optional(),
  subLimits: z.any().optional(),
  ayushmanId: z.string().optional(),
  abhaNumber: z.string().optional(),
  pmjayFamilyId: z.string().optional(),
  bskyCardNumber: z.string().optional(),
  isNetworkHospital: z.boolean().optional(),
})

export async function verifyInsurancePolicy(formData: FormData) {
  const authResult = await requireAuthSafe(["SUPER_ADMIN", "ACCOUNTANT", "RECEPTIONIST"])
  if (!authResult.ok) return { success: false, message: authResult.error }

  try {
    const policyNumber = formData.get("policyNumber") as string

    const existing = await prisma.insurancePolicy.findUnique({
      where: { policyNumber },
      include: {
        patient: { include: { user: true } },
        claims: { where: { status: { in: ["SUBMITTED", "UNDER_REVIEW", "IN_PROCESS", "APPROVED"] } } },
      },
    })

    if (existing) {
      const now = new Date()
      const isExpired = new Date(existing.endDate) < now
      const isActive = existing.isActive && !isExpired

      const totalClaimedAmount = existing.claims.reduce(
        (sum, c) => sum + (c.approvedAmount || c.claimAmount),
        0
      )
      const balanceAvailable = Math.max(0, existing.coverageAmount - totalClaimedAmount)

      return {
        success: true,
        message: isActive ? "Policy verified successfully" : "Policy found but is expired/inactive",
        data: {
          isExistingPolicy: true,
          policyId: existing.id,
          patientId: existing.patientId,
          patientName: existing.patient?.user?.name || "Unknown",
          policyNumber: existing.policyNumber,
          schemeType: existing.schemeType,
          providerName: existing.providerName,
          tpaName: existing.tpaName,
          coverageAmount: existing.coverageAmount,
          balanceAvailable,
          startDate: existing.startDate,
          endDate: existing.endDate,
          isActive,
          isExpired,
          copayPercentage: existing.copayPercentage,
          roomRentCap: existing.roomRentCap,
          deductibleAmount: existing.deductibleAmount,
          verificationStatus: existing.verificationStatus,
        },
      }
    }

    return {
      success: true,
      message: "Policy not found in system. You can register it as a new policy.",
      data: { isExistingPolicy: false, policyNumber },
    }
  } catch (error: unknown) {
    console.error("[ERROR] verifyInsurancePolicy:", error)
    const message = error instanceof Error ? error.message : "Verification failed"
    return { success: false, message }
  }
}

export async function verifyPmjayBeneficiary(formData: FormData) {
  const authResult = await requireAuthSafe(["SUPER_ADMIN", "ACCOUNTANT", "RECEPTIONIST"])
  if (!authResult.ok) return { success: false, message: authResult.error }

  try {
    const ayushmanId = formData.get("ayushmanId") as string
    const abhaNumber = formData.get("abhaNumber") as string

    const existing = await prisma.insurancePolicy.findFirst({
      where: {
        schemeType: "PMJAY",
        OR: [
          { ayushmanId: ayushmanId || undefined },
          { abhaNumber: abhaNumber || undefined },
        ],
      },
      include: { patient: { include: { user: true } } },
    })

    if (existing) {
      return {
        success: true,
        message: "PMJAY beneficiary found",
        data: {
          isExistingPolicy: true,
          policyId: existing.id,
          patientId: existing.patientId,
          patientName: existing.patient?.user?.name || "Unknown",
          ayushmanId: existing.ayushmanId,
          abhaNumber: existing.abhaNumber,
          coverageAmount: existing.coverageAmount,
          balanceAvailable: existing.balanceAvailable ?? existing.coverageAmount,
          isActive: existing.isActive,
        },
      }
    }

    return {
      success: true,
      message: "Beneficiary not found in system. Proceed with new registration.",
      data: {
        isExistingPolicy: false,
        ayushmanId: ayushmanId || null,
        abhaNumber: abhaNumber || null,
        coverageAmount: 500000,
        balanceAvailable: 500000,
      },
    }
  } catch (error: unknown) {
    console.error("[ERROR] verifyPmjayBeneficiary:", error)
    const message = error instanceof Error ? error.message : "PMJAY verification failed"
    return { success: false, message }
  }
}

export async function verifyBskyBeneficiary(formData: FormData) {
  const authResult = await requireAuthSafe(["SUPER_ADMIN", "ACCOUNTANT", "RECEPTIONIST"])
  if (!authResult.ok) return { success: false, message: authResult.error }

  try {
    const bskyCardNumber = formData.get("bskyCardNumber") as string
    const aadharNumber = formData.get("aadharNumber") as string

    const existingPolicy = await prisma.insurancePolicy.findFirst({
      where: { schemeType: "BSKY", bskyCardNumber },
      include: { patient: { include: { user: true } } },
    })

    if (existingPolicy) {
      return {
        success: true,
        message: "BSKY beneficiary found",
        data: {
          isExistingPolicy: true,
          policyId: existingPolicy.id,
          patientId: existingPolicy.patientId,
          patientName: existingPolicy.patient?.user?.name || "Unknown",
          bskyCardNumber,
          coverageAmount: existingPolicy.coverageAmount,
          balanceAvailable: existingPolicy.balanceAvailable ?? existingPolicy.coverageAmount,
          isActive: existingPolicy.isActive,
        },
      }
    }

    const existingPatient = aadharNumber
      ? await prisma.patient.findFirst({
          where: { OR: [{ bskyNumber: bskyCardNumber }, { aadharNumber }] },
          include: { user: true },
        })
      : null

    return {
      success: true,
      message: existingPatient
        ? "Patient found by Aadhaar/BSKY but no active BSKY policy. You can create one."
        : "Beneficiary not found. Proceed with new registration.",
      data: {
        isExistingPolicy: false,
        bskyCardNumber,
        patientId: existingPatient?.id || null,
        patientName: existingPatient?.user?.name || null,
        coverageAmount: 500000,
        balanceAvailable: 500000,
      },
    }
  } catch (error: unknown) {
    console.error("[ERROR] verifyBskyBeneficiary:", error)
    const message = error instanceof Error ? error.message : "BSKY verification failed"
    return { success: false, message }
  }
}

export async function createInsurancePolicyRecord(formData: FormData) {
  const authResult = await requireAuthSafe(["SUPER_ADMIN", "ACCOUNTANT", "RECEPTIONIST"])
  if (!authResult.ok) return { success: false, message: authResult.error }

  try {
    const rawData = {
      policyNumber: formData.get("policyNumber") as string,
      schemeType: formData.get("schemeType") as string,
      providerName: formData.get("providerName") as string,
      providerContact: (formData.get("providerContact") as string) || undefined,
      tpaName: (formData.get("tpaName") as string) || undefined,
      tpaId: (formData.get("tpaId") as string) || undefined,
      healthCardNumber: (formData.get("healthCardNumber") as string) || undefined,
      policyType: (formData.get("policyType") as string) || undefined,
      corporateName: (formData.get("corporateName") as string) || undefined,
      employeeId: (formData.get("employeeIdField") as string) || undefined,
      coverageAmount: parseFloat(formData.get("coverageAmount") as string) || 0,
      balanceAvailable: parseFloat(formData.get("balanceAvailable") as string) || undefined,
      startDate: formData.get("startDate") as string,
      endDate: formData.get("endDate") as string,
      roomRentCap: parseFloat(formData.get("roomRentCap") as string) || undefined,
      roomRentCapType: (formData.get("roomRentCapType") as string) || undefined,
      icuRentCap: parseFloat(formData.get("icuRentCap") as string) || undefined,
      copayPercentage: parseFloat(formData.get("copayPercentage") as string) || undefined,
      deductibleAmount: parseFloat(formData.get("deductibleAmount") as string) || undefined,
      deductibleType: (formData.get("deductibleType") as string) || undefined,
      ayushmanId: (formData.get("ayushmanId") as string) || undefined,
      abhaNumber: (formData.get("abhaNumber") as string) || undefined,
      pmjayFamilyId: (formData.get("pmjayFamilyId") as string) || undefined,
      bskyCardNumber: (formData.get("bskyCardNumber") as string) || undefined,
      isNetworkHospital: formData.get("isNetworkHospital") === "true",
    }

    const parsed = verifyPolicySchema.safeParse(rawData)
    if (!parsed.success) {
      const errors = parsed.error.flatten().fieldErrors
      const firstError = Object.values(errors).flat()[0] || "Validation failed"
      return { success: false, message: firstError }
    }

    const patientId = formData.get("patientId") as string
    if (!patientId) {
      return { success: false, message: "Patient ID is required to create a policy" }
    }

    const policy = await prisma.insurancePolicy.create({
      data: {
        patientId,
        policyNumber: parsed.data.policyNumber,
        schemeType: parsed.data.schemeType as InsuranceSchemeType,
        providerName: parsed.data.providerName,
        providerContact: parsed.data.providerContact || null,
        tpaName: parsed.data.tpaName || null,
        tpaId: parsed.data.tpaId || null,
        healthCardNumber: parsed.data.healthCardNumber || null,
        policyType: parsed.data.policyType || null,
        corporateName: parsed.data.corporateName || null,
        employeeId: parsed.data.employeeId || null,
        coverageAmount: parsed.data.coverageAmount,
        balanceAvailable: parsed.data.balanceAvailable ?? parsed.data.coverageAmount,
        startDate: new Date(parsed.data.startDate),
        endDate: new Date(parsed.data.endDate),
        roomRentCap: parsed.data.roomRentCap || null,
        roomRentCapType: parsed.data.roomRentCapType || null,
        icuRentCap: parsed.data.icuRentCap || null,
        copayPercentage: parsed.data.copayPercentage || 0,
        deductibleAmount: parsed.data.deductibleAmount || 0,
        deductibleType: parsed.data.deductibleType || null,
        ayushmanId: parsed.data.ayushmanId || null,
        abhaNumber: parsed.data.abhaNumber || null,
        pmjayFamilyId: parsed.data.pmjayFamilyId || null,
        bskyCardNumber: parsed.data.bskyCardNumber || null,
        isNetworkHospital: parsed.data.isNetworkHospital ?? true,
        verificationStatus: VerificationStatus.VERIFIED,
        verifiedAt: new Date(),
      },
    })

    revalidatePath("/dashboard/insurance/policies")
    revalidatePath("/dashboard/insurance/verify")
    revalidatePath("/dashboard/insurance/pre-auth/create")
    revalidatePath("/dashboard/insurance/pre-auth")

    writeAuditLog({ userId: authResult.session.userId, action: "CREATE", module: "InsurancePolicy", changes: {} })

    return {
      success: true,
      message: "Insurance policy created successfully",
      data: { policyId: policy.id },
    }
  } catch (error: unknown) {
    console.error("[ERROR] createInsurancePolicyRecord:", error)
    const message = error instanceof Error ? error.message : "Failed to create policy"
    return { success: false, message }
  }
}

export async function registerPatientWithInsurance(formData: FormData) {
  const authResult = await requireAuthSafe(["SUPER_ADMIN", "ACCOUNTANT", "RECEPTIONIST"])
  if (!authResult.ok) return { success: false, message: authResult.error }

  try {
    const name = formData.get("name") as string
    const email = formData.get("email") as string
    const phone = formData.get("phone") as string
    const gender = formData.get("gender") as string
    const dateOfBirth = formData.get("dateOfBirth") as string
    const address = formData.get("address") as string
    const city = formData.get("city") as string
    const state = formData.get("state") as string
    const pincode = formData.get("pincode") as string
    const aadharNumber = formData.get("aadharNumber") as string
    const bloodGroup = formData.get("bloodGroup") as string
    const policyId = formData.get("policyId") as string
    const schemeType = (formData.get("schemeType") as string) || "SELF_PAY"
    const fatherOrHusbandName = formData.get("fatherOrHusbandName") as string
    const maritalStatus = formData.get("maritalStatus") as string
    const occupation = formData.get("occupation") as string
    const emergencyContact = formData.get("emergencyContact") as string
    const emergencyContactName = formData.get("emergencyContactName") as string
    const emergencyContactRelation = formData.get("emergencyContactRelation") as string
    const allergies = formData.get("allergies") as string
    const currentMedications = formData.get("currentMedications") as string

    const existingPatientId = formData.get("existingPatientId") as string

    if (!name) {
      return { success: false, message: "Name is required" }
    }

    const currentYear = new Date().getFullYear()
    const patientCount = await prisma.patient.count()
    const patientIdStr = `PAT-${currentYear}-${String(patientCount + 1).padStart(4, "0")}`

    const uniqueEmail = email || `patient_${Date.now()}@hospital.local`

    const result = await prisma.$transaction(async (tx) => {
      let user;
      let patient;

      if (existingPatientId) {
        patient = await tx.patient.findUnique({ where: { id: existingPatientId }, include: { user: true } });
        if (!patient) throw new Error("Existing patient not found");
        
        user = await tx.user.update({
          where: { id: patient.userId },
          data: {
            name,
            email: email || patient.user.email,
            phone,
          }
        });

        patient = await tx.patient.update({
          where: { id: existingPatientId },
          data: {
            dateOfBirth: dateOfBirth ? new Date(dateOfBirth) : patient.dateOfBirth,
            gender: gender ? (gender as "MALE" | "FEMALE" | "OTHER") : patient.gender,
            bloodGroup: bloodGroup || patient.bloodGroup,
            phone,
            address: address || patient.address,
            city: city || patient.city,
            state: state || patient.state,
            pincode: pincode || patient.pincode,
            aadharNumber: aadharNumber || patient.aadharNumber,
            fatherOrHusbandName: fatherOrHusbandName || patient.fatherOrHusbandName,
            maritalStatus: maritalStatus || patient.maritalStatus,
            occupation: occupation || patient.occupation,
            emergencyContact: emergencyContact || patient.emergencyContact,
            emergencyContactName: emergencyContactName || patient.emergencyContactName,
            emergencyContactRelation: emergencyContactRelation || patient.emergencyContactRelation,
            allergies: allergies || patient.allergies,
            currentMedications: currentMedications || patient.currentMedications,
            isBsky: schemeType === "BSKY" ? true : patient.isBsky,
            bskyNumber: schemeType === "BSKY" ? (formData.get("bskyCardNumber") as string) : patient.bskyNumber,
          }
        });
      } else {
        user = await tx.user.create({
          data: {
            name,
            email: uniqueEmail,
            phone,
            role: "PATIENT",
            password: "",
          },
        })

        patient = await tx.patient.create({
          data: {
            userId: user.id,
            patientId: patientIdStr,
            dateOfBirth: dateOfBirth ? new Date(dateOfBirth) : null,
            gender: gender ? (gender as "MALE" | "FEMALE" | "OTHER") : null,
            bloodGroup: bloodGroup || null,
            phone: phone || null,
            address: address || null,
            city: city || null,
            state: state || null,
            pincode: pincode || null,
            aadharNumber: aadharNumber || null,
            fatherOrHusbandName: fatherOrHusbandName || null,
            maritalStatus: maritalStatus || null,
            occupation: occupation || null,
            emergencyContact: emergencyContact || null,
            emergencyContactName: emergencyContactName || null,
            emergencyContactRelation: emergencyContactRelation || null,
            allergies: allergies || null,
            currentMedications: currentMedications || null,
            isBsky: schemeType === "BSKY",
            bskyNumber: schemeType === "BSKY" ? (formData.get("bskyCardNumber") as string) : null,
          },
        })
      }

      if (policyId) {
        await tx.insurancePolicy.update({
          where: { id: policyId },
          data: { patientId: patient.id },
        })
      }

      return { user, patient }
    })

    revalidatePath("/dashboard/insurance/verify")
    revalidatePath("/dashboard/admin/users")
    revalidatePath("/dashboard/insurance/pre-auth/create")
    revalidatePath("/dashboard/insurance/pre-auth")

    writeAuditLog({ userId: authResult.session.userId, action: "CREATE", module: "PatientInsurance", recordId: result.patient.id, changes: { patientId: result.patient.patientId } })

    return {
      success: true,
      message: `Patient ${result.patient.patientId} registered successfully${policyId ? " with insurance linked" : ""}`,
      data: {
        patientId: result.patient.id,
        patientIdStr: result.patient.patientId,
        userId: result.user.id,
      },
    }
  } catch (error: unknown) {
    console.error("[ERROR] registerPatientWithInsurance:", error)
    const message = error instanceof Error ? error.message : "Failed to register patient"
    return { success: false, message }
  }
}

export async function getInsurancePolicies(params?: { page?: number; limit?: number; schemeType?: string; search?: string }) {
  await requireAuth()
  try {
    const page = params?.page || 1
    const limit = params?.limit || 20
    const skip = (page - 1) * limit

    const where: any = {}
    if (params?.schemeType && params.schemeType !== "ALL") {
      where.schemeType = params.schemeType
    }
    if (params?.search) {
      where.OR = [
        { policyNumber: { contains: params.search, mode: "insensitive" } },
        { providerName: { contains: params.search, mode: "insensitive" } },
        { patient: { user: { name: { contains: params.search, mode: "insensitive" } } } },
      ]
    }

    const [policies, total] = await Promise.all([
      prisma.insurancePolicy.findMany({
        where,
        include: {
          patient: { include: { user: true } },
          _count: { select: { claims: true, preAuthorizations: true } },
        },
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
      }),
      prisma.insurancePolicy.count({ where }),
    ])

    return {
      success: true,
      data: policies,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    }
  } catch (error: unknown) {
    console.error("[ERROR] getInsurancePolicies:", error)
    return { success: false, data: [], total: 0, page: 1, limit: 20, totalPages: 0 }
  }
}

export async function getTariffsByCategory(category?: string) {
  await requireAuth()
  try {
    const where: any = { isActive: true }
    if (category) where.category = category
    const tariffs = await prisma.tariffMaster.findMany({
      where,
      orderBy: [{ category: "asc" }, { description: "asc" }],
    })
    return { success: true, data: tariffs }
  } catch (error: unknown) {
    return { success: false, data: [], message: "Failed to fetch tariffs" }
  }
}
