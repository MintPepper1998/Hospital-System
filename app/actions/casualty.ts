"use server"

import { prisma } from "@/lib/prisma"
import { hash } from "bcryptjs"
import { revalidatePath } from "next/cache"
import { requireAuth, requireAuthSafe } from "@/lib/auth-guard"
import { writeAuditLog } from "@/lib/audit"
import { CasualtyStatus, AppointmentStatus, BillingType, BillingStatus, Gender } from "@prisma/client"
import { getCurrentAppointmentTimeIST } from "@/lib/timezone"

// ──────────────────────────────────────────────────
// Helper: Collision-free sequential bill number generator
// ──────────────────────────────────────────────────
async function generateUniqueBillNumber(
  prefix: string,
  year: number,
  padDigits: number = 4,
  db: any = prisma
): Promise<string> {
  const pattern = `${prefix}-${year}-`
  const existingBills = await db.billing.findMany({
    where: { billNumber: { startsWith: pattern } },
    select: { billNumber: true },
  })

  let maxSeq = 0
  const existingSet = new Set<string>()

  for (const b of existingBills) {
    existingSet.add(b.billNumber)
    const parts = b.billNumber.split("-")
    const seqStr = parts[parts.length - 1]
    const seq = parseInt(seqStr, 10)
    if (!isNaN(seq) && seq > maxSeq) {
      maxSeq = seq
    }
  }

  let candidateSeq = maxSeq + 1
  let candidate = `${prefix}-${year}-${String(candidateSeq).padStart(padDigits, "0")}`

  while (existingSet.has(candidate)) {
    candidateSeq++
    candidate = `${prefix}-${year}-${String(candidateSeq).padStart(padDigits, "0")}`
  }

  let dbCheck = await db.billing.findUnique({
    where: { billNumber: candidate },
    select: { id: true },
  })

  while (dbCheck) {
    candidateSeq++
    candidate = `${prefix}-${year}-${String(candidateSeq).padStart(padDigits, "0")}`
    dbCheck = await db.billing.findUnique({
      where: { billNumber: candidate },
      select: { id: true },
    })
  }

  return candidate
}

// ──────────────────────────────────────────────────
// 1. Register / Admit a patient to Casualty
// ──────────────────────────────────────────────────
export async function registerCasualtyPatient(data: {
  patientId?: string
  unknownName?: string
  gender?: "MALE" | "FEMALE" | "OTHER"
  ageStr?: string
  chiefComplaint?: string
  vitals?: string
  assignedDoctorId?: string
}) {
  await requireAuth(["SUPER_ADMIN", "ADMIN", "RECEPTIONIST", "DOCTOR", "NURSE"])

  let finalPatientId = data.patientId

  // Create temporary patient if unknown
  if (!finalPatientId) {
    const timestamp = Date.now().toString().slice(-6)
    const tempName = data.unknownName || `Unknown Patient (CAS-${timestamp})`

    const tempUser = await prisma.user.create({
      data: {
        email: `cas.temp.${timestamp}@hospital.local`,
        name: tempName,
        role: "PATIENT",
        isActive: true,
      },
    })

    const count = await prisma.patient.count()
    const generatedPatId = `PAT-CAS-${new Date().getFullYear()}-${(count + 1)
      .toString()
      .padStart(4, "0")}-${timestamp}`

    const newPatient = await prisma.patient.create({
      data: {
        userId: tempUser.id,
        patientId: generatedPatId,
        gender: data.gender,
        dateOfBirth: data.ageStr
          ? new Date(new Date().setFullYear(new Date().getFullYear() - parseInt(data.ageStr)))
          : null,
      },
    })

    finalPatientId = newPatient.id
  }

  const visit = await prisma.casualtyVisit.create({
    data: {
      patientId: finalPatientId!,
      chiefComplaint: data.chiefComplaint,
      vitals: data.vitals,
      assignedDoctorId: data.assignedDoctorId || undefined,
      status: "ADMITTED",
    },
  })

  revalidatePath("/dashboard/casualty")
  writeAuditLog({
    userId: "system",
    action: "CREATE",
    module: "CasualtyVisit",
    recordId: visit.id,
    changes: { patientId: finalPatientId, chiefComplaint: data.chiefComplaint },
  })
  return { success: true, visitId: visit.id, patientId: finalPatientId }
}

// ──────────────────────────────────────────────────
// 2. Add a procedure to a casualty visit
// ──────────────────────────────────────────────────
export async function addCasualtyProcedure(data: {
  casualtyVisitId: string
  name: string
  category: string
  description?: string
  quantity: number
  unitPrice: number
  performedBy?: string
}) {
  await requireAuth(["SUPER_ADMIN", "ADMIN", "DOCTOR", "NURSE"])

  const procedure = await prisma.casualtyProcedure.create({
    data: {
      casualtyVisitId: data.casualtyVisitId,
      name: data.name,
      category: data.category,
      description: data.description,
      quantity: data.quantity,
      unitPrice: data.unitPrice,
      performedBy: data.performedBy,
    },
  })

  // Mark as TREATING if still ADMITTED
  await prisma.casualtyVisit.updateMany({
    where: { id: data.casualtyVisitId, status: "ADMITTED" },
    data: { status: "TREATING" },
  })

  revalidatePath("/dashboard/casualty")
  revalidatePath(`/dashboard/casualty/patient/${data.casualtyVisitId}`)
  writeAuditLog({
    userId: "system",
    action: "CREATE",
    module: "CasualtyProcedure",
    recordId: procedure.id,
    changes: { name: data.name, category: data.category, unitPrice: data.unitPrice },
  })
  return { success: true, procedureId: procedure.id }
}

// ──────────────────────────────────────────────────
// 3. Book OPD appointment from Casualty
// ──────────────────────────────────────────────────
export async function bookOPDFromCasualty(data: {
  casualtyVisitId: string
  patientId: string
  doctorId: string
  reason: string
  paymentMethod: string
}) {
  await requireAuth(["SUPER_ADMIN", "ADMIN", "RECEPTIONIST", "DOCTOR", "NURSE"])

  const doctor = await prisma.staff.findUnique({
    where: { id: data.doctorId },
    include: { user: true },
  })
  if (!doctor || doctor.user.role !== "DOCTOR") {
    throw new Error("Invalid doctor selected")
  }

  const patient = await prisma.patient.findUnique({
    where: { id: data.patientId },
    include: { user: true },
  })
  if (!patient) throw new Error("Patient not found")

  const consultationFee = doctor.consultationFee || 500

  // Fetch applicable OPD hospital fees
  const hospitalFees = await prisma.hospitalFee.findMany({
    where: { isActive: true, applyToOPD: true },
    orderBy: [{ sortOrder: "asc" }],
  })

  // Filter out chargeOnce fees already paid
  const existingBillingItems = await prisma.billingItem.findMany({
    where: { billing: { patientId: data.patientId } },
    select: { description: true },
  })
  const existingDescriptions = new Set(existingBillingItems.map((i) => i.description))

  const applicableFees = hospitalFees.filter((fee) => {
    if (fee.chargeOnce && existingDescriptions.has(fee.name)) return false
    return true
  })

  const totalHospitalFees = applicableFees.reduce((sum, fee) => sum + fee.amount, 0)
  const grandTotal = consultationFee + totalHospitalFees

  const now = new Date()
  const appointmentTime = getCurrentAppointmentTimeIST(true)

  // Generate unique collision-free OPD bill number
  const year = now.getFullYear()
  const billNumber = await generateUniqueBillNumber("OPD", year, 4)

  const isCredit = data.paymentMethod === "CREDIT"

  const result = await prisma.$transaction(async (tx) => {
    // Create the appointment linked to casualty
    const appointment = await tx.appointment.create({
      data: {
        patientId: data.patientId,
        doctorId: data.doctorId,
        appointmentDate: now,
        appointmentTime,
        reason: data.reason,
        status: AppointmentStatus.PENDING,
        casualtyVisitId: data.casualtyVisitId,
        source: "CASUALTY",
      },
    })

    // Build billing items
    const billingItems: Array<{
      description: string
      quantity: number
      unitPrice: number
      amount: number
      gstRate: number
      gstAmount: number
      totalAmount: number
    }> = [
      {
        description: `Consultation Fee - Dr. ${doctor.user.name}`,
        quantity: 1,
        unitPrice: consultationFee,
        amount: consultationFee,
        gstRate: 0,
        gstAmount: 0,
        totalAmount: consultationFee,
      },
    ]

    for (const fee of applicableFees) {
      billingItems.push({
        description: fee.name,
        quantity: 1,
        unitPrice: fee.amount,
        amount: fee.amount,
        gstRate: 0,
        gstAmount: 0,
        totalAmount: fee.amount,
      })
    }

    // Create OPD billing
    const billing = await tx.billing.create({
      data: {
        billNumber,
        patientId: data.patientId,
        appointmentId: appointment.id,
        casualtyVisitId: data.casualtyVisitId,
        type: BillingType.OPD,
        billDate: now,
        totalAmount: grandTotal,
        discountAmount: 0,
        taxAmount: 0,
        netAmount: grandTotal,
        paidAmount: isCredit ? 0 : grandTotal,
        balanceAmount: isCredit ? grandTotal : 0,
        status: isCredit ? BillingStatus.PENDING : BillingStatus.PAID,
        paymentMethod: data.paymentMethod,
        notes: `OPD Visit (from Casualty) - Dr. ${doctor.user.name}`,
        items: { create: billingItems },
      },
    })

    // Handle credit / ledger
    if (isCredit && grandTotal > 0) {
      await tx.creditEntry.create({
        data: {
          type: "RECEIVABLE",
          partyName: patient.user?.name || patient.patientId + " - " + (patient.phone || "OPD"),
          partyType: "PATIENT",
          partyId: data.patientId,
          referenceId: billing.id,
          referenceType: "BILLING",
          totalAmount: grandTotal,
          balanceAmount: grandTotal,
          status: "OPEN",
          notes: `OPD credit (Casualty) – ${billNumber} – Dr. ${doctor.user.name}`,
        },
      })
    }

    if (!isCredit && grandTotal > 0) {
      // Resolve financial account
      const { resolveFinancialAccount } = await import("@/lib/payment-routing")
      const accountId = await resolveFinancialAccount(tx, data.paymentMethod)
      if (accountId) {
        await tx.transaction.create({
          data: {
            accountId,
            type: "INCOME",
            amount: grandTotal,
            category: "OPD_CONSULTATION",
            paymentMethod: data.paymentMethod,
            referenceId: billing.id,
            description: `OPD payment (Casualty) - ${billNumber}`,
          },
        })
        await tx.financialAccount.update({
          where: { id: accountId },
          data: { currentBalance: { increment: grandTotal } },
        })
      }
    }

    // Update casualty status to REFERRED_TO_OPD
    await tx.casualtyVisit.update({
      where: { id: data.casualtyVisitId },
      data: { status: "REFERRED_TO_OPD" },
    })

    return { appointment, billing }
  }, { maxWait: 10000, timeout: 20000 })

  revalidatePath("/dashboard/casualty")
  revalidatePath("/dashboard/clinical/opd")
  revalidatePath("/dashboard/clinical/emr")
  revalidatePath("/dashboard/billing-counter/casualty")
  revalidatePath("/dashboard/billing-counter/opd")
  writeAuditLog({
    userId: "system",
    action: "CREATE",
    module: "CasualtyToOPD",
    recordId: result.appointment.id,
    changes: { casualtyVisitId: data.casualtyVisitId, doctorId: data.doctorId },
  })

  return {
    success: true,
    appointmentId: result.appointment.id,
    billingId: result.billing.id,
    billNumber,
  }
}

// ──────────────────────────────────────────────────
// 4. Discharge from Casualty (generates billing)
// ──────────────────────────────────────────────────
export async function dischargeCasualty(visitId: string) {
  await requireAuth(["SUPER_ADMIN", "ADMIN", "DOCTOR", "NURSE", "RECEPTIONIST"])

  const visit = await prisma.casualtyVisit.findUnique({
    where: { id: visitId },
    include: { procedures: true, patient: true },
  })

  if (!visit) throw new Error("Casualty visit not found")
  if (!visit.patientId) throw new Error("Patient profile required for discharge")

  if (visit.status === "DISCHARGED") {
    return { success: true, message: "Patient is already discharged" }
  }

  // Calculate total charges from procedures
  const totalCharges = visit.procedures.reduce(
    (sum, p) => sum + p.unitPrice * p.quantity,
    0
  )

  // Check if a casualty bill was already generated for this visit
  const existingCasualtyBill = await prisma.billing.findFirst({
    where: {
      casualtyVisitId: visitId,
      type: BillingType.CASUALTY,
    },
    select: { id: true, billNumber: true },
  })

  const year = new Date().getFullYear()
  let finalBillNumber = existingCasualtyBill?.billNumber || null

  await prisma.$transaction(async (tx) => {
    // Mark as discharged
    await tx.casualtyVisit.update({
      where: { id: visitId },
      data: {
        status: "DISCHARGED",
        dischargeTime: new Date(),
      },
    })

    // Generate billing with all procedures as line items if charges exist and not already billed
    if (totalCharges > 0 && !existingCasualtyBill) {
      let created = false
      let attempts = 0
      while (!created && attempts < 5) {
        attempts++
        const candidateBillNumber = await generateUniqueBillNumber("CAS", year, 4, tx)
        try {
          await tx.billing.create({
            data: {
              billNumber: candidateBillNumber,
              patientId: visit.patientId,
              casualtyVisitId: visitId,
              type: BillingType.CASUALTY,
              status: BillingStatus.PENDING,
              totalAmount: totalCharges,
              netAmount: totalCharges,
              balanceAmount: totalCharges,
              items: {
                create: visit.procedures.map((p) => ({
                  description: `${p.category}: ${p.name}${p.description ? ` — ${p.description}` : ""}`,
                  quantity: p.quantity,
                  unitPrice: p.unitPrice,
                  amount: p.unitPrice * p.quantity,
                  totalAmount: p.unitPrice * p.quantity,
                  serviceCategory: "CASUALTY",
                })),
              },
            },
          })
          created = true
          finalBillNumber = candidateBillNumber
        } catch (err: any) {
          if (err?.code === "P2002" && err?.meta?.target?.includes("billNumber") && attempts < 5) {
            continue
          }
          throw err
        }
      }
    }
  })

  revalidatePath("/dashboard/casualty")
  writeAuditLog({
    userId: "system",
    action: "PROCESS",
    module: "CasualtyDischarge",
    recordId: visitId,
    changes: { totalCharges, billNumber: finalBillNumber },
  })
  return { success: true, billNumber: finalBillNumber || undefined }
}

// ──────────────────────────────────────────────────
// 5. Update casualty visit status
// ──────────────────────────────────────────────────
export async function updateCasualtyStatus(
  visitId: string,
  status: CasualtyStatus,
  assignedDoctorId?: string
) {
  await requireAuth(["SUPER_ADMIN", "ADMIN", "DOCTOR", "NURSE"])

  const updateData: any = { status }
  if (assignedDoctorId) updateData.assignedDoctorId = assignedDoctorId

  await prisma.casualtyVisit.update({
    where: { id: visitId },
    data: updateData,
  })

  revalidatePath("/dashboard/casualty")
  writeAuditLog({
    userId: "system",
    action: "UPDATE",
    module: "CasualtyVisit",
    recordId: visitId,
    changes: { status },
  })
  return { success: true }
}

// ──────────────────────────────────────────────────
// Register a NEW patient (full OPD-style form) and
// auto-admit them to Casualty in one transaction
// ──────────────────────────────────────────────────
export async function registerAndAdmitToCasualty(
  prevState: Record<string, unknown> | null,
  formData: FormData
) {
  const authResult = await requireAuthSafe(["SUPER_ADMIN", "ADMIN", "DOCTOR", "RECEPTIONIST", "NURSE"])
  if (!authResult.ok) return { success: false, error: true, message: authResult.error }

  try {
    const fullName = formData.get("fullName") as string
    const ageYears = formData.get("ageYears") as string
    const ageMonths = formData.get("ageMonths") as string
    const ageDays = formData.get("ageDays") as string
    const isBaby = formData.get("isBaby") === "true"
    const gender = formData.get("gender") as string
    const phone = formData.get("phone") as string
    const email = formData.get("email") as string
    const address = formData.get("address") as string
    const city = formData.get("city") as string
    const state = formData.get("state") as string
    const pincode = formData.get("pincode") as string
    const bloodGroup = formData.get("bloodGroup") as string
    const aadharNumber = formData.get("aadharNumber") as string
    const fatherOrHusbandName = formData.get("fatherOrHusbandName") as string
    const fatherSpouseName = formData.get("fatherSpouseName") as string
    const motherName = formData.get("motherName") as string
    const maritalStatus = formData.get("maritalStatus") as string
    const occupation = formData.get("occupation") as string
    const nationality = formData.get("nationality") as string
    const religion = formData.get("religion") as string
    const referredBy = formData.get("referredBy") as string
    const emergencyContact = formData.get("emergencyContact") as string
    const emergencyContactName = formData.get("emergencyContactName") as string
    const emergencyContactRelation = formData.get("emergencyContactRelation") as string
    const chiefComplaint = formData.get("chiefComplaint") as string
    const assignedDoctorId = formData.get("assignedDoctorId") as string

    if (!fullName || !gender) {
      return { success: false, error: true, message: "Please fill in Full Name and Gender." }
    }

    // Check duplicate phone
    if (phone) {
      const existing = await prisma.patient.findFirst({ where: { phone } })
      if (existing) {
        return { success: false, error: true, message: `Phone ${phone} is already registered. Use "Existing Patient" to admit.` }
      }
    }

    // Compute approximate DOB from age fields
    const years = parseInt(ageYears) || 0
    const months = isBaby ? (parseInt(ageMonths) || 0) : 0
    const days = isBaby ? (parseInt(ageDays) || 0) : 0

    const now = new Date()
    const dobDate = new Date(
      now.getFullYear() - years,
      now.getMonth() - months,
      now.getDate() - days
    )

    const userEmail = email || (phone ? `patient-${phone}@hospital-erp.internal` : `patient-${Date.now()}@hospital-erp.internal`)

    let generatedPatientId = ""
    let visitId = ""

    await prisma.$transaction(async (tx) => {
      // 1. Generate UHID (same format as OPD)
      const currentYear = new Date().getFullYear()
      const patientCount = await tx.patient.count()
      const patientId = `PAT-${currentYear}-${String(patientCount + 1).padStart(4, "0")}`
      generatedPatientId = patientId

      // 2. Create user account
      const defaultPasswordRaw = phone || patientId
      const defaultPassword = await hash(defaultPasswordRaw, 10)

      const user = await tx.user.create({
        data: {
          name: fullName,
          email: userEmail,
          password: defaultPassword,
          role: "PATIENT",
          isActive: true,
          emailVerified: email ? null : new Date(),
        },
      })

      // 3. Create patient record with full details
      const patient = await tx.patient.create({
        data: {
          userId: user.id,
          patientId,
          dateOfBirth: dobDate,
          gender: gender as Gender,
          phone: phone || null,
          address: address || null,
          city: city || null,
          state: state || null,
          pincode: pincode || null,
          bloodGroup: bloodGroup || null,
          aadharNumber: aadharNumber || null,
          fatherOrHusbandName: fatherOrHusbandName || null,
          fatherSpouseName: fatherSpouseName || null,
          motherName: motherName || null,
          maritalStatus: maritalStatus || null,
          occupation: occupation || null,
          nationality: nationality || "Indian",
          religion: religion || null,
          referredBy: referredBy || null,
          emergencyContact: emergencyContact || null,
          emergencyContactName: emergencyContactName || null,
          emergencyContactRelation: emergencyContactRelation || null,
        },
      })

      // 4. Auto-admit to Casualty
      const visit = await tx.casualtyVisit.create({
        data: {
          patientId: patient.id,
          chiefComplaint: chiefComplaint || null,
          assignedDoctorId: assignedDoctorId || undefined,
          status: "ADMITTED",
        },
      })

      visitId = visit.id
    })

    writeAuditLog({
      userId: authResult.ok ? authResult.session.userId : "unknown",
      action: "CREATE",
      module: "CasualtyPatientRegistration",
      changes: { fullName, phone, patientId: generatedPatientId },
    })

    revalidatePath("/dashboard/casualty")
    revalidatePath("/dashboard/clinical/opd")

    return {
      success: true,
      message: `Patient registered (UHID: ${generatedPatientId}) and admitted to Casualty.`,
      patientId: generatedPatientId,
      visitId,
    }
  } catch (_err: unknown) {
    const error = _err as Error & { code?: string }
    if (error.code === "P2002") {
      return { success: false, error: true, message: "A patient with this email or phone already exists." }
    }
    return { success: false, error: true, message: `Error: ${error?.message || "Registration failed."}` }
  }
}
