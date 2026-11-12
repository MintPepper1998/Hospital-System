"use server"

// ============================================
// LEGACY MONOLITH — Functions are re-exported from domain modules:
//   lib/actions/patient.ts, lib/actions/appointment.ts, lib/actions/billing.ts,
//   lib/actions/pharmacy-inventory.ts, lib/actions/laboratory.ts,
//   lib/actions/surgery.ts, lib/actions/ward.ts, lib/actions/auth.ts
// New code should import from domain-specific modules instead of this file.
// ============================================

import { prisma } from "@/lib/prisma"
import { hash } from "bcryptjs"
import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"
import { signOut } from "@/auth"
import { Role, Gender, AppointmentStatus, BillingStatus, BillingType, TheaterType, DischargeType, PACStatus, SurgeryStatus, Prisma } from "@prisma/client"
import { requireAuth, requireAuthSafe } from "@/lib/auth-guard"
import { resolveFinancialAccount } from "@/lib/payment-routing"
import { writeAuditLog } from "@/lib/audit"
import { addToInventory, deductFromInventory } from "@/lib/inventory-service"
import { supplierScopeFilter, supplierAllowedFor } from "@/lib/supplier-scope"
import { formatTimeIST } from "@/lib/timezone"

type ServerActionError = Error & { code?: string }

export async function createUser(formData: FormData) {
  const authSession = await requireAuth(["SUPER_ADMIN"])
  const name = formData.get("name") as string
  const email = formData.get("email") as string
  const password = formData.get("password") as string
  const role = formData.get("role") as string
  const permissionsStr = formData.get("permissions") as string
  let permissions: string[] = []
  if (permissionsStr) {
    try { permissions = JSON.parse(permissionsStr) } catch (e) {}
  }

  // Additional fields for staff
  const phone = formData.get("phone") as string
  const department = formData.get("department") as string
  const specialization = formData.get("specialization") as string
  const designation = formData.get("designation") as string

  // Consultation fee for doctors (Admin-controlled)
  const consultationFeeRaw = formData.get("consultationFee") as string
  const consultationFee = consultationFeeRaw ? parseFloat(consultationFeeRaw) : 500 // Default to 500

  // 1. Validate inputs
  if (!name || !email || !password || !role) {
    throw new Error("Missing required fields")
  }

  // 2. Check if user already exists
  const existingUser = await prisma.user.findUnique({
    where: { email },
  })

  if (existingUser) {
    throw new Error("User with this email already exists")
  }

  // 3. Hash the password
  const hashedPassword = await hash(password, 10)

  const staffRoles = ["DOCTOR", "NURSE", "PHARMACIST", "LAB_TECHNICIAN", "RECEPTIONIST", "ACCOUNTANT"]

  // 4. Create user + staff atomically inside a transaction
  const createdUser = await prisma.$transaction(async (tx) => {
    const user = await tx.user.create({
      data: {
        name,
        email,
        password: hashedPassword,
        role: role as Role,
        permissions,
      },
    })

    if (staffRoles.includes(role) && phone && department && designation) {
      const staffCount = await tx.staff.count()
      const employeeId = `EMP-${role.substring(0, 3).toUpperCase()}-${String(staffCount + 1).padStart(4, "0")}`

      await tx.staff.create({
        data: {
          userId: user.id,
          employeeId,
          phone,
          department,
          designation,
          specialization: specialization || null,
          consultationFee: role === "DOCTOR" ? consultationFee : 500,
        },
      })
    }

    return user
  })

  writeAuditLog({ userId: authSession.userId, action: "CREATE", module: "User", recordId: createdUser.id, changes: { name, email, role } })

  // 5. Refresh and Redirect
  revalidatePath("/dashboard/admin/users")
  redirect("/dashboard/admin/users")
}

export async function logout() {
  await requireAuth()
  await signOut({ redirectTo: "/login" })
}

export async function registerPatient(
  prevState: Record<string, unknown> | null,
  formData: FormData
) {
  const authResult = await requireAuthSafe(["SUPER_ADMIN", "DOCTOR", "RECEPTIONIST", "NURSE"])
  if (!authResult.ok) return { success: false, message: authResult.error }

  // Extract form values outside try so they're available in catch for error responses
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
  const allergies = formData.get("allergies") as string
  const currentMedications = formData.get("currentMedications") as string
  const medicalHistory = formData.get("medicalHistory") as string

  // Collect all form values so we can return them on error (preserves user input)
  const formValues = {
    fullName, ageYears, ageMonths, ageDays, isBaby: isBaby ? "true" : "",
    gender, phone, email, address, city, state, pincode, bloodGroup,
    aadharNumber, fatherOrHusbandName, fatherSpouseName, motherName,
    maritalStatus, occupation, nationality, religion, referredBy,
    emergencyContact, emergencyContactName, emergencyContactRelation,
    allergies, currentMedications, medicalHistory,
  }

  try {
    if (!fullName || !gender || !address) {
      return {
        success: false,
        error: true,
        message: "Please fill in all required fields",
        formValues,
      }
    }

    if (phone) {
      const existingPatient = await prisma.patient.findFirst({
        where: { phone },
      })

      if (existingPatient) {
        return {
          success: false,
          error: true,
          message: `A patient with phone number ${phone} is already registered. You can still register without a phone number.`,
          formValues,
        }
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

    await prisma.$transaction(async (tx) => {
      const currentYear = new Date().getFullYear()
      // Find highest existing patient number to avoid collisions after deletions
      const lastPatient = await tx.patient.findFirst({
        where: { patientId: { startsWith: `PAT-${currentYear}-` } },
        orderBy: { patientId: 'desc' },
        select: { patientId: true },
      })
      const lastNum = lastPatient
        ? parseInt(lastPatient.patientId.split('-').pop() || '0', 10)
        : 0
      const patientId = `PAT-${currentYear}-${String(lastNum + 1).padStart(4, "0")}`
      generatedPatientId = patientId

      // Use phone as default password if available, otherwise use the generated patient ID
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

      await tx.patient.create({
        data: {
          userId: user.id,
          patientId,
          dateOfBirth: dobDate,
          gender: gender as Gender,
          phone: phone || null,
          address,
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
          allergies: allergies || null,
          currentMedications: currentMedications || null,
          medicalHistory: medicalHistory || null,
        },
      })
    })

    writeAuditLog({ userId: authResult.ok ? authResult.session.userId : "unknown", action: "CREATE", module: "Patient", changes: { fullName, phone } })

    revalidatePath("/dashboard/clinical/opd")
    revalidatePath("/dashboard/ipd/admission")

  } catch (_err: unknown) {
    const error = _err as ServerActionError

    // Handle specific database errors
    if (error.code === "P2002") {
      // Unique constraint violation
      return {
        success: false,
        error: true,
        message: "A patient with this email or phone number already exists.",
        formValues,
      }
    }

    if (error.code === "P2003") {
      // Foreign key constraint violation
      return {
        success: false,
        error: true,
        message: "Database relationship error. Please contact support.",
        formValues,
      }
    }

    return {
      success: false,
      error: true,
      message: `Error: ${error?.message || "An error occurred while registering the patient. Please try again."}`,
      formValues,
    }
  }

  // Support custom redirect (e.g., from IPD admission flow)
  const redirectTo = formData.get("redirectTo") as string
  const safeRedirects = ["/dashboard/ipd/admission", "/dashboard/clinical/opd"]
  const target = redirectTo && safeRedirects.includes(redirectTo) ? redirectTo : "/dashboard/clinical/opd"
  redirect(target)
}

/**
 * Create a new appointment for a patient with a doctor and generate OPD billing
 * @param patientId - The ID of the patient
 * @param doctorId - The ID of the doctor (Staff record)
 * @param reason - The reason for the appointment
 * @param appointmentDate - The date and time for the appointment
 * @param paymentMethod - The payment method (CASH, UPI, CARD)
 */
export async function createAppointment(
  patientId: string,
  doctorId: string,
  reason: string,
  appointmentDate: Date,
  paymentMethod: string = "CASH",
  allergies?: string,
  currentMedications?: string,
  medicalHistory?: string
) {
  const authResult = await requireAuthSafe(["SUPER_ADMIN", "DOCTOR", "RECEPTIONIST"])
  if (!authResult.ok) return { success: false, message: authResult.error }

  try {

    // Validate inputs
    if (!patientId || !doctorId || !reason || !appointmentDate || !paymentMethod) {
      return {
        success: false,
        error: true,
        message: "Please provide all required fields",
      }
    }

    // Verify patient exists
    const patient = await prisma.patient.findUnique({
      where: { id: patientId },
      include: { user: true },
    })

    if (!patient) {
      return {
        success: false,
        error: true,
        message: "Patient not found",
      }
    }

    // Verify doctor exists and fetch consultation fee
    const doctor = await prisma.staff.findUnique({
      where: { id: doctorId },
      include: { user: true },
    })

    if (!doctor || doctor.user.role !== "DOCTOR") {
      return {
        success: false,
        error: true,
        message: "Invalid doctor selected",
      }
    }

    // Use the doctor's actual consultation fee from the database
    const consultationFee = doctor.consultationFee || 500

    // ── Fetch applicable OPD hospital fees ──
    const hospitalFees = await prisma.hospitalFee.findMany({
      where: { isActive: true, applyToOPD: true },
      orderBy: [{ sortOrder: "asc" }],
    })

    // Filter out chargeOnce fees for patients who have ALREADY paid them before
    // Check existing billing items to see if this fee was previously charged
    const existingBillingItems = await prisma.billingItem.findMany({
      where: {
        billing: { patientId: patientId },
      },
      select: { description: true },
    })
    const existingDescriptions = new Set(existingBillingItems.map((i) => i.description))

    const applicableFees = hospitalFees.filter((fee) => {
      if (fee.chargeOnce && existingDescriptions.has(fee.name)) {
        return false // Patient already paid this fee before — skip
      }
      return true
    })

    // Calculate total hospital fees
    const totalHospitalFees = applicableFees.reduce((sum, fee) => sum + fee.amount, 0)
    const grandTotal = consultationFee + totalHospitalFees

    // Extract time from appointmentDate
    const appointmentTime = formatTimeIST(appointmentDate, "hh:mm a")

    // Generate bill number (OPD-YYYY-NNNN)
    const year = new Date().getFullYear()
    const lastBill = await prisma.billing.findFirst({
      where: { billNumber: { startsWith: `OPD-${year}-` } },
      orderBy: { billNumber: 'desc' }
    })
    const lastSeq = lastBill?.billNumber ? parseInt(lastBill.billNumber.split('-')[2]) || 0 : 0
    const billNumber = `OPD-${year}-${String(lastSeq + 1).padStart(4, "0")}`

    // Transaction: Create appointment AND billing with all fee items
    const result = await prisma.$transaction(async (tx) => {
      // Create appointment
      const appointment = await tx.appointment.create({
        data: {
          patientId: patientId,
          doctorId: doctorId,
          appointmentDate: appointmentDate,
          appointmentTime: appointmentTime,
          reason: reason,
          status: AppointmentStatus.PENDING,
        },
      })

      // Update patient's medical info if provided
      if (allergies || currentMedications || medicalHistory) {
        await tx.patient.update({
          where: { id: patientId },
          data: {
            ...(allergies && { allergies }),
            ...(currentMedications && { currentMedications }),
            ...(medicalHistory && { medicalHistory }),
          },
        })
      }

      // Build billing items array
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

      // Add hospital fees as separate line items
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

      const isCredit = paymentMethod === "CREDIT"

      // Create OPD billing with all items
      const billing = await tx.billing.create({
        data: {
          billNumber: billNumber,
          patientId: patientId,
          appointmentId: appointment.id,
          type: BillingType.OPD,
          billDate: new Date(),
          totalAmount: grandTotal,
          discountAmount: 0,
          taxAmount: 0,
          netAmount: grandTotal,
          paidAmount: isCredit ? 0 : grandTotal,
          balanceAmount: isCredit ? grandTotal : 0,
          status: isCredit ? BillingStatus.PENDING : BillingStatus.PAID,
          paymentMethod: paymentMethod,
          notes: `OPD Visit - Dr. ${doctor.user.name}${applicableFees.length > 0 ? ` + ${applicableFees.length} fee(s)` : ""}${isCredit ? " [CREDIT]" : ""}`,
          items: {
            create: billingItems,
          },
        },
      })

      // If credit: create a CreditEntry instead of a ledger transaction
      if (isCredit && grandTotal > 0) {
        await tx.creditEntry.create({
          data: {
            type: "RECEIVABLE",
            partyName: patient.user?.name || patient.patientId + " - " + (patient.phone || "OPD"),
            partyType: "PATIENT",
            partyId: patientId,
            referenceId: billing.id,
            referenceType: "BILLING",
            totalAmount: grandTotal,
            balanceAmount: grandTotal,
            status: "OPEN",
            notes: `OPD credit – ${billNumber} – Dr. ${doctor.user.name}`,
          },
        })
      }

      // If not credit: record payment in the financial ledger
      if (!isCredit && grandTotal > 0) {
        const accountId = await resolveFinancialAccount(tx, paymentMethod)

        if (accountId) {
          await tx.transaction.create({
            data: {
              accountId,
              type: "INCOME",
              amount: grandTotal,
              category: "OPD_CONSULTATION",
              paymentMethod: paymentMethod,
              referenceId: billing.id,
              description: `OPD payment - ${billNumber}`,
            },
          })

          await tx.financialAccount.update({
            where: { id: accountId },
            data: { currentBalance: { increment: grandTotal } },
          })
        }
      }

      return { appointment, billing }
    }, {
      maxWait: 10000,
      timeout: 20000,
    })

    // Revalidate the OPD page server-side so any client refresh gets fresh data.
    // This is the authoritative invalidation — the client-side router.refresh()
    // in the dialog is a secondary UX refresh only and must NOT be relied upon.
    revalidatePath("/dashboard/clinical/opd")
    revalidatePath("/dashboard/finance/billing")
    revalidatePath("/dashboard/finance")
    revalidatePath("/dashboard/master-finance")
    revalidatePath("/dashboard/master-finance/cash-bank/accounts")
    revalidatePath("/dashboard/master-finance/general-ledger")
    revalidatePath("/dashboard/reports/day-book")

    writeAuditLog({ userId: authResult.session.userId, action: "CREATE", module: "Appointment", recordId: result.appointment.id, changes: { patientId, doctorId, billNumber, grandTotal } })

    return {
      success: true,
      error: false,
      message: `Appointment booked! Bill No: ${billNumber}`,
      appointmentId: result.appointment.id,
      billingId: result.billing.id,
      billNumber: billNumber,
      consultationFee: consultationFee,
      hospitalFees: applicableFees.map(f => ({ name: f.name, amount: f.amount })),
      grandTotal: grandTotal,
    }
  } catch (_err: unknown) {
    const error = _err as ServerActionError

    return {
      success: false,
      error: true,
      message: `Error: ${error?.message || "Failed to book appointment. Please try again."}`,
    }
  }
}

/**
 * Cancel an OPD appointment and process its refund
 * @param appointmentId - The ID of the appointment
 */
export async function cancelOPDAppointment(appointmentId: string) {
  const authResult = await requireAuthSafe(["SUPER_ADMIN", "DOCTOR", "RECEPTIONIST"])
  if (!authResult.ok) return { success: false, message: authResult.error }

  try {
    const result = await prisma.$transaction(async (tx) => {
      // 1. Find and validate appointment
      const appointment = await tx.appointment.findUnique({
        where: { id: appointmentId },
        include: {
          billings: {
            where: { type: "OPD" }
          }
        }
      })

      if (!appointment) {
        throw new Error("Appointment not found")
      }
      
      if (appointment.status !== "PENDING" && appointment.status !== "CONFIRMED") {
        throw new Error(`Cannot cancel appointment in ${appointment.status} state. Only PENDING or CONFIRMED appointments can be cancelled.`)
      }

      // 2. Mark Appointment as CANCELLED
      const updatedAppointment = await tx.appointment.update({
        where: { id: appointmentId },
        data: { status: "CANCELLED" }
      })

      // 3. Process Refunds if Billing exists
      const opdBilling = appointment.billings[0]
      if (opdBilling) {
        // Mark Billing as CANCELLED
        await tx.billing.update({
          where: { id: opdBilling.id },
          data: {
            status: "CANCELLED",
            notes: (opdBilling.notes || "") + "\n[CANCELLED & REFUNDED]"
          }
        })

        // Handle Financials
        if (opdBilling.paymentMethod === "CREDIT") {
          // Cancel the CreditEntry
          const creditEntry = await tx.creditEntry.findFirst({
            where: { referenceId: opdBilling.id }
          })
          
          if (creditEntry && creditEntry.status !== "CANCELLED") {
            await tx.creditEntry.update({
              where: { id: creditEntry.id },
              data: {
                status: "CANCELLED",
                balanceAmount: 0,
                notes: (creditEntry.notes || "") + "\nCancelled via OPD Refund"
              }
            })
          }
        } else if (opdBilling.paidAmount > 0) {
          // It was paid via Cash/Card/UPI - issue a refund transaction
          const accountId = await resolveFinancialAccount(tx as any, opdBilling.paymentMethod || "CASH")
          
          if (accountId) {
            await tx.transaction.create({
              data: {
                accountId,
                type: "EXPENSE", // Outflow of money for refund
                amount: opdBilling.paidAmount,
                category: "REFUND",
                paymentMethod: opdBilling.paymentMethod || "CASH",
                referenceId: opdBilling.id,
                description: `Refund for Cancelled OPD - ${opdBilling.billNumber}`,
              }
            })

            // Decrement the account balance
            await tx.financialAccount.update({
              where: { id: accountId },
              data: { currentBalance: { decrement: opdBilling.paidAmount } }
            })
          }
        }
      }

      return updatedAppointment
    })

    revalidatePath("/dashboard/clinical/opd")
    revalidatePath("/dashboard/finance/billing")
    revalidatePath("/dashboard/finance")
    revalidatePath("/dashboard/master-finance")
    revalidatePath("/dashboard/master-finance/cash-bank/accounts")
    revalidatePath("/dashboard/master-finance/general-ledger")
    revalidatePath("/dashboard/reports/day-book")
    revalidatePath("/dashboard/finance/credit")
    revalidatePath("/dashboard/finance")

    writeAuditLog({ userId: authResult.session.userId, action: "DELETE", module: "Appointment", recordId: appointmentId, changes: { status: "CANCELLED" } })

    return {
      success: true,
      error: false,
      message: "Appointment cancelled and refunded successfully."
    }
  } catch (_err: unknown) {
    const error = _err as ServerActionError
    return {
      success: false,
      error: true,
      message: error?.message || "Failed to cancel appointment. Please try again."
    }
  }
}

/**
 * Generate OPD billing for an already CONFIRMED appointment and mark it as arrived (PENDING)
 * @param appointmentId - The ID of the appointment
 * @param paymentMethod - The payment method (CASH, UPI, CARD)
 */
export async function billAndMarkArrived(
  appointmentId: string,
  paymentMethod: string = "CASH"
) {
  const authResult = await requireAuthSafe(["SUPER_ADMIN", "RECEPTIONIST"])
  if (!authResult.ok) return { success: false, message: authResult.error }

  try {
    if (!appointmentId || !paymentMethod) {
      return { success: false, error: true, message: "Please provide all required fields" }
    }

    const appointment = await prisma.appointment.findUnique({
      where: { id: appointmentId },
      include: { doctor: { include: { user: true } }, patient: { include: { user: true } } },
    })

    if (!appointment) {
      return { success: false, error: true, message: "Appointment not found" }
    }

    if (appointment.status !== "CONFIRMED") {
      return { success: false, error: true, message: `Cannot mark arrived for status: ${appointment.status}` }
    }

    const doctor = appointment.doctor
    const consultationFee = doctor.consultationFee || 500
    const patientId = appointment.patientId

    // ── Fetch applicable OPD hospital fees ──
    const hospitalFees = await prisma.hospitalFee.findMany({
      where: { isActive: true, applyToOPD: true },
      orderBy: [{ sortOrder: "asc" }],
    })

    const existingBillingItems = await prisma.billingItem.findMany({
      where: { billing: { patientId: patientId } },
      select: { description: true },
    })
    const existingDescriptions = new Set(existingBillingItems.map((i) => i.description))

    const applicableFees = hospitalFees.filter((fee) => {
      if (fee.chargeOnce && existingDescriptions.has(fee.name)) return false
      return true
    })

    const totalHospitalFees = applicableFees.reduce((sum, fee) => sum + fee.amount, 0)
    const grandTotal = consultationFee + totalHospitalFees

    const year = new Date().getFullYear()
    const lastBill = await prisma.billing.findFirst({
      where: { billNumber: { startsWith: `OPD-${year}-` } },
      orderBy: { billNumber: 'desc' }
    })
    const lastSeq = lastBill?.billNumber ? parseInt(lastBill.billNumber.split('-')[2]) || 0 : 0
    const billNumber = `OPD-${year}-${String(lastSeq + 1).padStart(4, "0")}`

    const result = await prisma.$transaction(async (tx) => {
      const updatedAppointment = await tx.appointment.update({
        where: { id: appointmentId },
        data: { status: "PENDING" },
      })

      const billingItems = [
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

      const isCredit = paymentMethod === "CREDIT"

      const billing = await tx.billing.create({
        data: {
          billNumber: billNumber,
          patientId: patientId,
          appointmentId: appointment.id,
          type: "OPD",
          billDate: new Date(),
          totalAmount: grandTotal,
          discountAmount: 0,
          taxAmount: 0,
          netAmount: grandTotal,
          paidAmount: isCredit ? 0 : grandTotal,
          balanceAmount: isCredit ? grandTotal : 0,
          status: isCredit ? "PENDING" : "PAID",
          paymentMethod: paymentMethod,
          notes: `OPD Visit - Dr. ${doctor.user.name}${applicableFees.length > 0 ? ` + ${applicableFees.length} fee(s)` : ""}${isCredit ? " [CREDIT]" : ""}`,
          items: { create: billingItems },
        },
      })

      // If credit: create a CreditEntry instead of a ledger transaction
      if (isCredit && grandTotal > 0) {
        await tx.creditEntry.create({
          data: {
            type: "RECEIVABLE",
            partyName: appointment.patient?.user?.name || (appointment.patient?.patientId || "Patient") + " - " + (appointment.patient?.phone || "OPD"),
            partyType: "PATIENT",
            partyId: patientId,
            referenceId: billing.id,
            referenceType: "BILLING",
            totalAmount: grandTotal,
            balanceAmount: grandTotal,
            status: "OPEN",
            notes: `OPD credit – ${billNumber} – Dr. ${doctor.user.name}`,
          },
        })
      }

      // If not credit: record payment in the financial ledger
      if (!isCredit && grandTotal > 0) {
        const accountId = await resolveFinancialAccount(tx, paymentMethod)

        if (accountId) {
          await tx.transaction.create({
            data: {
              accountId,
              type: "INCOME",
              amount: grandTotal,
              category: "OPD_CONSULTATION",
              paymentMethod: paymentMethod,
              referenceId: billing.id,
              description: `OPD payment - ${billNumber}`,
            },
          })

          await tx.financialAccount.update({
            where: { id: accountId },
            data: { currentBalance: { increment: grandTotal } },
          })
        }
      }

      return { appointment: updatedAppointment, billing }
    }, { maxWait: 10000, timeout: 20000 })

    revalidatePath("/dashboard/clinical/opd")
    revalidatePath("/dashboard/finance/billing")
    revalidatePath("/dashboard/finance")
    revalidatePath("/dashboard/master-finance")
    revalidatePath("/dashboard/master-finance/cash-bank/accounts")
    revalidatePath("/dashboard/master-finance/general-ledger")
    revalidatePath("/dashboard/reports/day-book")

    writeAuditLog({ userId: authResult.session.userId, action: "PROCESS", module: "OPDBilling", recordId: appointmentId, changes: { billNumber } })

    return {
      success: true,
      error: false,
      message: `Patient arrived & Bill No: ${billNumber} generated!`,
      appointmentId: result.appointment.id,
      billingId: result.billing.id,
      billNumber: billNumber,
      consultationFee: consultationFee,
      hospitalFees: applicableFees.map(f => ({ name: f.name, amount: f.amount })),
      grandTotal: grandTotal,
    }
  } catch (_err: unknown) {
    const error = _err as ServerActionError
    return {
      success: false,
      error: true,
      message: `Error: ${error?.message || "Failed to mark arrived and bill. Please try again."}`,
    }
  }
}


/**
 * Update consultation details and complete the appointment
 * @param appointmentId - The ID of the appointment
 * @param formData - The consultation form data
 */
export async function updateConsultation(
  appointmentId: string,
  formData: FormData
) {
  const authResult = await requireAuthSafe(["SUPER_ADMIN", "DOCTOR"])
  if (!authResult.ok) return { success: false, message: authResult.error }

  try {

    // Extract form data
    const pulse = formData.get("pulse") as string
    const temperature = formData.get("temperature") as string
    const weightKg = formData.get("weightKg") as string
    const weightGrams = formData.get("weightGrams") as string
    // Combine kg + grams into a single weight string (e.g. "70 kg 500 gm")
    let weight = ""
    if (weightKg || weightGrams) {
      const kg = parseInt(weightKg) || 0
      const gm = parseInt(weightGrams) || 0
      weight = gm > 0 ? `${kg} kg ${gm} gm` : `${kg} kg`
    }
    const bloodPressure = formData.get("bloodPressure") as string
    const chiefComplaint = formData.get("chiefComplaint") as string
    const diagnosis = formData.get("diagnosis") as string
    const prescription = formData.get("prescription") as string
    const notes = formData.get("notes") as string
    const isPaperConsultation = formData.get("isPaperConsultation") === "true"
    const scannedPaperUrl = (formData.get("scannedPaperUrl") as string) || null

    // Extract selected lab tests (multiple values)
    const labTestIds = formData.getAll("labTests") as string[]

    // Validate required fields (relaxed if treated on physical paper)
    if (!isPaperConsultation && (!diagnosis || !prescription)) {
      return {
        success: false,
        error: true,
        message: "Diagnosis and Prescription are required to complete consultation",
      }
    }

    // Verify appointment exists
    const appointment = await prisma.appointment.findUnique({
      where: { id: appointmentId },
      include: {
        patient: {
          include: {
            user: true,
          },
        },
        doctor: {
          include: {
            user: true,
          },
        },
      },
    })

    if (!appointment) {
      return {
        success: false,
        error: true,
        message: "Appointment not found",
      }
    }

    // Use transaction to ensure atomicity
    const result = await prisma.$transaction(async (tx) => {
      // Update appointment with consultation details
      const updatedAppointment = await tx.appointment.update({
        where: { id: appointmentId },
        data: {
          pulse: pulse || null,
          temperature: temperature || null,
          weight: weight || null,
          bloodPressure: bloodPressure || null,
          reason: chiefComplaint || appointment.reason,
          diagnosis: diagnosis || (isPaperConsultation ? "Treated on Physical OPD Paper" : null),
          prescription: prescription || (isPaperConsultation ? "Prescription recorded on physical OPD paper (see attached scan)." : null),
          notes: notes || null,
          isPaperConsultation: isPaperConsultation || false,
          scannedPaperUrl: scannedPaperUrl || null,
          status: AppointmentStatus.COMPLETED,
        },
      })

      // Handle Lab Requests if tests were selected
      let createdLabRequestCount = 0

      if (labTestIds.length > 0) {

        // Clear any existing pending requests for this appointment to avoid duplicates
        const deleteResult = await tx.labRequest.deleteMany({
          where: {
            appointmentId: appointmentId,
            status: 'PENDING_PAYMENT'
          }
        })

        // Fetch test details from catalog

        const labTests = await tx.labTestCatalog.findMany({
          where: {
            id: { in: labTestIds },
            isActive: true
          }
        })

        if (labTests.length === 0) {
        } else {
          // Create lab requests one by one for better error tracking
          for (const test of labTests) {

            const labRequest = await tx.labRequest.create({
              data: {
                appointmentId: appointmentId,
                patientId: appointment.patientId,
                orderedBy: appointment.doctorId,
                testCatalogId: test.id,
                testName: test.name,
                testPrice: test.price,
                status: 'PENDING_PAYMENT',
                priority: 'ROUTINE',
                notes: `Ordered during consultation by Dr. ${appointment.doctor.user.name}`,
              }
            })

            createdLabRequestCount++
          }

        }
      } else {
      }

      return { updatedAppointment, createdLabRequestCount }
    })

    const { updatedAppointment, createdLabRequestCount } = result

    // Revalidate the OPD page to show updated stats
    revalidatePath("/dashboard/clinical/opd")

    writeAuditLog({ userId: authResult.session.userId, action: "UPDATE", module: "Consultation", recordId: appointmentId, changes: {} })

    return {
      success: true,
      error: false,
      message: `Consultation completed for ${appointment.patient.user.name}${createdLabRequestCount > 0 ? ` with ${createdLabRequestCount} lab test(s) ordered` : ''}`,
      appointmentId: updatedAppointment.id,
      labRequestsCreated: createdLabRequestCount,
    }
  } catch (_err: unknown) {
    const error = _err as ServerActionError

    return {
      success: false,
      error: true,
      message: `Error: ${error?.message || "Failed to update consultation. Please try again."}`,
    }
  }
}

/**
 * Generate invoice from appointment and line items
 * @param appointmentId - The appointment ID
 * @param patientId - The patient ID
 * @param items - Array of invoice items
 * @param labRequestIds - Array of lab request IDs to update status after payment
 */
export async function generateInvoice(
  appointmentId: string,
  patientId: string,
  items: Array<{ description: string; quantity: number; unitPrice: number }>,
  labRequestIds: string[] = []
) {
  const authResult = await requireAuthSafe(["SUPER_ADMIN", "ACCOUNTANT", "RECEPTIONIST"])
  if (!authResult.ok) return { success: false, message: authResult.error }

  try {

    // Validate items
    if (!items || items.length === 0) {
      return {
        success: false,
        error: true,
        message: "No items provided for invoice",
      }
    }

    // Check if invoice already exists for this appointment
    const existingBilling = await prisma.billing.findFirst({
      where: { appointmentId },
    })

    if (existingBilling) {
      return {
        success: false,
        error: true,
        message: "Invoice already exists for this appointment",
      }
    }

    // Generate bill number (format: BILL-YYYY-NNNN)
    const currentYear = new Date().getFullYear()
    const lastBill = await prisma.billing.findFirst({
      where: { billNumber: { startsWith: `BILL-${currentYear}-` } },
      orderBy: { billNumber: 'desc' }
    })
    const lastSeq = lastBill?.billNumber ? parseInt(lastBill.billNumber.split('-')[2]) || 0 : 0
    const billNumber = `BILL-${currentYear}-${String(lastSeq + 1).padStart(4, "0")}`

    // Calculate totals — no GST on lab tests; tax only applies to medicines
    const totalAmount = items.reduce(
      (sum, item) => sum + item.quantity * item.unitPrice,
      0
    )
    const taxAmount = 0 // No GST on lab tests or services
    const netAmount = totalAmount

    // Use a transaction to create billing and update lab requests atomically
    const result = await prisma.$transaction(async (tx) => {
      // Create billing with items
      const billing = await tx.billing.create({
        data: {
          billNumber,
          patientId,
          appointmentId,
          type: BillingType.PHARMACY, // Pharmacy billing
          billDate: new Date(),
          totalAmount,
          taxAmount,
          netAmount,
          balanceAmount: netAmount, // Initially, full amount is balance
          status: "PENDING",
          items: {
            create: items.map((item) => {
              const itemTotal = item.quantity * item.unitPrice

              return {
                description: item.description,
                quantity: item.quantity,
                unitPrice: item.unitPrice,
                amount: itemTotal,
                gstRate: 0,
                gstAmount: 0,
                totalAmount: itemTotal,
              }
            }),
          },
        },
        include: {
          items: true,
        },
      })

      // Update lab requests status to PAID_PENDING_SAMPLE
      if (labRequestIds.length > 0) {
        await tx.labRequest.updateMany({
          where: {
            id: { in: labRequestIds }
          },
          data: {
            status: 'PAID_PENDING_SAMPLE',
            billingId: billing.id,
          }
        })
      }

      return billing
    })

    // Revalidate relevant pages
    revalidatePath("/dashboard/pharmacy/pos")
    revalidatePath("/dashboard/finance/billing")
    revalidatePath("/dashboard/laboratory")

    writeAuditLog({ userId: authResult.session.userId, action: "CREATE", module: "Invoice", recordId: result.id, changes: { billNumber: result.billNumber } })

    return {
      success: true,
      error: false,
      message: "Invoice generated successfully",
      billingId: result.id,
      billNumber: result.billNumber,
    }
  } catch (_err: unknown) {
    const error = _err as ServerActionError

    return {
      success: false,
      error: true,
      message: `Error: ${error?.message || "Failed to generate invoice. Please try again."}`,
    }
  }
}

// ============================================
// PHARMACY INVENTORY MANAGEMENT
// ============================================

/**
 * Add new inventory batch (Purchase Entry)
 */
export async function addInventory(prevState: Record<string, unknown> | null, formData: FormData) {
  const authResult = await requireAuthSafe(["SUPER_ADMIN", "PHARMACIST"])
  if (!authResult.ok) return { success: false, message: authResult.error }

  try {
    // Extract form data
    const medicineName = formData.get("medicineName") as string
    const manufacturer = formData.get("manufacturer") as string
    const genericName = formData.get("genericName") as string
    const minStockLevel = parseInt(formData.get("minStockLevel") as string) || 10

    const batchNumber = formData.get("batchNumber") as string
    const expiryDateStr = formData.get("expiryDate") as string
    const quantity = parseInt(formData.get("quantity") as string)
    const costPrice = parseFloat(formData.get("costPrice") as string)
    const sellingPrice = parseFloat(formData.get("sellingPrice") as string)
    const mrpPerStrip = parseFloat(formData.get("mrpPerStrip") as string) || sellingPrice
    const vendor = formData.get("vendor") as string
    const rackNumber = formData.get("rackNumber") as string

    // Validate required fields
    if (!medicineName || !batchNumber || !expiryDateStr || !quantity || !costPrice || !mrpPerStrip) {
      return {
        success: false,
        error: true,
        message: "Please fill all required fields.",
      }
    }

    // Parse expiry date
    const expiryDate = new Date(expiryDateStr)
    if (isNaN(expiryDate.getTime())) {
      return {
        success: false,
        error: true,
        message: "Invalid expiry date format.",
      }
    }

    // Check if expiry date is in the past
    if (expiryDate < new Date()) {
      return {
        success: false,
        error: true,
        message: "Expiry date cannot be in the past.",
      }
    }

    // Check if medicine exists, create if not
    let medicine = await prisma.medicine.findFirst({
      where: {
        name: {
          equals: medicineName,
          mode: "insensitive",
        },
      },
    })

    if (!medicine) {
      // Create new medicine
      medicine = await prisma.medicine.create({
        data: {
          name: medicineName,
          manufacturer: manufacturer || null,
          genericName: genericName || "",
          unitPrice: sellingPrice || 0,
          minStockLevel,
          isActive: true,
        },
      })
    } else {
    }

    // Check if batch number already exists for this medicine
    const existingBatch = await prisma.inventoryBatch.findFirst({
      where: {
        medicineId: medicine.id,
        batchNumber: batchNumber,
      },
    })

    if (existingBatch) {
      return {
        success: false,
        error: true,
        message: `Batch number ${batchNumber} already exists for this medicine.`,
      }
    }

    // Find or create a default supplier
    let supplier = await prisma.supplier.findFirst({
      where: vendor ? { name: { contains: vendor, mode: "insensitive" } } : { isActive: true },
    })

    if (!supplier) {
      supplier = await prisma.supplier.create({
        data: {
          name: vendor || "Default Supplier",
          isActive: true,
        },
      })
    }

    // Create inventory batch via centralized service
    const { result: batch } = await addToInventory(prisma, {
      medicineId: medicine.id,
      batchNumber,
      supplierId: supplier.id,
      paidStrips: quantity,
      packSize: 1,
      purchasePricePerStrip: costPrice,
      sellingPricePerStrip: sellingPrice,
      expiryDate,
    })

    // Revalidate inventory pages
    revalidatePath("/dashboard/pharmacy/inventory")
    revalidatePath("/dashboard/pharmacy/inventory/add")

    writeAuditLog({ userId: authResult.session.userId, action: "CREATE", module: "Inventory", recordId: medicine.id, changes: { name: medicineName, batchNumber, quantity } })

    return {
      success: true,
      error: false,
      message: `Successfully added ${quantity} units of ${medicineName} (Batch: ${batchNumber})`,
      medicineId: medicine.id,
      batchId: batch.id,
    }
  } catch (_err: unknown) {
    const error = _err as ServerActionError

    return {
      success: false,
      error: true,
      message: `Error: ${error?.message || "Failed to add inventory. Please try again."}`,
    }
  }
}

// ============================================
// PHARMACY POS - PROCESS SALE
// ============================================

interface CartItem {
  batchId: string
  medicineId: string
  medicineName: string
  batchNumber: string
  expiryDate: Date
  availableStock: number
  unitPrice: number
  quantity: number // Units sold
  taxRate: number
  subtotal: number
  taxAmount: number
  total: number
}

interface PaymentDetail {
  mode: "CASH" | "UPI" | "CARD" | "SPLIT" | "CREDIT"
  cashAmount?: number
  upiAmount?: number
  cardAmount?: number
}

export async function processPharmacySale(
  patientId: string | null,
  cartItems: CartItem[],
  paymentDetails: PaymentDetail,
  appointmentId?: string | null,
  labTestIds?: string[] | null,
  discountAmount: number = 0,
  roundOff: number = 0,
  pharmacyCustomerId?: string | null,
  backDate?: string | null // ISO string of the back date, if back-dating
) {
  const authResult = await requireAuthSafe(["SUPER_ADMIN", "PHARMACIST"])
  if (!authResult.ok) return { success: false, message: authResult.error }

  try {
    // Validate back date if provided
    let resolvedBillDate = new Date()
    let isBackDated = false
    if (backDate) {
      const parsedDate = new Date(backDate)
      if (isNaN(parsedDate.getTime())) {
        return { success: false, error: true, message: "Invalid back date provided." }
      }
      if (parsedDate > new Date()) {
        return { success: false, error: true, message: "Back date cannot be in the future." }
      }
      const oneYearAgo = new Date()
      oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1)
      if (parsedDate < oneYearAgo) {
        return { success: false, error: true, message: "Back date cannot be older than 1 year." }
      }
      resolvedBillDate = parsedDate
      isBackDated = true
    }

    // Validate inputs - allow empty cart if lab tests exist
    const hasLabTests = labTestIds && labTestIds.length > 0
    if ((!cartItems || cartItems.length === 0) && !hasLabTests) {
      return {
        success: false,
        error: true,
        message: "Cart is empty. Please add items to proceed.",
      }
    }

    // Fetch lab tests if IDs provided
    let labTestsData: Array<{ id: string; testName: string; testPrice: number }> = []
    if (labTestIds && labTestIds.length > 0) {
      const fetchedLabTests = await prisma.labRequest.findMany({
        where: {
          id: { in: labTestIds },
          status: "PENDING_PAYMENT",
        },
      })
      labTestsData = fetchedLabTests.map(t => ({
        id: t.id,
        testName: t.testName,
        testPrice: t.testPrice,
      }))
    }

    // Calculate totals (including lab tests)
    const medicineSubtotal = cartItems?.reduce((sum, item) => sum + item.subtotal, 0) || 0
    const medicineTotal = cartItems?.reduce((sum, item) => sum + item.total, 0) || 0
    const medicineTax = cartItems?.reduce((sum, item) => sum + item.taxAmount, 0) || 0
    const labTestsTotal = labTestsData.reduce((sum, test) => sum + test.testPrice, 0)

    const subtotal = medicineSubtotal + labTestsTotal
    const totalTax = medicineTax // No GST on lab tests
    const grandTotal = medicineTotal + labTestsTotal // Item-level discounts already in medicineTotal

    // Determine patient (walk-in if no patientId)
    let finalPatientId = patientId
    if (!patientId || patientId === "none") {
      // First, find or create the walk-in user
      let walkInUser = await prisma.user.findUnique({
        where: { email: "walkin@hospital.com" },
      })

      if (!walkInUser) {
        walkInUser = await prisma.user.create({
          data: {
            name: "Walk-In Customer",
            email: "walkin@hospital.com",
            password: "N/A",
            role: "PATIENT",
            isActive: true,
          },
        })
      }

      // Look up by EITHER patientId or userId to avoid unique constraint clash
      const existingPatient = await prisma.patient.findFirst({
        where: {
          OR: [
            { patientId: "PAT-WALKIN" },
            { userId: walkInUser.id },
          ],
        },
      })

      if (existingPatient) {
        // Ensure the canonical patientId is set (self-heal if it was renamed)
        if (existingPatient.patientId !== "PAT-WALKIN") {
          await prisma.patient.update({
            where: { id: existingPatient.id },
            data: { patientId: "PAT-WALKIN" },
          })
        }
        finalPatientId = existingPatient.id
      } else {
        const newWalkInPatient = await prisma.patient.create({
          data: {
            userId: walkInUser.id,
            patientId: "PAT-WALKIN",
            phone: "0000000000",
            gender: "OTHER",
            address: "N/A",
          },
        })
        finalPatientId = newWalkInPatient.id
      }
    }

    // Determine payment method (keep as literal for schema) and notes for SPLIT
    const paymentMethod = paymentDetails.mode
    const notes =
      paymentDetails.mode === "SPLIT"
        ? `SPLIT (Cash: ₹${paymentDetails.cashAmount || 0}, UPI: ₹${paymentDetails.upiAmount || 0}, Card: ₹${paymentDetails.cardAmount || 0})`
        : appointmentId
          ? "Prescription Dispensed"
          : patientId
            ? "Pharmacy Sale"
            : "Walk-In Sale"

    // Check if this patient is currently admitted under BSKY (cashless)
    const activeBskyAdmission = finalPatientId
      ? await prisma.iPDAdmission.findFirst({
        where: {
          patientId: finalPatientId,
          status: "ADMITTED",
          isBskyAdmission: true,
        },
      })
      : null
    const isBskyIpd = !!activeBskyAdmission
    const isCredit = paymentMethod === "CREDIT"

    // Process the sale in a transaction
    const result = await prisma.$transaction(async (tx) => {
      // Generate bill number INSIDE transaction to prevent race conditions
      const currentYear = new Date().getFullYear()
      const lastBill = await tx.billing.findFirst({
        where: {
          billNumber: { startsWith: `BILL-${currentYear}-` },
        },
        orderBy: { billNumber: 'desc' },
      })
      const lastSequence = lastBill?.billNumber
        ? parseInt(lastBill.billNumber.split("-")[2])
        : 0
      const billNumber = `BILL-${currentYear}-${String(lastSequence + 1).padStart(4, "0")}`

      // Determine net payable
      const netPayable = grandTotal - discountAmount + roundOff

      // 1. Create the billing record (link to appointment if provided)
      // Build notes string (append back-date marker if applicable)
      let finalNotes = isBskyIpd ? `${notes} [BSKY Cashless — Govt. Claim]` : isCredit ? `${notes} [CREDIT]` : notes
      if (isBackDated) {
        finalNotes = `${finalNotes} [BACK-DATED: ${resolvedBillDate.toISOString()}]`
      }

      const billing = await tx.billing.create({
        data: {
          billNumber,
          patientId: finalPatientId!,
          appointmentId: appointmentId || undefined,
          pharmacyCustomerId: pharmacyCustomerId || undefined,
          type: BillingType.PHARMACY,
          billDate: resolvedBillDate,
          totalAmount: subtotal,
          discountAmount: discountAmount,
          taxAmount: totalTax,
          roundOff: roundOff,
          netAmount: netPayable,
          paidAmount: isBskyIpd || isCredit ? 0 : netPayable,
          balanceAmount: isBskyIpd || isCredit ? netPayable : 0,
          status: isBskyIpd ? "PENDING_GOVERNMENT_PAYMENT" : isCredit ? BillingStatus.PENDING : BillingStatus.PAID,
          paymentMethod: isBskyIpd ? "INSURANCE" : (paymentMethod as any),
          notes: finalNotes,
          // Structured split payment amounts
          ...(paymentDetails.mode === "SPLIT" && {
            splitCashAmount: paymentDetails.cashAmount || 0,
            splitUpiAmount: paymentDetails.upiAmount || 0,
            splitCardAmount: paymentDetails.cardAmount || 0,
          }),
        },
      })

      // 2. Create billing items and deduct stock for medicines
      if (cartItems && cartItems.length > 0) {
        for (const item of cartItems) {
          const batch = await tx.inventoryBatch.findUnique({
            where: { id: item.batchId },
          })

          if (!Number.isInteger(item.quantity) || item.quantity < 1) {
            throw new Error("Quantity must be a whole number of at least 1")
          }
          if (!batch || batch.medicineId !== item.medicineId) {
            throw new Error("Selected inventory batch does not belong to this medicine")
          }
          if (!batch.isActive || batch.isExpired || batch.expiryDate <= new Date()) {
            throw new Error(`Batch ${batch.batchNumber} is expired or inactive and cannot be sold`)
          }

          const unitCost = batch.purchasePrice || 0
          const costAmount = Math.round(item.quantity * unitCost * 100) / 100

          // Create billing item
          await tx.billingItem.create({
            data: {
              billingId: billing.id,
              description: `${item.medicineName} (Batch: ${item.batchNumber}) - ${item.quantity} unit(s)`,
              quantity: item.quantity,
              unitPrice: item.unitPrice,
              amount: item.subtotal,
              gstRate: item.taxRate,
              gstAmount: item.taxAmount,
              totalAmount: item.total,
              referenceId: item.batchId,
              serviceCategory: "PHARMACY",
              unitCost,
              costAmount,
            },
          })

          // Deduct stock from inventory batch

          await deductFromInventory(tx, {
            batchId: item.batchId,
            units: item.quantity,
          })
        }
      }

      // 3. Create billing items for lab tests and update their status
      if (labTestsData.length > 0) {

        for (const test of labTestsData) {
          // Create billing item for lab test
          await tx.billingItem.create({
            data: {
              billingId: billing.id,
              description: `Lab Test: ${test.testName}`,
              quantity: 1,
              unitPrice: test.testPrice,
              amount: test.testPrice,
              gstRate: 0, // No GST on medical tests
              gstAmount: 0,
              totalAmount: test.testPrice,
            },
          })
        }

        // Update lab request status to PAID_PENDING_SAMPLE (now visible to lab tech)
        await tx.labRequest.updateMany({
          where: {
            id: { in: labTestsData.map(t => t.id) },
          },
          data: {
            status: "PAID_PENDING_SAMPLE",
            billingId: billing.id,
          },
        })

      }

      // 4. If appointmentId provided, mark appointment as having billing (prescription dispensed)
      if (appointmentId) {
        // Get current appointment
        const currentAppointment = await tx.appointment.findUnique({
          where: { id: appointmentId },
        })

        if (currentAppointment) {
          const updatedNotes = currentAppointment.notes
            ? `${currentAppointment.notes}\n[Dispensed: ${billNumber}]`
            : `[Dispensed: ${billNumber}]`

          await tx.appointment.update({
            where: { id: appointmentId },
            data: {
              status: "COMPLETED",
              notes: updatedNotes,
            },
          })
        }
      }

      // 5. If CREDIT: create a CreditEntry (Receivable)
      if (isCredit && netPayable > 0) {
        // Determine party name
        let creditPartyName = "Walk-In Customer"
        if (pharmacyCustomerId) {
          const pc = await tx.pharmacyCustomer.findUnique({ where: { id: pharmacyCustomerId } })
          if (pc) creditPartyName = pc.name
        } else if (finalPatientId) {
          const pat = await tx.patient.findUnique({
            where: { id: finalPatientId },
            include: { user: { select: { name: true } } },
          })
          if (pat && pat.patientId !== "PAT-WALKIN") {
            creditPartyName = pat.user?.name || pat.patientId + " - " + (pat.phone || "Pharmacy")
          }
        }

        await tx.creditEntry.create({
          data: {
            type: "RECEIVABLE",
            partyName: creditPartyName,
            partyType: pharmacyCustomerId ? "OTHER" : "PATIENT",
            partyId: finalPatientId,
            referenceId: billing.id,
            referenceType: "BILLING",
            totalAmount: netPayable,
            balanceAmount: netPayable,
            status: "OPEN",
            notes: `Pharmacy credit – ${billNumber}`,
          },
        })
      }

      // 6. Record financial transaction(s) in pharmacy ledger
      // Skip for credit sales (no money collected) and BSKY (handled via insurance)
      if (!isCredit && !isBskyIpd && netPayable > 0) {
        if (paymentMethod === "SPLIT") {
          // Create individual transactions for each split sub-method
          const splitParts: { method: string; amount: number }[] = []
          if ((paymentDetails.cashAmount || 0) > 0) splitParts.push({ method: "CASH", amount: paymentDetails.cashAmount! })
          if ((paymentDetails.upiAmount || 0) > 0) splitParts.push({ method: "UPI", amount: paymentDetails.upiAmount! })
          if ((paymentDetails.cardAmount || 0) > 0) splitParts.push({ method: "CARD", amount: paymentDetails.cardAmount! })

          for (const part of splitParts) {
            const accountId = await resolveFinancialAccount(tx, part.method, "PHARMACY")
            if (accountId) {
              await tx.transaction.create({
                data: {
                  accountId,
                  type: "INCOME",
                  amount: part.amount,
                  category: "PHARMACY_SALE",
                  paymentMethod: part.method,
                  scope: "PHARMACY",
                  referenceId: billing.id,
                  description: `Pharmacy sale (split ${part.method.toLowerCase()}) - ${billNumber}`,
                  accountGroupCode: "4150", // Pharmacy Revenue
                  billingType: "PHARMACY",
                },
              })
              await tx.financialAccount.update({
                where: { id: accountId },
                data: { currentBalance: { increment: part.amount } },
              })
            }
          }
        } else {
          // Single payment method
          const accountId = await resolveFinancialAccount(tx, paymentMethod, "PHARMACY")
          if (accountId) {
            await tx.transaction.create({
              data: {
                accountId,
                type: "INCOME",
                amount: netPayable,
                category: "PHARMACY_SALE",
                paymentMethod: paymentMethod,
                scope: "PHARMACY",
                referenceId: billing.id,
                description: `Pharmacy sale - ${billNumber}`,
                accountGroupCode: "4150", // Pharmacy Revenue
                billingType: "PHARMACY",
              },
            })
            await tx.financialAccount.update({
              where: { id: accountId },
              data: { currentBalance: { increment: netPayable } },
            })
          }
        }
      }

      return billing
    })

    // Get patient details for printing
    const patient = await prisma.patient.findUnique({
      where: { id: finalPatientId! },
      include: { user: true },
    })

    // Get pharmacy customer details if linked
    let pharmacyCustomer = null
    if (pharmacyCustomerId) {
      pharmacyCustomer = await prisma.pharmacyCustomer.findUnique({
        where: { id: pharmacyCustomerId },
      })
    }

    // Revalidate relevant pages
    revalidatePath("/dashboard/pharmacy/pos/billing")
    revalidatePath("/dashboard/pharmacy/pos")
    revalidatePath("/dashboard/pharmacy/queue")
    revalidatePath("/dashboard/pharmacy/inventory")
    revalidatePath("/dashboard/finance/billing")
    revalidatePath("/dashboard/laboratory") // Lab tests now visible after payment

    writeAuditLog({ userId: authResult.session.userId, action: "PROCESS", module: "PharmacySale", recordId: result.id, changes: { billNumber: result.billNumber, grandTotal } })

    // Determine display name
    let displayName = "Walk-In Customer"
    if (pharmacyCustomer) {
      displayName = pharmacyCustomer.name
    } else if (patient && patient.patientId !== "PAT-WALKIN") {
      displayName = (patient as any).user?.name || patient.patientId
    }

    return {
      success: true,
      error: false,
      message: `Sale completed! Bill Number: ${result.billNumber}`,
      billNumber: result.billNumber,
      billingId: result.id,
      grandTotal,
      patientName: displayName,
      patientId: patient?.patientId,
      pharmacyCustomer: pharmacyCustomer ? {
        name: pharmacyCustomer.name,
        phone: pharmacyCustomer.phone,
        address: pharmacyCustomer.address,
      } : null,
    }
  } catch (_err: unknown) {
    const error = _err as ServerActionError

    return {
      success: false,
      error: true,
      message: `Error: ${error?.message || "Failed to process sale. Please try again."}`,
    }
  }
}

// ============================================
// LABORATORY MANAGEMENT
// ============================================

/**
 * Collect sample for a lab request
 * Updates status from PAID_PENDING_SAMPLE to SAMPLE_COLLECTED
 */
export async function collectSample(requestId: string) {
  const authResult = await requireAuthSafe(["SUPER_ADMIN", "LAB_TECHNICIAN"])
  if (!authResult.ok) return { success: false, message: authResult.error }

  try {

    // Verify request exists and is in correct status
    const request = await prisma.labRequest.findUnique({
      where: { id: requestId },
      include: {
        patient: {
          include: {
            user: true,
          },
        },
      },
    })

    if (!request) {
      return {
        success: false,
        error: true,
        message: "Lab request not found",
      }
    }

    const isBilled = request.status === 'PAID_PENDING_SAMPLE' || !!request.billingId
    if (!isBilled) {
      return {
        success: false,
        error: true,
        message: `Cannot collect sample. Test has not been billed yet. Current status: ${request.status}`,
      }
    }

    // Update status to SAMPLE_COLLECTED
    await prisma.labRequest.update({
      where: { id: requestId },
      data: {
        status: 'SAMPLE_COLLECTED',
      },
    })

    // Revalidate all relevant paths
    revalidatePath("/dashboard/laboratory")
    revalidatePath("/dashboard/lab/queue")
    revalidatePath("/dashboard/lab/pathology/queue")
    revalidatePath("/dashboard/lab/radiology/queue")
    revalidatePath("/dashboard/radiology/queue")

    writeAuditLog({ userId: authResult.session.userId, action: "PROCESS", module: "LabSample", recordId: requestId, changes: { testName: request.testName } })

    return {
      success: true,
      error: false,
      message: `Sample collected for ${request.testName}`,
    }
  } catch (_err: unknown) {
    const error = _err as ServerActionError

    return {
      success: false,
      error: true,
      message: `Error: ${error?.message || "Failed to collect sample. Please try again."}`,
    }
  }
}

/**
 * Enter lab result and mark test as COMPLETED
 */
export async function enterLabResult(
  requestId: string,
  resultData: {
    testName: string
    resultValue: string
    unit: string | null
    normalRange: string | null
    remarks: string | null
  }
) {
  const authResult = await requireAuthSafe(["SUPER_ADMIN", "LAB_TECHNICIAN"])
  if (!authResult.ok) return { success: false, message: authResult.error }

  try {

    // Verify request exists and is in correct status
    const request = await prisma.labRequest.findUnique({
      where: { id: requestId },
      include: {
        patient: {
          include: {
            user: true,
          },
        },
      },
    })

    if (!request) {
      return {
        success: false,
        error: true,
        message: "Lab request not found",
      }
    }

    if (request.status !== 'SAMPLE_COLLECTED') {
      return {
        success: false,
        error: true,
        message: `Cannot enter result. Current status: ${request.status}`,
      }
    }

    // Use transaction to create result and update request status
    await prisma.$transaction(async (tx) => {
      // Create lab result
      await tx.labResult.create({
        data: {
          requestId: requestId,
          testName: resultData.testName,
          resultValue: resultData.resultValue,
          unit: resultData.unit,
          normalRange: resultData.normalRange,
          remarks: resultData.remarks,
          enteredAt: new Date(),
        },
      })

      // Update request status to COMPLETED
      await tx.labRequest.update({
        where: { id: requestId },
        data: {
          status: 'COMPLETED',
        },
      })
    })

    // Revalidate lab dashboard
    revalidatePath("/dashboard/laboratory")

    writeAuditLog({ userId: authResult.session.userId, action: "CREATE", module: "LabResult", recordId: requestId, changes: { testName: request.testName } })

    return {
      success: true,
      error: false,
      message: `Result entered successfully for ${request.testName}`,
    }
  } catch (_err: unknown) {
    const error = _err as ServerActionError

    return {
      success: false,
      error: true,
      message: `Error: ${error?.message || "Failed to enter result. Please try again."}`,
    }
  }
}

/**
 * Enhanced invoice generation with auto-creation of lab requests for paper prescriptions
 * @param appointmentId - The appointment ID
 * @param patientId - The patient ID
 * @param doctorId - The doctor ID (for creating lab requests)
 * @param items - Array of invoice items
 * @param labRequestIds - Array of existing lab request IDs to update status
 * @param newLabTests - Array of new lab tests to create (from manual entry)
 */
export async function generateInvoiceWithAutoCreate(
  appointmentId: string,
  patientId: string,
  doctorId: string,
  items: Array<{ description: string; quantity: number; unitPrice: number }>,
  labRequestIds: string[] = [],
  newLabTests: Array<{ testCatalogId: string; testName: string; testPrice: number }> = []
) {
  const authResult = await requireAuthSafe(["SUPER_ADMIN", "ACCOUNTANT", "RECEPTIONIST"])
  if (!authResult.ok) return { success: false, message: authResult.error }

  try {

    // Validate items
    if (!items || items.length === 0) {
      return {
        success: false,
        error: true,
        message: "No items provided for invoice",
      }
    }

    // Check if invoice already exists for this appointment
    const existingBilling = await prisma.billing.findFirst({
      where: { appointmentId },
    })

    if (existingBilling) {
      return {
        success: false,
        error: true,
        message: "Invoice already exists for this appointment",
      }
    }

    // Generate bill number (format: BILL-YYYY-NNNN)
    const currentYear = new Date().getFullYear()
    const lastBill = await prisma.billing.findFirst({
      where: { billNumber: { startsWith: `BILL-${currentYear}-` } },
      orderBy: { billNumber: 'desc' }
    })
    const lastSeq = lastBill?.billNumber ? parseInt(lastBill.billNumber.split('-')[2]) || 0 : 0
    const billNumber = `BILL-${currentYear}-${String(lastSeq + 1).padStart(4, "0")}`

    // Calculate totals — no GST on lab tests; tax only applies to medicines
    const totalAmount = items.reduce(
      (sum, item) => sum + item.quantity * item.unitPrice,
      0
    )
    const taxAmount = 0 // No GST on lab tests or services
    const netAmount = totalAmount

    // Check if this patient is currently admitted under BSKY (cashless)
    const activeBskyAdmission = await prisma.iPDAdmission.findFirst({
      where: {
        patientId,
        status: "ADMITTED",
        isBskyAdmission: true,
      },
    })
    const isBskyIpd = !!activeBskyAdmission

    // Use a transaction to create billing, update existing lab requests, and create new lab requests
    const result = await prisma.$transaction(async (tx) => {
      // Create billing with items
      const billing = await tx.billing.create({
        data: {
          billNumber,
          patientId,
          appointmentId,
          type: BillingType.PHARMACY,
          billDate: new Date(),
          totalAmount,
          taxAmount,
          netAmount,
          balanceAmount: netAmount,
          status: isBskyIpd ? "PENDING_GOVERNMENT_PAYMENT" : "PENDING",
          items: {
            create: items.map((item) => {
              const itemTotal = item.quantity * item.unitPrice
              const gstAmount = itemTotal * 0.18
              const totalWithGst = itemTotal + gstAmount

              return {
                description: item.description,
                quantity: item.quantity,
                unitPrice: item.unitPrice,
                amount: itemTotal,
                gstRate: 18,
                gstAmount,
                totalAmount: totalWithGst,
              }
            }),
          },
        },
        include: {
          items: true,
        },
      })

      // Update existing lab requests status to PAID_PENDING_SAMPLE
      let updatedCount = 0
      if (labRequestIds.length > 0) {

        const updateResult = await tx.labRequest.updateMany({
          where: {
            id: { in: labRequestIds }
          },
          data: {
            status: 'PAID_PENDING_SAMPLE',
            billingId: billing.id,
          }
        })
        updatedCount = updateResult.count
      }

      // Create new lab requests for manually entered tests (paper prescription)
      let createdCount = 0
      if (newLabTests.length > 0) {

        // Create lab requests one by one for better error tracking
        for (const test of newLabTests) {

          const labRequest = await tx.labRequest.create({
            data: {
              appointmentId: appointmentId,
              patientId: patientId,
              orderedBy: doctorId,
              testCatalogId: test.testCatalogId,
              testName: test.testName,
              testPrice: test.testPrice,
              status: 'PAID_PENDING_SAMPLE', // Immediately PAID since billing is being created
              billingId: billing.id,
              priority: 'ROUTINE',
              notes: 'Paper prescription - Manual entry at billing',
            }
          })

          createdCount++
        }

      } else {
      }

      // Log summary

      return billing
    })

    // Revalidate relevant pages
    revalidatePath("/dashboard/pharmacy/pos")
    revalidatePath("/dashboard/finance/billing")
    revalidatePath("/dashboard/laboratory")

    return {
      success: true,
      error: false,
      message: "Invoice generated successfully",
      billingId: result.id,
      billNumber: result.billNumber,
    }
  } catch (_err: unknown) {
    const error = _err as ServerActionError

    return {
      success: false,
      error: true,
      message: `Error: ${error?.message || "Failed to generate invoice. Please try again."}`,
    }
  }
}

// ============================================
// LAB TEST CATALOG MANAGEMENT (ADMIN)
// ============================================

/**
 * Create a new lab test in the catalog
 */
export async function createLabTest(data: {
  name: string
  code: string
  price: number
  category: string | null
  unit: string | null
  normalRange: string | null
  description: string | null
  isActive: boolean
  type?: "PATHOLOGY" | "RADIOLOGY"
  parameters?: any
}) {
  const authResult = await requireAuthSafe(["SUPER_ADMIN"])
  if (!authResult.ok) return { success: false, message: authResult.error }

  try {

    // Check if code already exists
    const existing = await prisma.labTestCatalog.findUnique({
      where: { code: data.code }
    })

    if (existing) {
      return {
        success: false,
        error: true,
        message: `Test code "${data.code}" already exists`,
      }
    }

    // Create test
    const test = await prisma.labTestCatalog.create({
      data: {
        name: data.name,
        code: data.code,
        price: data.price,
        category: data.category,
        unit: data.unit,
        normalRange: data.normalRange,
        type: data.type || "PATHOLOGY",
        description: data.description,
        isActive: data.isActive,
        parameters: data.parameters ?? undefined,
      }
    })

    // Revalidate pages
    revalidatePath("/dashboard/admin/settings/lab-tests")
    revalidatePath("/dashboard/clinical/opd")
    revalidatePath("/dashboard/finance/billing/create")

    writeAuditLog({ userId: authResult.session.userId, action: "CREATE", module: "LabTest", recordId: test.id, changes: { name: data.name, type: data.type } })

    return {
      success: true,
      error: false,
      message: "Lab test created successfully",
      testId: test.id,
    }
  } catch (_err: unknown) {
    const error = _err as ServerActionError

    return {
      success: false,
      error: true,
      message: `Error: ${error?.message || "Failed to create lab test. Please try again."}`,
    }
  }
}

/**
 * Update an existing lab test
 */
export async function updateLabTest(
  testId: string,
  data: {
    name: string
    code: string
    price: number
    category: string | null
    unit: string | null
    normalRange: string | null
    description: string | null
    isActive: boolean
    type?: "PATHOLOGY" | "RADIOLOGY"
    parameters?: any
  }
) {
  const authResult = await requireAuthSafe(["SUPER_ADMIN"])
  if (!authResult.ok) return { success: false, message: authResult.error }

  try {

    // Check if code is being changed to one that already exists
    const existing = await prisma.labTestCatalog.findUnique({
      where: { code: data.code }
    })

    if (existing && existing.id !== testId) {
      return {
        success: false,
        error: true,
        message: `Test code "${data.code}" is already used by another test`,
      }
    }

    const test = await prisma.labTestCatalog.update({
      where: { id: testId },
      data: {
        name: data.name,
        code: data.code,
        price: data.price,
        category: data.category,
        unit: data.unit,
        normalRange: data.normalRange,
        description: data.description,
        isActive: data.isActive,
        parameters: data.parameters !== undefined ? (data.parameters as any ?? null) : undefined,
      }
    })

    // Revalidate pages
    revalidatePath("/dashboard/admin/settings/lab-tests")
    revalidatePath("/dashboard/clinical/opd")
    revalidatePath("/dashboard/finance/billing/create")

    writeAuditLog({ userId: authResult.session.userId, action: "UPDATE", module: "LabTest", recordId: test.id, changes: { name: test.name } })

    return {
      success: true,
      error: false,
      message: "Lab test updated successfully",
    }
  } catch (_err: unknown) {
    const error = _err as ServerActionError

    return {
      success: false,
      error: true,
      message: `Error: ${error?.message || "Failed to update lab test. Please try again."}`,
    }
  }
}

/**
 * Upsert (Create or Update) a lab test
 * This is a convenience function that combines createLabTest and updateLabTest
 */
export async function upsertLabTest(data: {
  id?: string
  name: string
  code: string
  price: number
  category: string | null
  unit: string | null
  normalRange: string | null
  description: string | null
  isActive: boolean
  parameters?: any
}) {
  const authResult = await requireAuthSafe(["SUPER_ADMIN"])
  if (!authResult.ok) return { success: false, message: authResult.error }

  if (data.id) {
    return await updateLabTest(data.id, {
      name: data.name,
      code: data.code,
      price: data.price,
      category: data.category,
      unit: data.unit,
      normalRange: data.normalRange,
      description: data.description,
      isActive: data.isActive,
      parameters: data.parameters,
    })
  } else {
    return await createLabTest({
      name: data.name,
      code: data.code,
      price: data.price,
      category: data.category,
      unit: data.unit,
      normalRange: data.normalRange,
      description: data.description,
      isActive: data.isActive,
      parameters: data.parameters,
    })
  }
}

/**
 * Delete a lab test from the catalog
 */
export async function deleteLabTest(testId: string) {
  const authResult = await requireAuthSafe(["SUPER_ADMIN"])
  if (!authResult.ok) return { success: false, message: authResult.error }

  try {

    // Check if test is used in any lab requests
    const requestCount = await prisma.labRequest.count({
      where: { testCatalogId: testId }
    })

    if (requestCount > 0) {
      return {
        success: false,
        error: true,
        message: `Cannot delete: This test is used in ${requestCount} lab request(s). Consider marking it as inactive instead.`,
      }
    }

    // Delete test
    await prisma.labTestCatalog.delete({
      where: { id: testId }
    })

    // Revalidate pages
    revalidatePath("/dashboard/admin/settings/lab-tests")

    writeAuditLog({ userId: authResult.session.userId, action: "DELETE", module: "LabTest", recordId: testId, changes: {} })

    return {
      success: true,
      error: false,
      message: "Lab test deleted successfully",
    }
  } catch (_err: unknown) {
    const error = _err as ServerActionError

    return {
      success: false,
      error: true,
      message: `Error: ${error?.message || "Failed to delete lab test. Please try again."}`,
    }
  }
}

// ============================================
// SMART BILLING (Universal Invoice Creation)
// ============================================

/**
 * Create smart invoice that handles lab tests, medicines, and other items
 * Automatically updates lab request status and deducts inventory
 */
export async function createSmartInvoice(data: {
  patientId: string
  referredBy?: string | null // Optional doctor/referral ID
  items: Array<{
    type: 'LAB_TEST' | 'MEDICINE' | 'OTHER'
    description: string
    quantity: number
    unitPrice: number
    labRequestId?: string
    labTestCatalogId?: string
    medicineId?: string
    batchId?: string
  }>
  discount: number
  paymentMethod: string
}) {
  const authResult = await requireAuthSafe(["SUPER_ADMIN", "ACCOUNTANT", "RECEPTIONIST"])
  if (!authResult.ok) return { success: false, message: authResult.error }

  try {
    // Validate
    if (!data.items || data.items.length === 0) {
      return {
        success: false,
        error: true,
        message: "No items provided for invoice",
      }
    }

    // Generate bill number
    const currentYear = new Date().getFullYear()
    const lastBill = await prisma.billing.findFirst({
      where: { billNumber: { startsWith: `BILL-${currentYear}-` } },
      orderBy: { billNumber: 'desc' }
    })
    const lastSeq = lastBill?.billNumber ? parseInt(lastBill.billNumber.split('-')[2]) || 0 : 0
    const billNumber = `BILL-${currentYear}-${String(lastSeq + 1).padStart(4, "0")}`

    // Calculate totals — GST only on medicine items
    const subtotal = data.items.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0)
    const discountAmount = (subtotal * data.discount) / 100
    // Tax only applies to medicines, not lab tests or other services
    const medicineSubtotal = data.items
      .filter(item => item.type === 'MEDICINE')
      .reduce((sum, item) => sum + item.quantity * item.unitPrice, 0)
    const taxAmount = medicineSubtotal * 0.18 // 18% GST on medicines only
    const netAmount = subtotal - discountAmount + taxAmount

    // Check if this patient is currently admitted under BSKY (cashless)
    const activeBskyAdmission = await prisma.iPDAdmission.findFirst({
      where: {
        patientId: data.patientId,
        status: "ADMITTED",
        isBskyAdmission: true,
      },
    })
    const isBskyIpd = !!activeBskyAdmission

    // Use transaction to create invoice and update related records
    const result = await prisma.$transaction(async (tx) => {

      // Create billing record
      const billing = await tx.billing.create({
        data: {
          billNumber,
          patientId: data.patientId,
          type: BillingType.LABORATORY,
          billDate: new Date(),
          totalAmount: subtotal,
          discountAmount,
          taxAmount,
          netAmount,
          paidAmount: isBskyIpd ? 0 : netAmount,
          balanceAmount: isBskyIpd ? netAmount : 0,
          status: isBskyIpd ? "PENDING_GOVERNMENT_PAYMENT" : "PAID",
          paymentMethod: isBskyIpd ? "INSURANCE" : data.paymentMethod,
          items: {
            create: data.items.map((item) => {
              const itemTotal = item.quantity * item.unitPrice
              const isMedicine = item.type === 'MEDICINE'
              const gstRate = isMedicine ? 18 : 0
              const gstAmount = isMedicine ? itemTotal * 0.18 : 0
              const totalWithGst = itemTotal + gstAmount

              return {
                description: item.description,
                quantity: item.quantity,
                unitPrice: item.unitPrice,
                amount: itemTotal,
                gstRate,
                gstAmount,
                totalAmount: totalWithGst,
              }
            }),
          },
        },
        include: {
          items: true,
        },
      })

      if (!isBskyIpd && netAmount > 0) {
        const accountId = await resolveFinancialAccount(tx, data.paymentMethod)

        if (accountId) {
          await tx.transaction.create({
            data: {
              accountId,
              type: "INCOME",
              amount: netAmount,
              category: "PATHOLOGY_BILL",
              paymentMethod: data.paymentMethod,
              referenceId: billing.id,
              description: `Diagnostic billing payment - ${billNumber}`,
            },
          })

          await tx.financialAccount.update({
            where: { id: accountId },
            data: { currentBalance: { increment: netAmount } },
          })
        }
      }

      // Process each item based on type
      let labRequestsUpdated = 0
      let labRequestsCreated = 0
      let medicinesDeducted = 0

      for (const item of data.items) {

        if (item.type === 'LAB_TEST') {
          if (item.labRequestId) {
            // Update existing lab request (from digital prescription)

            await tx.labRequest.update({
              where: { id: item.labRequestId },
              data: {
                status: 'PAID_PENDING_SAMPLE',
                billingId: billing.id,
              },
            })

            labRequestsUpdated++
          } else if (item.labTestCatalogId) {
            // Create new lab request (from manual entry / paper prescription / walk-in)

            const labRequest = await tx.labRequest.create({
              data: {
                patientId: data.patientId,
                orderedBy: data.referredBy || 'WALK_IN', // Use referring doctor or mark as walk-in
                testCatalogId: item.labTestCatalogId,
                testName: item.description.replace('Lab Test: ', ''),
                testPrice: item.unitPrice,
                status: 'PAID_PENDING_SAMPLE',
                billingId: billing.id,
                priority: 'ROUTINE',
                notes: data.referredBy
                  ? `Referred by doctor - Direct billing at counter`
                  : 'Walk-in patient - Direct billing without prescription',
              },
            })

            labRequestsCreated++
          }
        } else if (item.type === 'MEDICINE' && item.batchId) {
          // Deduct medicine from inventory

          const batch = await tx.inventoryBatch.findUnique({
            where: { id: item.batchId },
          })

          if (batch && batch.quantity >= item.quantity) {
            await deductFromInventory(tx, {
              batchId: item.batchId,
              units: item.quantity,
            })

            medicinesDeducted++
          } else {
            console.warn("[DEBUG] DEBUG WARNING: Insufficient stock for", item.description)
          }
        }
      }

      return { billing, labRequestsUpdated, labRequestsCreated, medicinesDeducted }
    })

    // Revalidate all relevant pages
    revalidatePath("/dashboard/finance/billing")
    revalidatePath("/dashboard/laboratory")
    revalidatePath("/dashboard/lab/queue")
    revalidatePath("/dashboard/lab/pathology/queue")
    revalidatePath("/dashboard/pharmacy/inventory")
    revalidatePath("/dashboard/finance")
    revalidatePath("/dashboard/master-finance")
    revalidatePath("/dashboard/master-finance/cash-bank/accounts")
    revalidatePath("/dashboard/master-finance/general-ledger")
    revalidatePath("/dashboard/reports/day-book")

    return {
      success: true,
      error: false,
      message: "Invoice generated successfully",
      billingId: result.billing.id,
      billNumber: result.billing.billNumber,
      stats: {
        labRequestsUpdated: result.labRequestsUpdated,
        labRequestsCreated: result.labRequestsCreated,
        medicinesDeducted: result.medicinesDeducted,
      },
    }
  } catch (_err: unknown) {
    const error = _err as ServerActionError

    return {
      success: false,
      error: true,
      message: `Error: ${error?.message || "Failed to generate invoice. Please try again."}`,
    }
  }
}

// ============================================
// OPD PATIENT LIST WITH PAGINATION
// ============================================

/**
 * Get paginated list of patients for OPD
 * @param page - Current page number (1-indexed)
 * @param pageSize - Number of patients per page (default: 10)
 */
export async function getPaginatedPatients(page: number = 1, pageSize: number = 10) {
  await requireAuth()

  try {

    // Calculate skip value
    const skip = (page - 1) * pageSize

    // Fetch patients with pagination
    const patients = await prisma.patient.findMany({
      include: {
        user: true, // Include user data for name
        appointments: {
          orderBy: {
            createdAt: "desc",
          },
          take: 1, // Get the most recent appointment only
        },
      },
      orderBy: {
        createdAt: "desc",
      },
      skip,
      take: pageSize,
    })

    // Get total count for pagination
    const totalCount = await prisma.patient.count()
    const totalPages = Math.ceil(totalCount / pageSize)

    return {
      success: true,
      data: patients,
      pagination: {
        currentPage: page,
        pageSize,
        totalCount,
        totalPages,
      },
    }
  } catch (_err: unknown) {
    const error = _err as ServerActionError
    console.error("[ERROR] getPaginatedPatients failed:", error.message)
    return {
      success: false,
      message: "Failed to fetch patients",
      data: [],
      pagination: {
        currentPage: page,
        pageSize,
        totalCount: 0,
        totalPages: 0,
      },
    }
  }
}

// ============================================
// PATIENT HISTORY / "PATIENT 360" VIEW
// ============================================

/**
 * Get comprehensive patient history for the "Patient 360" view
 * Includes all appointments, prescriptions, lab tests, and visit statistics
 */
export async function getPatientHistory(patientId: string) {
  await requireAuth()

  try {

    const patient = await prisma.patient.findUnique({
      where: { id: patientId },
      include: {
        appointments: {
          orderBy: { appointmentDate: 'desc' },
          include: {
            doctor: true,
            billings: true,
            labRequests: {
              include: {
                results: true,
              },
            },
          },
        },
        labRequests: {
          orderBy: { createdAt: 'desc' },
          include: {
            results: true,
            appointment: true,
          },
        },
        billings: {
          orderBy: { createdAt: 'desc' },
        },
      },
    })

    if (!patient) {
      console.error("[ERROR] Patient not found in DB")
      return {
        success: false,
        error: true,
        message: "Patient not found",
      }
    }

    // Calculate stats manually since we have the data
    const totalVisits = patient.appointments.length
    const uniqueDoctors = new Set(patient.appointments.map(a => a.doctorId).filter(Boolean)).size
    const lastVisit = patient.appointments[0]?.appointmentDate || null
    const totalLabTests = patient.labRequests.length
    const completedLabTests = patient.labRequests.filter(req => req.status === 'COMPLETED').length

    // Parse prescription history from all appointments
    const prescriptionHistory: Array<{
      date: Date
      appointmentId: string
      doctorName: string
      medicines: string
      diagnosis: string | null
    }> = []

    patient.appointments.forEach(apt => {
      if (apt.prescription && apt.prescription.trim()) {
        prescriptionHistory.push({
          date: apt.appointmentDate,
          appointmentId: apt.id,
          doctorName: 'Doctor', // Will be populated from doctor relation if available
          medicines: apt.prescription,
          diagnosis: apt.diagnosis,
        })
      }
    })

    return {
      success: true,
      error: false,
      data: {
        patient,
        stats: {
          totalVisits,
          uniqueDoctors,
          lastVisit,
          totalLabTests,
          completedLabTests,
          pendingLabTests: totalLabTests - completedLabTests,
        },
        appointments: patient.appointments,
        prescriptionHistory,
        labRequests: patient.labRequests,
      },
    }
  } catch (_err: unknown) {
    const error = _err as ServerActionError
    console.error("[CRITICAL ERROR] getPatientHistory failed:", error?.message)
    return {
      success: false,
      error: true,
      message: "Failed to load patient history",
    }
  }
}

// ============================================
// IPD - WARD MANAGEMENT
// ============================================

/**
 * Create a new ward
 */
export async function createWard(formData: FormData) {
  const authResult = await requireAuthSafe(["SUPER_ADMIN"])
  if (!authResult.ok) return { success: false, message: authResult.error }

  try {
    const name = formData.get("name") as string
    const type = formData.get("type") as string
    const floor = formData.get("floor") as string
    const description = formData.get("description") as string

    // Validate required fields
    if (!name || !type) {
      return {
        success: false,
        error: true,
        message: "Ward name and type are required",
      }
    }

    // Create ward
    const ward = await prisma.ward.create({
      data: {
        name,
        type,
        floor: floor || null,
        description: description || null,
        isActive: true,
      },
    })

    // Revalidate relevant pages
    revalidatePath("/dashboard/admin/beds")
    revalidatePath("/dashboard/ipd")

    writeAuditLog({ userId: authResult.session.userId, action: "CREATE", module: "Ward", recordId: ward.id, changes: { name } })

    return {
      success: true,
      error: false,
      message: "Ward created successfully",
      wardId: ward.id,
    }
  } catch (_err: unknown) {
    const error = _err as ServerActionError

    return {
      success: false,
      error: true,
      message: `Error: ${error?.message || "Failed to create ward. Please try again."}`,
    }
  }
}

// ============================================
// OPERATION THEATER (OT) MODULE
// ============================================

/**
 * Get all Operation Theaters
 */
export async function getTheaters() {
  await requireAuth()

  try {

    const theaters = await prisma.operationTheater.findMany({
      orderBy: { name: 'asc' },
      include: {
        surgeries: {
          where: {
            scheduledDate: {
              gte: new Date(new Date().setHours(0, 0, 0, 0)), // Today onwards
            },
            status: {
              in: ['SCHEDULED', 'IN_PROGRESS']
            }
          },
          include: {
            patient: {
              include: {
                user: true
              }
            },
            leadSurgeon: {
              include: {
                user: true
              }
            }
          }
        }
      }
    })

    return { success: true, data: theaters }
  } catch (_err: unknown) {
    const error = _err as ServerActionError
    console.error("[ERROR] getTheaters failed:", error.message)
    return { success: false, message: "Failed to fetch theaters" }
  }
}

/**
 * Get all surgeries with filters
 */
export async function getSurgeries(filters?: {
  date?: Date
  status?: string
  theaterId?: string
  paymentStatus?: string | string[]
  q?: string
  sortOrder?: "asc" | "desc"
}) {
  await requireAuth()

  try {
    const where: Prisma.SurgeryWhereInput = {}

    if (filters?.date) {
      const startOfDay = new Date(filters.date)
      startOfDay.setHours(0, 0, 0, 0)
      const endOfDay = new Date(filters.date)
      endOfDay.setHours(23, 59, 59, 999)

      where.scheduledDate = {
        gte: startOfDay,
        lte: endOfDay,
      }
    }

    if (filters?.status) {
      where.status = filters.status as SurgeryStatus
    }

    if (filters?.theaterId) {
      where.theaterId = filters.theaterId
    }

    if (filters?.paymentStatus) {
      if (Array.isArray(filters.paymentStatus)) {
        where.paymentStatus = { in: filters.paymentStatus as any }
      } else {
        where.paymentStatus = filters.paymentStatus as any
      }
    }

    if (filters?.q) {
      where.OR = [
        { procedureName: { contains: filters.q, mode: 'insensitive' } },
        { patient: { user: { name: { contains: filters.q, mode: 'insensitive' } } } }
      ]
    }

    const sortOrder = filters?.sortOrder || "asc"

    const surgeries = await prisma.surgery.findMany({
      where,
      orderBy: { scheduledDate: sortOrder },
      include: {
        patient: { include: { user: true } },
        leadSurgeon: { include: { user: true } },
        theater: true,
      },
    })

    return { success: true, data: surgeries }
  } catch (_err: unknown) {
    const error = _err as ServerActionError
    console.error("[ERROR] getSurgeries failed:", error.message)
    return { success: false, message: "Failed to fetch surgeries" }
  }
}

/**
 * Get today's surgery schedule
 */
export async function getTodaysSurgeries() {
  await requireAuth()

  const today = new Date()
  today.setHours(0, 0, 0, 0)

  return getSurgeries({ date: today })
}

/**
 * Create a new Operation Theater
 */
export async function createTheater(formData: FormData) {
  const authResult = await requireAuthSafe(["SUPER_ADMIN"])
  if (!authResult.ok) return { success: false, message: authResult.error }

  try {
    const name = formData.get("name") as string
    const type = formData.get("type") as string
    const floor = formData.get("floor") as string
    const equipment = formData.get("equipment") as string
    const features = formData.get("features") as string
    const capacityRaw = formData.get("capacity") as string
    const capacity = capacityRaw ? parseInt(capacityRaw) : null

    if (!name || !type) {
      return {
        success: false,
        message: "Theater name and type are required"
      }
    }

    const theater = await prisma.operationTheater.create({
      data: {
        name,
        type: type as TheaterType,
        floor: floor || null,
        capacity,
        equipment: equipment || null,
        features: features || null,
        isOperational: true
      }
    })

    revalidatePath("/dashboard/clinical/ot")
    revalidatePath("/dashboard/admin/ot-management")

    writeAuditLog({ userId: authResult.session.userId, action: "CREATE", module: "OperationTheater", recordId: theater.id, changes: { name } })

    return {
      success: true,
      message: "Theater created successfully",
      theaterId: theater.id
    }
  } catch (_err: unknown) {
    const error = _err as ServerActionError
    console.error("[ERROR] createTheater failed:", error.message)
    return {
      success: false,
      message: error.message || "Failed to create theater"
    }
  }
}

/**
 * Upsert (Create or Update) an Operation Theater
 */
export async function upsertOperationTheater(formData: FormData) {
  const authResult = await requireAuthSafe(["SUPER_ADMIN"])
  if (!authResult.ok) return { success: false, message: authResult.error }

  try {
    const id = formData.get("id") as string | null
    const name = formData.get("name") as string
    const type = formData.get("type") as string
    const isOperationalRaw = formData.get("isOperational") as string
    const floor = formData.get("floor") as string | null
    const equipment = formData.get("equipment") as string | null
    const features = formData.get("features") as string | null

    if (!name || !type) {
      return {
        success: false,
        message: "Theater name and type are required"
      }
    }

    const isOperational = isOperationalRaw === "true" || isOperationalRaw === "on"

    const theaterData = {
      name,
      type: type as TheaterType,
      isOperational,
      floor: floor || null,
      equipment: equipment || null,
      features: features || null
    }

    let theater
    if (id) {
      // Update existing theater
      theater = await prisma.operationTheater.update({
        where: { id },
        data: theaterData
      })
    } else {
      // Create new theater
      theater = await prisma.operationTheater.create({
        data: theaterData
      })
    }

    revalidatePath("/dashboard/clinical/ot")
    revalidatePath("/dashboard/admin/theaters")

    writeAuditLog({ userId: authResult.session.userId, action: "UPDATE", module: "OperationTheater", changes: { name } })

    return {
      success: true,
      message: id ? "Theater updated successfully" : "Theater created successfully",
      theaterId: theater.id
    }
  } catch (_err: unknown) {
    const error = _err as ServerActionError
    console.error("[ERROR] upsertOperationTheater failed:", error.message)
    return {
      success: false,
      message: error.message || "Failed to save theater"
    }
  }
}

/**
 * Delete an Operation Theater
 */
export async function deleteOperationTheater(theaterId: string) {
  const authResult = await requireAuthSafe(["SUPER_ADMIN"])
  if (!authResult.ok) return { success: false, message: authResult.error }

  try {
    if (!theaterId) {
      return {
        success: false,
        message: "Theater ID is required"
      }
    }

    // Check if theater has any scheduled or in-progress surgeries
    const activeSurgeries = await prisma.surgery.count({
      where: {
        theaterId,
        status: {
          in: ['SCHEDULED', 'IN_PROGRESS']
        }
      }
    })

    if (activeSurgeries > 0) {
      return {
        success: false,
        message: `Cannot delete theater: ${activeSurgeries} active surgery/surgeries scheduled. Please reschedule or cancel them first.`
      }
    }

    // Soft delete: Mark as non-operational instead of actual delete
    await prisma.operationTheater.update({
      where: { id: theaterId },
      data: { isOperational: false }
    })

    revalidatePath("/dashboard/clinical/ot")
    revalidatePath("/dashboard/admin/theaters")

    writeAuditLog({ userId: authResult.session.userId, action: "DELETE", module: "OperationTheater", recordId: theaterId, changes: {} })

    return {
      success: true,
      message: "Theater marked as non-operational"
    }
  } catch (_err: unknown) {
    const error = _err as ServerActionError
    console.error("[ERROR] deleteOperationTheater failed:", error.message)
    return {
      success: false,
      message: error.message || "Failed to delete theater"
    }
  }
}

/**
 * Schedule a new surgery with conflict checking and integrated payment gate.
 * A surgery is only "confirmed" (PAID / CASHLESS) if payment is collected or
 * the patient qualifies for BSKY cashless.  Otherwise it stays PENDING.
 */
export async function scheduleSurgery(formData: FormData) {
  const authResult = await requireAuthSafe(["SUPER_ADMIN", "DOCTOR", "RECEPTIONIST"])
  if (!authResult.ok) return { success: false, message: authResult.error }

  try {
    const patientId = formData.get("patientId") as string
    const leadSurgeonId = formData.get("leadSurgeonId") as string
    const theaterId = formData.get("theaterId") as string
    const procedureName = formData.get("procedureName") as string
    const scheduledDateStr = formData.get("scheduledDate") as string
    const durationMinutesRaw = formData.get("durationMinutes") as string
    const isEmergencyRaw = formData.get("isEmergency") as string
    const diagnosis = formData.get("diagnosis") as string
    const estimatedCostRaw = formData.get("estimatedCost") as string
    const surgeryChargeRaw = formData.get("surgeryCharge") as string
    const selectedPaymentMethod = formData.get("paymentMethod") as string | null
    const procedureTemplateId = formData.get("procedureTemplateId") as string | null
    const chargeBreakdownRaw = formData.get("chargeBreakdown") as string | null

    if (!patientId || !leadSurgeonId || !theaterId || !procedureName || !scheduledDateStr || !durationMinutesRaw) {
      return { success: false, message: "All required fields must be filled" }
    }

    if (!selectedPaymentMethod) {
      return { success: false, message: "Payment method is required to schedule OT. Financial clearance cannot be bypassed." }
    }

    const surgeryCharge = surgeryChargeRaw ? parseFloat(surgeryChargeRaw) : 0

    if (surgeryCharge <= 0 && selectedPaymentMethod !== "BSKY") {
      return { success: false, message: "Surgery charge must be greater than ₹0 (unless BSKY cashless)" }
    }

    const scheduledDate = new Date(scheduledDateStr)
    const durationMinutes = parseInt(durationMinutesRaw)
    const isEmergency = isEmergencyRaw === "true"
    const estimatedCost = estimatedCostRaw ? parseFloat(estimatedCostRaw) : null

    // Parse charge breakdown
    let chargeBreakdown: { chargeLabel: string; chargeType: string; amount: number }[] = []
    if (chargeBreakdownRaw) {
      try { chargeBreakdown = JSON.parse(chargeBreakdownRaw) } catch { /* fallback */ }
    }

    const endTime = new Date(scheduledDate.getTime() + durationMinutes * 60000)

    // CONFLICT CHECK
    const conflicts = await prisma.surgery.findMany({
      where: {
        theaterId,
        status: { in: ["SCHEDULED", "IN_PROGRESS"] },
        AND: [
          { scheduledDate: { lt: endTime } },
          {
            OR: [
              {
                actualEndTime: null,
                scheduledDate: { gte: new Date(scheduledDate.getTime() - 4 * 60 * 60000) },
              },
              { actualEndTime: { gt: scheduledDate } },
            ],
          },
        ],
      },
      include: { patient: { include: { user: true } } },
    })

    if (conflicts.length > 0) {
      const conflictDetails = conflicts
        .map(
          (c) =>
            `${c.procedureName} for ${c.patient?.user?.name || "Patient"} at ${new Date(c.scheduledDate).toLocaleTimeString()}`
        )
        .join(", ")
      return { success: false, message: `Theater is already booked! Conflicting surgeries: ${conflictDetails}`, conflicts }
    }

    // Determine BSKY cashless status
    const activeBskyAdmission = await prisma.iPDAdmission.findFirst({
      where: { patientId, status: "ADMITTED", isBskyAdmission: true },
    })
    const isBskyCashless = selectedPaymentMethod === "BSKY" || !!activeBskyAdmission

    let paymentStatus: "PENDING" | "PAID" | "CASHLESS" = "PENDING"
    if (isBskyCashless) {
      paymentStatus = "CASHLESS"
    } else if (selectedPaymentMethod && surgeryCharge > 0) {
      paymentStatus = "PAID"
    }

    const result = await prisma.$transaction(async (tx) => {
      const currentYear = new Date().getFullYear()
      const lastBill = await tx.billing.findFirst({
      where: { billNumber: { startsWith: `OT-${currentYear}-` } },
      orderBy: { billNumber: 'desc' }
    })
    const lastSeq = lastBill?.billNumber ? parseInt(lastBill.billNumber.split('-')[2]) || 0 : 0
    const billNumber = `OT-${currentYear}-${String(lastSeq + 1).padStart(4, "0")}`

      let billingId: string | null = null

      if (surgeryCharge > 0) {
        const billingStatus = isBskyCashless
          ? "PENDING_GOVERNMENT_PAYMENT"
          : paymentStatus === "PAID"
            ? "PAID"
            : "PENDING"

        const billing = await tx.billing.create({
          data: {
            billNumber,
            patientId,
            type: "OT",
            totalAmount: surgeryCharge,
            discountAmount: 0,
            taxAmount: 0,
            netAmount: surgeryCharge,
            paidAmount: isBskyCashless ? 0 : paymentStatus === "PAID" ? surgeryCharge : 0,
            balanceAmount: isBskyCashless || paymentStatus === "PAID" ? 0 : surgeryCharge,
            status: billingStatus,
            paymentMethod: isBskyCashless ? "BSKY" : selectedPaymentMethod || null,
            items: {
              create: chargeBreakdown.length > 0
                ? chargeBreakdown.map(c => ({
                    description: `${c.chargeLabel}`,
                    quantity: 1,
                    unitPrice: c.amount,
                    amount: c.amount,
                    gstRate: 0,
                    gstAmount: 0,
                    totalAmount: c.amount,
                  }))
                : [{
                    description: `Surgery: ${procedureName}`,
                    quantity: 1,
                    unitPrice: surgeryCharge,
                    amount: surgeryCharge,
                    gstRate: 0,
                    gstAmount: 0,
                    totalAmount: surgeryCharge,
                  }],
            },
          },
        })
        billingId = billing.id

        // Post to financial ledger if payment collected (non-BSKY)
        if (paymentStatus === "PAID" && selectedPaymentMethod && selectedPaymentMethod !== "BSKY") {
          const accountId = await resolveFinancialAccount(tx as any, selectedPaymentMethod)
          if (accountId) {
            await tx.transaction.create({
              data: {
                accountId,
                type: "INCOME",
                amount: surgeryCharge,
                category: "OT_SURGERY",
                paymentMethod: selectedPaymentMethod,
                referenceId: billing.id,
                description: `OT/Surgery payment - ${billNumber} - ${procedureName}`,
              },
            })
            await tx.financialAccount.update({
              where: { id: accountId },
              data: { currentBalance: { increment: surgeryCharge } },
            })
          }
        }

        // BSKY: post to Government Claims ledger
        if (isBskyCashless && surgeryCharge > 0) {
          const govAccountId = await resolveFinancialAccount(tx as any, "BSKY")
          if (govAccountId) {
            await tx.transaction.create({
              data: {
                accountId: govAccountId,
                type: "INCOME",
                amount: surgeryCharge,
                category: "BSKY_GOVERNMENT_CLAIM",
                paymentMethod: "BSKY",
                referenceId: billing.id,
                description: `BSKY OT claim - ${billNumber} - ${procedureName}`,
              },
            })
          }
        }
      }

      const surgery = await tx.surgery.create({
        data: {
          patientId,
          leadSurgeonId,
          theaterId,
          procedureName,
          scheduledDate,
          durationMinutes,
          isEmergency,
          diagnosis: diagnosis || null,
          estimatedCost,
          surgeryCharge,
          paymentStatus,
          paymentMethod: isBskyCashless ? "BSKY" : selectedPaymentMethod || null,
          billingId,
          status: "SCHEDULED",
          pacStatus: "PENDING",
          procedureTemplateId: procedureTemplateId || null,
          chargeBreakdown: chargeBreakdown.length > 0 ? chargeBreakdown : undefined,
        },
        include: {
          patient: { include: { user: true } },
          leadSurgeon: { include: { user: true } },
          theater: true,
        },
      })

      return surgery
    })

    revalidatePath("/dashboard/clinical/ot")
    revalidatePath("/dashboard/admin/ot-management")
    revalidatePath("/dashboard/finance/billing")
    revalidatePath("/dashboard/finance")
    revalidatePath("/dashboard/master-finance")
    revalidatePath("/dashboard/master-finance/cash-bank/accounts")
    revalidatePath("/dashboard/master-finance/general-ledger")
    revalidatePath("/dashboard/reports/day-book")

    const statusLabel = paymentStatus === "CASHLESS" ? " (BSKY Cashless)" : paymentStatus === "PAID" ? " (Payment Collected)" : " (Draft - Payment Pending)"

    writeAuditLog({ userId: authResult.session.userId, action: "CREATE", module: "Surgery", recordId: result.id, changes: { patientId } })

    return {
      success: true,
      message: `Surgery scheduled successfully${statusLabel}`,
      surgeryId: result.id,
      data: result,
    }
  } catch (_err: unknown) {
    const error = _err as ServerActionError
    console.error("[ERROR] scheduleSurgery failed:", error.message)
    return { success: false, message: error.message || "Failed to schedule surgery" }
  }
}

/**
 * Update surgery status (Scheduled -> In Progress -> Completed)
 */
export async function updateSurgeryStatus(formData: FormData) {
  const authResult = await requireAuthSafe(["SUPER_ADMIN", "DOCTOR"])
  if (!authResult.ok) return { success: false, message: authResult.error }

  try {
    const surgeryId = formData.get("surgeryId") as string
    const newStatus = formData.get("status") as string
    const notes = formData.get("notes") as string
    const findings = formData.get("findings") as string
    const complications = formData.get("complications") as string

    if (!surgeryId || !newStatus) {
      return {
        success: false,
        message: "Surgery ID and status are required"
      }
    }

    // Fetch the surgery first to check PAC status
    const surgery = await prisma.surgery.findUnique({
      where: { id: surgeryId },
      include: {
        patient: { include: { user: true } },
        theater: true
      }
    })

    if (!surgery) {
      return {
        success: false,
        message: "Surgery not found"
      }
    }

    // INDIAN CONTEXT: PAC VALIDATION
    // If trying to start surgery (move to IN_PROGRESS) and PAC is UNFIT, block it
    if (newStatus === 'IN_PROGRESS' && surgery.pacStatus === 'UNFIT') {
      return {
        success: false,
        message: "⚠️ CANNOT START SURGERY: Patient is marked UNFIT in Pre-Anesthesia Check (PAC). Please re-evaluate.",
        pacStatus: surgery.pacStatus
      }
    }

    // If trying to start surgery and PAC is still PENDING, warn but allow (with confirmation)
    if (newStatus === 'IN_PROGRESS' && surgery.pacStatus === 'PENDING') {
      // In a real app, you might want to require explicit confirmation here
    }

    const updateData: Prisma.SurgeryUpdateInput = {
      status: newStatus as SurgeryStatus
    }

    // Track actual times
    if (newStatus === 'IN_PROGRESS' && !surgery.actualStartTime) {
      updateData.actualStartTime = new Date()
    }

    if (newStatus === 'COMPLETED' && !surgery.actualEndTime) {
      updateData.actualEndTime = new Date()
    }

    if (notes) {
      updateData.procedureNotes = notes
    }

    if (findings) {
      updateData.findings = findings
    }

    if (complications) {
      updateData.complications = complications
    }

    const updatedSurgery = await prisma.surgery.update({
      where: { id: surgeryId },
      data: updateData,
      include: {
        patient: { include: { user: true } },
        leadSurgeon: { include: { user: true } },
        theater: true
      }
    })

    revalidatePath("/dashboard/clinical/ot")
    revalidatePath("/dashboard/admin/ot-management")
    revalidatePath("/dashboard/finance/billing")
    revalidatePath("/dashboard/finance")
    revalidatePath("/dashboard/master-finance")
    revalidatePath("/dashboard/master-finance/cash-bank/accounts")
    revalidatePath("/dashboard/master-finance/general-ledger")
    revalidatePath("/dashboard/reports/day-book")

    writeAuditLog({ userId: authResult.session.userId, action: "UPDATE", module: "Surgery", recordId: surgeryId, changes: { status: newStatus } })

    return {
      success: true,
      message: `Surgery status updated to ${newStatus}`,
      data: updatedSurgery
    }
  } catch (_err: unknown) {
    const error = _err as ServerActionError
    console.error("[ERROR] updateSurgeryStatus failed:", error.message)
    return {
      success: false,
      message: error.message || "Failed to update surgery status"
    }
  }
}

/**
 * Update PAC (Pre-Anesthesia Check) status
 */
export async function updatePACStatus(formData: FormData) {
  const authResult = await requireAuthSafe(["SUPER_ADMIN", "DOCTOR"])
  if (!authResult.ok) return { success: false, message: authResult.error }

  try {
    const surgeryId = formData.get("surgeryId") as string
    const pacStatus = formData.get("pacStatus") as string
    const pacNotes = formData.get("pacNotes") as string
    const pacCheckedBy = formData.get("pacCheckedBy") as string

    if (!surgeryId || !pacStatus) {
      return {
        success: false,
        message: "Surgery ID and PAC status are required"
      }
    }

    const updatedSurgery = await prisma.surgery.update({
      where: { id: surgeryId },
      data: {
        pacStatus: pacStatus as PACStatus,
        pacNotes: pacNotes || null,
        pacCheckedBy: pacCheckedBy || null,
        pacCheckedAt: new Date()
      },
      include: {
        patient: { include: { user: true } },
        theater: true
      }
    })

    revalidatePath("/dashboard/clinical/ot")

    writeAuditLog({ userId: authResult.session.userId, action: "UPDATE", module: "PAC", recordId: surgeryId, changes: { pacStatus } })

    return {
      success: true,
      message: `PAC status updated to ${pacStatus}`,
      data: updatedSurgery
    }
  } catch (_err: unknown) {
    const error = _err as ServerActionError
    console.error("[ERROR] updatePACStatus failed:", error.message)
    return {
      success: false,
      message: error.message || "Failed to update PAC status"
    }
  }
}

// ============================================
// PHARMACY MODULE - Medicine & Inventory Management
// ============================================

/**
 * Get all suppliers
 */
export async function getSuppliers() {
  await requireAuth()

  try {
    const suppliers = await prisma.supplier.findMany({
      where: { isActive: true, ...supplierScopeFilter("PHARMACY") },
      orderBy: { name: 'asc' },
      include: {
        _count: {
          select: { inventoryBatches: true }
        }
      }
    })

    return { success: true, data: suppliers }
  } catch (_err: unknown) {
    const error = _err as ServerActionError
    console.error("[ERROR] getSuppliers failed:", error.message)
    return { success: false, message: "Failed to fetch suppliers" }
  }
}

/**
 * Create a new supplier
 */
export async function createSupplier(formData: FormData) {
  const authResult = await requireAuthSafe(["SUPER_ADMIN", "PHARMACIST"])
  if (!authResult.ok) return { success: false, message: authResult.error }

  try {
    const name = formData.get("name") as string
    const contactPerson = formData.get("contactPerson") as string
    const phone = formData.get("phone") as string
    const email = formData.get("email") as string
    const gstNumber = formData.get("gstNumber") as string
    const address = formData.get("address") as string
    const city = formData.get("city") as string
    const state = formData.get("state") as string
    const pincode = formData.get("pincode") as string
    const creditDaysRaw = formData.get("creditDays") as string
    // Suppliers created from a pharmacy workflow are pharmacy-only. Hospital
    // suppliers are created from the Master Finance workflow instead.
    const scope = "PHARMACY" as const

    if (!name) {
      return {
        success: false,
        message: "Supplier name is required"
      }
    }

    const creditDays = creditDaysRaw ? parseInt(creditDaysRaw) : null

    const supplier = await prisma.supplier.create({
      data: {
        name,
        contactPerson: contactPerson || null,
        phone: phone || null,
        email: email || null,
        gstNumber: gstNumber || null,
        address: address || null,
        city: city || null,
        state: state || null,
        pincode: pincode || null,
        creditDays,
        isActive: true,
        scope
      }
    })

    revalidatePath("/dashboard/pharmacy/inventory")
    revalidatePath("/dashboard/pharmacy/purchase")

    writeAuditLog({ userId: authResult.session.userId, action: "CREATE", module: "Supplier", recordId: supplier.id, changes: { name } })

    return {
      success: true,
      message: "Supplier created successfully",
      supplierId: supplier.id
    }
  } catch (_err: unknown) {
    const error = _err as ServerActionError
    console.error("[ERROR] createSupplier failed:", error.message)

    if (error.code === 'P2002') {
      return {
        success: false,
        message: "A supplier with this name or GST number already exists"
      }
    }

    return {
      success: false,
      message: error.message || "Failed to create supplier"
    }
  }
}

export async function updateSupplier(id: string, formData: FormData) {
  const authResult = await requireAuthSafe(["SUPER_ADMIN", "PHARMACIST"])
  if (!authResult.ok) return { success: false, message: authResult.error }

  try {
    const name = formData.get("name") as string
    const contactPerson = formData.get("contactPerson") as string
    const phone = formData.get("phone") as string
    const email = formData.get("email") as string
    const gstNumber = formData.get("gstNumber") as string
    const address = formData.get("address") as string
    const city = formData.get("city") as string
    const state = formData.get("state") as string
    const pincode = formData.get("pincode") as string
    const creditDaysRaw = formData.get("creditDays") as string
    // Do not allow a pharmacy edit form to move a supplier into the hospital
    // book or into a shared BOTH scope.
    const scope = "PHARMACY" as const

    if (!name) return { success: false, message: "Supplier name is required" }

    const existingSupplier = await prisma.supplier.findUnique({ where: { id }, select: { scope: true } })
    if (!existingSupplier || !supplierAllowedFor(existingSupplier.scope, "PHARMACY")) {
      return { success: false, message: "Supplier is not available in pharmacy" }
    }

    const creditDays = creditDaysRaw ? parseInt(creditDaysRaw) : null

    const supplier = await prisma.supplier.update({
      where: { id },
      data: {
        name,
        contactPerson: contactPerson || null,
        phone: phone || null,
        email: email || null,
        gstNumber: gstNumber || null,
        address: address || null,
        city: city || null,
        state: state || null,
        pincode: pincode || null,
        creditDays,
        scope,
      }
    })

    revalidatePath("/dashboard/pharmacy/inventory")
    writeAuditLog({ userId: authResult.session.userId, action: "UPDATE", module: "Supplier", recordId: id, changes: { name } })
    return { success: true, message: "Supplier updated successfully", data: supplier }
  } catch (_err: unknown) {
    const error = _err as ServerActionError
    console.error("[ERROR] updateSupplier failed:", error.message)
    if (error.code === 'P2002') return { success: false, message: "A supplier with this name or GST number already exists" }
    return { success: false, message: error.message || "Failed to update supplier" }
  }
}

export async function deleteSupplier(id: string) {
  const authResult = await requireAuthSafe(["SUPER_ADMIN", "PHARMACIST"])
  if (!authResult.ok) return { success: false, message: authResult.error }

  try {
    const supplier = await prisma.supplier.findUnique({ where: { id }, select: { scope: true } })
    if (!supplier || !supplierAllowedFor(supplier.scope, "PHARMACY")) {
      return { success: false, message: "Supplier is not available in pharmacy" }
    }
    await prisma.supplier.delete({ where: { id } })
    revalidatePath("/dashboard/pharmacy/inventory")
    writeAuditLog({ userId: authResult.session.userId, action: "DELETE", module: "Supplier", recordId: id, changes: {} })
    return { success: true, message: "Supplier deleted successfully" }
  } catch (_err: unknown) {
    const error = _err as ServerActionError
    console.error("[ERROR] deleteSupplier failed:", error.message)
    if (error.code === 'P2003') return { success: false, message: "Cannot delete supplier because it is referenced in stock batches or billing." }
    return { success: false, message: error.message || "Failed to delete supplier" }
  }
}

/**
 * Fetch all available medicine types (default + custom)
 */
export async function getMedicineTypes() {
  await requireAuth()

  // Default types that were previously in the enum
  const defaultTypes = [
    'TABLET', 'CAPSULE', 'SYRUP', 'INJECTION', 'OINTMENT', 
    'DROPS', 'CREAM', 'INHALER', 'POWDER', 'SUSPENSION'
  ]

  try {
    const customTypes = await prisma.medicineCustomType.findMany({
      orderBy: { name: 'asc' }
    })
    
    // Combine and deduplicate just in case
    const allTypes = [...new Set([...defaultTypes, ...customTypes.map(t => t.name.toUpperCase())])]
    
    return { success: true, data: allTypes }
  } catch (_err: unknown) {
    // Gracefully fall back to default types if DB query fails (transient connection issues)
    console.warn("[WARN] getMedicineTypes: Could not fetch custom types, using defaults only")
    return { success: true, data: defaultTypes }
  }
}

/**
 * Add a new custom medicine type
 */
export async function addCustomMedicineType(name: string) {
  const authResult = await requireAuthSafe(["SUPER_ADMIN", "PHARMACIST"])
  if (!authResult.ok) return { success: false, message: authResult.error }

  try {
    if (!name || name.trim() === '') {
      return { success: false, message: "Type name is required" }
    }

    const typeName = name.trim().toUpperCase()

    // Check if it exists in custom types
    const existing = await prisma.medicineCustomType.findUnique({
      where: { name: typeName }
    })

    if (existing) {
      return { success: true, data: existing }
    }

    const newType = await prisma.medicineCustomType.create({
      data: { name: typeName }
    })

    writeAuditLog({ userId: authResult.session.userId, action: "CREATE", module: "MedicineType", recordId: newType.id, changes: { name } })
    return { success: true, data: newType, message: "Custom type added successfully" }
  } catch (_err: unknown) {
    const error = _err as ServerActionError
    console.error("[ERROR] addCustomMedicineType failed:", error.message)
    return { success: false, message: "Failed to add custom type" }
  }
}

/**
 * Fetch all medicines with stock summary
 */
export async function getMedicines() {
  await requireAuth()

  try {
    const medicines = await prisma.medicine.findMany({
      where: { isActive: true },
      orderBy: { name: 'asc' },
      include: {
        inventoryBatches: {
          where: {
            isActive: true,
            isExpired: false
          },
          select: {
            quantity: true,
            expiryDate: true,
            batchNumber: true
          }
        }
      }
    })

    // Calculate total stock for each medicine
    const medicinesWithStock = medicines.map(medicine => {
      const totalStock = medicine.inventoryBatches.reduce((sum, batch) => sum + batch.quantity, 0)
      const isLowStock = totalStock <= medicine.minStockLevel

      return {
        ...medicine,
        totalStock,
        isLowStock
      }
    })

    return { success: true, data: medicinesWithStock }
  } catch (_err: unknown) {
    const error = _err as ServerActionError
    console.error("[ERROR] getMedicines failed:", error.message)
    return { success: false, message: "Failed to fetch medicines" }
  }
}

/**
 * Create a new medicine
 */
export async function createMedicine(formData: FormData) {
  const authResult = await requireAuthSafe(["SUPER_ADMIN", "PHARMACIST"])
  if (!authResult.ok) return { success: false, message: authResult.error }

  try {
    const name = (formData.get("name") as string).trim()
    const genericName = (formData.get("genericName") as string)?.trim() || ""
    const manufacturer = (formData.get("manufacturer") as string)?.trim() || ""
    const type = formData.get("type") as string
    const strength = formData.get("strength") as string
    const minStockLevelRaw = formData.get("minStockLevel") as string
    const hsnCode = formData.get("hsnCode") as string
    const schedule = formData.get("schedule") as string
    const composition = formData.get("composition") as string
    const usage = formData.get("usage") as string
    const storageLocation = formData.get("storageLocation") as string
    const noLooseSale = formData.get("noLooseSale") === "true" || formData.get("noLooseSale") === "on"

    if (!name) {
      return {
        success: false,
        message: "Medicine name is required"
      }
    }

    const minStockLevel = minStockLevelRaw ? parseInt(minStockLevelRaw) : 100

    const medicine = await prisma.medicine.create({
      data: {
        name,
        genericName: genericName || "",
        manufacturer: manufacturer || null,
        type: (type || 'TABLET'),
        strength: strength || null,
        unitPrice: 0,
        minStockLevel,
        hsnCode: hsnCode || null,
        schedule: schedule || null,
        composition: composition || null,
        usage: usage || null,
        storageLocation: storageLocation || null,
        isActive: true,
        noLooseSale
      }
    })

    revalidatePath("/dashboard/pharmacy/inventory")
    revalidatePath("/dashboard/pharmacy/pos")

    writeAuditLog({ userId: authResult.session.userId, action: "CREATE", module: "Medicine", recordId: medicine.id, changes: { name } })

    return {
      success: true,
      message: "Medicine created successfully",
      medicineId: medicine.id
    }
  } catch (_err: unknown) {
    const error = _err as ServerActionError
    console.error("[ERROR] createMedicine failed:", error.message)

    if (error.code === 'P2002') {
      return {
        success: false,
        message: "A medicine with this name and strength already exists"
      }
    }

    return {
      success: false,
      message: error.message || "Failed to create medicine"
    }
  }
}

export async function updateMedicine(id: string, formData: FormData) {
  const authResult = await requireAuthSafe(["SUPER_ADMIN", "PHARMACIST"])
  if (!authResult.ok) return { success: false, message: authResult.error }

  try {
    const name = (formData.get("name") as string).trim()
    const genericName = (formData.get("genericName") as string)?.trim() || ""
    const manufacturer = (formData.get("manufacturer") as string)?.trim() || ""
    const type = formData.get("type") as string
    const strength = formData.get("strength") as string
    const minStockLevelRaw = formData.get("minStockLevel") as string
    const hsnCode = formData.get("hsnCode") as string
    const schedule = formData.get("schedule") as string
    const composition = formData.get("composition") as string
    const usage = formData.get("usage") as string
    const storageLocation = formData.get("storageLocation") as string
    const noLooseSale = formData.get("noLooseSale") === "true" || formData.get("noLooseSale") === "on"

    if (!name) {
      return { success: false, message: "Medicine name is required" }
    }

    const minStockLevel = minStockLevelRaw ? parseInt(minStockLevelRaw) : 100

    const medicine = await prisma.medicine.update({
      where: { id },
      data: {
        name,
        genericName: genericName || "",
        manufacturer: manufacturer || null,
        type: (type || 'TABLET'),
        strength: strength || null,
        unitPrice: 0,
        minStockLevel,
        hsnCode: hsnCode || null,
        schedule: schedule || null,
        composition: composition || null,
        usage: usage || null,
        storageLocation: storageLocation || null,
        noLooseSale,
      }
    })

    revalidatePath("/dashboard/pharmacy/inventory")
    writeAuditLog({ userId: authResult.session.userId, action: "UPDATE", module: "Medicine", recordId: id, changes: {} })
    return { success: true, message: "Medicine updated successfully", data: medicine }
  } catch (_err: unknown) {
    const error = _err as ServerActionError
    console.error("[ERROR] updateMedicine failed:", error.message)
    if (error.code === 'P2002') return { success: false, message: "A medicine with this name and strength already exists" }
    return { success: false, message: error.message || "Failed to update medicine" }
  }
}

export async function deleteMedicine(id: string) {
  const authResult = await requireAuthSafe(["SUPER_ADMIN", "PHARMACIST"])
  if (!authResult.ok) return { success: false, message: authResult.error }

  try {
    await prisma.$transaction(async (tx) => {
      // Check if any batches still have stock
      const batchesWithStock = await tx.inventoryBatch.findMany({
        where: { medicineId: id, quantity: { gt: 0 } },
        select: { batchNumber: true, quantity: true },
      })

      if (batchesWithStock.length > 0) {
        const batchList = batchesWithStock.map(b => `${b.batchNumber} (${b.quantity} units)`).join(", ")
        throw new Error(`Cannot delete: medicine has stock remaining in batches: ${batchList}`)
      }

      // Delete zero-stock inventory batches first
      await tx.inventoryBatch.deleteMany({ where: { medicineId: id } })

      // Now delete the medicine
      await tx.medicine.delete({ where: { id } })
    })

    revalidatePath("/dashboard/pharmacy/inventory")
    writeAuditLog({ userId: authResult.session.userId, action: "DELETE", module: "Medicine", recordId: id, changes: {} })
    return { success: true, message: "Medicine deleted successfully" }
  } catch (_err: unknown) {
    const error = _err as ServerActionError
    console.error("[ERROR] deleteMedicine failed:", error.message)
    if (error.code === 'P2003') return { success: false, message: "Cannot delete: medicine is referenced in billing records or purchase invoices." }
    return { success: false, message: error.message || "Failed to delete medicine" }
  }
}

/**
 * Add stock (Purchase Entry / GRN)
 * CRITICAL: Expiry date is MANDATORY (Indian pharmacy regulation)
 */
export async function addStock(formData: FormData) {
  const authResult = await requireAuthSafe(["SUPER_ADMIN", "PHARMACIST"])
  if (!authResult.ok) return { success: false, message: authResult.error }

  try {
    const medicineId = formData.get("medicineId") as string
    const supplierId = formData.get("supplierId") as string
    const batchNumber = formData.get("batchNumber") as string
    const stripsReceivedRaw = formData.get("quantity") as string
    const freeStripsRaw = formData.get("freeQuantity") as string
    const medicinesPerStripRaw = formData.get("medicinesPerStrip") as string
    const stripPurchasePriceRaw = formData.get("purchasePrice") as string
    const stripSellingPriceRaw = formData.get("sellingPrice") as string
    const expiryDateStr = formData.get("expiryDate") as string
    const manufactureDateStr = formData.get("manufactureDate") as string
    const grnNumber = formData.get("grnNumber") as string
    const invoiceNumber = formData.get("invoiceNumber") as string
    const invoiceDateStr = formData.get("invoiceDate") as string
    const taxPercentRaw = formData.get("taxPercent") as string
    const discountPercentRaw = formData.get("discountPercent") as string
    const hsnCodeRaw = formData.get("hsnCode") as string
    const isFreeGood = formData.get("isFreeGood") === "true"
    const itemDiscountPercent = discountPercentRaw ? parseFloat(discountPercentRaw) : 0

    // Validation
    if (!medicineId || !supplierId || !batchNumber || !stripsReceivedRaw || !expiryDateStr) {
      return {
        success: false,
        message: "Medicine, supplier, batch number, quantity, and expiry date are required"
      }
    }
    const supplier = await prisma.supplier.findUnique({ where: { id: supplierId }, select: { scope: true } })
    if (!supplier || !supplierAllowedFor(supplier.scope, "PHARMACY")) {
      return { success: false, message: "Supplier is not available for pharmacy inventory" }
    }
    if (!isFreeGood && !stripPurchasePriceRaw) {
      return {
        success: false,
        message: "Purchase price is required for paid items"
      }
    }

    const medicinesPerStrip = medicinesPerStripRaw ? parseInt(medicinesPerStripRaw) : 1
    const stripsReceived = parseInt(stripsReceivedRaw)
    const freeStrips = freeStripsRaw ? parseInt(freeStripsRaw) || 0 : 0
    const quantity = stripsReceived * medicinesPerStrip // Paid units
    const freeUnits = freeStrips * medicinesPerStrip    // Free/bonus units
    const totalStockQty = quantity + freeUnits          // Total units going into inventory
    const stripPurchasePrice = parseFloat(stripPurchasePriceRaw)
    const stripSellingPrice = parseFloat(stripSellingPriceRaw || "0")
    
    // Round to 2 decimal places to avoid floating-point drift
    const round2 = (n: number) => Number(n.toFixed(2))
    const round4 = (n: number) => Number(n.toFixed(4))

    // Store as per unit (tablet) price — user enters price per strip, we divide by pack size
    const purchasePricePerUnit = round4(stripPurchasePrice / medicinesPerStrip)
    const sellingPrice = round4(stripSellingPrice / medicinesPerStrip)
    const taxPercent = taxPercentRaw ? parseFloat(taxPercentRaw) : 0

    // Effective purchase price: spread the paid cost across all units (paid + free)
    // e.g., Buy 10 @ ₹100 + 2 Free → effective = (10×100)/12 = ₹83.33/unit
    const effectivePurchasePrice = freeUnits > 0
      ? round4((quantity * purchasePricePerUnit) / totalStockQty)
      : purchasePricePerUnit

    // INDIAN CONTEXT: Expiry date is MANDATORY
    if (!expiryDateStr) {
      return {
        success: false,
        message: "⚠️ EXPIRY DATE IS MANDATORY - Cannot accept stock without expiry date (Pharmacy regulation)"
      }
    }

    const expiryDate = new Date(expiryDateStr)
    const manufactureDate = manufactureDateStr ? new Date(manufactureDateStr) : null
    const invoiceDate = invoiceDateStr ? new Date(invoiceDateStr) : new Date()

    // Check if expiry date is in the past
    if (expiryDate < new Date()) {
      return {
        success: false,
        message: "⚠️ Cannot add expired stock. Expiry date must be in the future."
      }
    }

    const result = await prisma.$transaction(async (tx) => {
      const medicine = await tx.medicine.findUnique({ where: { id: medicineId } })
      if (!medicine) throw new Error("Medicine not found")

      // NOTE: PurchaseInvoice/PurchaseItem creation is NOT done here.
      // It is handled separately by the purchase invoice system (updatePurchaseInvoiceFull).
      // Previously, this function created both PurchaseItems AND InventoryBatches,
      // which caused stock doubling when invoices were later edited.

      // Update HSN code on medicine if provided and missing
      if (hsnCodeRaw?.trim() && !medicine.hsnCode) {
        await tx.medicine.update({
          where: { id: medicineId },
          data: { hsnCode: hsnCodeRaw.trim() }
        })
      }

      // 2. Inventory Batch Management via centralized service
      const { result: batchResult } = await addToInventory(tx, {
        medicineId,
        batchNumber,
        supplierId,
        paidStrips: isFreeGood ? 0 : stripsReceived,
        freeStrips: isFreeGood ? stripsReceived : freeStrips,
        packSize: medicinesPerStrip,
        purchasePricePerStrip: isFreeGood ? 0 : stripPurchasePrice,
        sellingPricePerStrip: stripSellingPrice,
        expiryDate,
        manufactureDate,
        grnNumber: grnNumber || undefined,
        invoiceNumber: invoiceNumber || undefined,
        invoiceDate,
        taxPercent: isFreeGood ? 0 : taxPercent,
      })
      return batchResult
    }, { timeout: 15000 })

    revalidatePath("/dashboard/pharmacy/inventory")
    revalidatePath("/dashboard/pharmacy/purchase")
    revalidatePath("/dashboard/reports/gstr-2b")

    const freeMsg = freeUnits > 0 ? ` (incl. ${freeUnits} free units)` : ""
    writeAuditLog({ userId: authResult.session.userId, action: "CREATE", module: "Stock", changes: {} })

    return {
      success: true,
      message: `Stock added successfully. Total quantity in batch: ${result.quantity}${freeMsg}`,
      batchId: result.id
    }
  } catch (_err: unknown) {
    const error = _err as ServerActionError
    console.error("[ERROR] addStock failed:", error.message)

    if (error.code === 'P2002') {
      return {
        success: false,
        message: "This batch number already exists for this medicine"
      }
    }

    return {
      success: false,
      message: error.message || "Failed to add stock"
    }
  }
}

/**
 * Batch add stock — saves ALL items in a single Prisma transaction.
 * Prevents partial saves and lost items caused by sequential single-item addStock calls.
 */
export interface BatchStockItem {
  medicineId?: string
  medicineName?: string
  batchNumber: string
  quantity: number         // strips received (paid)
  freeQuantity: number     // free/bonus strips
  packSize: number         // medicines per strip/box
  purchasePrice: number    // rate per strip/box
  sellingPrice: number     // MRP per strip/box
  taxPercent: number
  discountPercent: number
  expiryDate: string
  manufactureDate?: string
  grnNumber?: string
  hsnCode?: string
  isFreeGood: boolean
}

export async function addStockBatch(data: {
  supplierId: string
  invoiceNumber: string
  invoiceDate: string
  items: BatchStockItem[]
}) {
  const authResult = await requireAuthSafe(["SUPER_ADMIN", "PHARMACIST"])
  if (!authResult.ok) return { success: false, message: authResult.error }

  if (!data.supplierId || !data.invoiceNumber?.trim() || !data.invoiceDate) {
    return { success: false, message: "Supplier, invoice number, and invoice date are required" }
  }
  if (!data.items || data.items.length === 0) {
    return { success: false, message: "At least one item is required" }
  }

  // Validate ALL items upfront before touching the database
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const validationErrors: string[] = []

  for (let idx = 0; idx < data.items.length; idx++) {
    const item = data.items[idx]
    const row = idx + 1
    const name = item.medicineName?.trim() || item.medicineId || ""
    if (!name) validationErrors.push(`Row ${row}: Medicine name is required`)
    if (item.quantity < 1) validationErrors.push(`Row ${row} (${name}): Quantity must be at least 1`)
    if (!item.isFreeGood && item.purchasePrice <= 0) validationErrors.push(`Row ${row} (${name}): Purchase price is required`)
    if (!item.batchNumber?.trim()) validationErrors.push(`Row ${row} (${name}): Batch number is required`)
    if (!item.expiryDate) {
      validationErrors.push(`Row ${row} (${name}): Expiry date is required`)
    } else {
      const expiry = new Date(item.expiryDate)
      if (expiry < today) validationErrors.push(`Row ${row} (${name}): Expiry date is in the past`)
    }
    if (!item.sellingPrice || item.sellingPrice <= 0) validationErrors.push(`Row ${row} (${name}): Selling price (MRP) is required`)
    if (!item.packSize || item.packSize < 1) validationErrors.push(`Row ${row} (${name}): Pack size must be at least 1`)
  }

  if (validationErrors.length > 0) {
    return { success: false, message: validationErrors.join("; ") }
  }

  try {
    const supplier = await prisma.supplier.findUnique({ where: { id: data.supplierId }, select: { scope: true } })
    if (!supplier || !supplierAllowedFor(supplier.scope, "PHARMACY")) {
      return { success: false, message: "Supplier is not available for pharmacy inventory" }
    }

    // ALL items in ONE transaction — atomic, no partial saves
    const results = await prisma.$transaction(async (tx) => {
      const batchResults: Array<{ medicineId: string; batchId: string; totalUnits: number }> = []

      for (const item of data.items) {
        // Resolve medicine: by id -> by name -> or auto-create if missing
        let medicine = item.medicineId
          ? await tx.medicine.findUnique({ where: { id: item.medicineId } })
          : null

        if (!medicine && item.medicineName?.trim()) {
          medicine = await tx.medicine.findFirst({
            where: { name: { equals: item.medicineName.trim(), mode: "insensitive" } }
          })
        }

        if (!medicine && item.medicineName?.trim()) {
          medicine = await tx.medicine.create({
            data: {
              name: item.medicineName.trim(),
              genericName: (item as any).genericName?.trim() || item.medicineName.trim(),
              type: "TABLET",
              hsnCode: item.hsnCode?.trim() || "3004",
              unitPrice: item.sellingPrice ? Number((item.sellingPrice / (item.packSize || 1)).toFixed(4)) : 0,
              minStockLevel: 50,
              isActive: true,
            }
          })
        }

        if (!medicine) {
          throw new Error(`Medicine "${item.medicineName || item.medicineId}" could not be found or created.`)
        }

        // Update HSN code on medicine if provided and missing
        if (item.hsnCode?.trim() && !medicine.hsnCode) {
          await tx.medicine.update({
            where: { id: medicine.id },
            data: { hsnCode: item.hsnCode.trim() }
          })
        }

        const stripsReceived = item.quantity
        const freeStrips = item.freeQuantity || 0
        const expiryDate = new Date(item.expiryDate)
        const manufactureDate = item.manufactureDate ? new Date(item.manufactureDate) : null
        const invoiceDate = new Date(data.invoiceDate)

        const { result: batchResult } = await addToInventory(tx, {
          medicineId: medicine.id,
          batchNumber: item.batchNumber.trim(),
          supplierId: data.supplierId,
          paidStrips: item.isFreeGood ? 0 : stripsReceived,
          freeStrips: item.isFreeGood ? stripsReceived : freeStrips,
          packSize: item.packSize,
          purchasePricePerStrip: item.isFreeGood ? 0 : item.purchasePrice,
          sellingPricePerStrip: item.sellingPrice,
          expiryDate,
          manufactureDate,
          grnNumber: item.grnNumber || undefined,
          invoiceNumber: data.invoiceNumber.trim(),
          invoiceDate,
          taxPercent: item.isFreeGood ? 0 : item.taxPercent,
        })

        batchResults.push({
          medicineId: medicine.id,
          batchId: batchResult.id,
          totalUnits: (item.isFreeGood ? 0 : stripsReceived * item.packSize) + (item.isFreeGood ? stripsReceived : freeStrips) * item.packSize,
        })
      }

      return batchResults
    }, { timeout: 30000 }) // 30s timeout for large batches (27+ items)

    revalidatePath("/dashboard/pharmacy/inventory")
    revalidatePath("/dashboard/pharmacy/purchase")
    revalidatePath("/dashboard/reports/gstr-2b")

    writeAuditLog({ userId: authResult.session.userId, action: "CREATE", module: "StockBatch", changes: { itemCount: data.items.length } })

    return {
      success: true,
      message: `All ${data.items.length} item(s) added to stock successfully`,
      results,
    }
  } catch (_err: unknown) {
    const error = _err as ServerActionError
    console.error("[ERROR] addStockBatch failed:", error.message)

    if (error.code === 'P2002') {
      return { success: false, message: "Duplicate batch number detected. Please check batch numbers." }
    }

    return { success: false, message: error.message || "Failed to add stock batch" }
  }
}

export async function updateInventoryBatch(id: string, formData: FormData) {
  const authResult = await requireAuthSafe(["SUPER_ADMIN", "PHARMACIST"])
  if (!authResult.ok) return { success: false, message: authResult.error }

  try {
    const stripsRaw = formData.get("quantity") as string
    const medicinesPerStripRaw = formData.get("medicinesPerStrip") as string
    const looseQuantityRaw = formData.get("looseQuantity") as string
    const stripPurchasePriceRaw = formData.get("purchasePrice") as string
    const stripSellingPriceRaw = formData.get("sellingPrice") as string
    const expiryDateStr = formData.get("expiryDate") as string
    const batchNumber = formData.get("batchNumber") as string

    if (!stripsRaw || !stripPurchasePriceRaw || !stripSellingPriceRaw || !expiryDateStr) {
      return { success: false, message: "Quantity, purchase price, selling price, and expiry date are required" }
    }

    const medicinesPerStrip = medicinesPerStripRaw ? parseInt(medicinesPerStripRaw) : 1
    const strips = parseInt(stripsRaw)
    const looseUnits = looseQuantityRaw ? parseInt(looseQuantityRaw) || 0 : 0
    const quantity = (strips * medicinesPerStrip) + looseUnits // Total units = full strips + loose
    const purchasePrice = parseFloat(stripPurchasePriceRaw) / medicinesPerStrip
    const sellingPrice = parseFloat(stripSellingPriceRaw) / medicinesPerStrip
    const expiryDate = new Date(expiryDateStr)
    const isExpired = expiryDate < new Date()

    const batch = await prisma.inventoryBatch.update({
      where: { id },
      data: {
        batchNumber: batchNumber || undefined,
        medicinesPerStrip,
        quantity,
        // Keep originalQuantity in sync so restoreToInventory and reversal logic work correctly
        originalQuantity: quantity,
        purchasePrice,
        sellingPrice,
        expiryDate,
        isExpired,
      }
    })

    revalidatePath("/dashboard/pharmacy/inventory")
    writeAuditLog({ userId: authResult.session.userId, action: "UPDATE", module: "InventoryBatch", recordId: id, changes: {} })
    return { success: true, message: "Stock batch updated successfully", data: batch }
  } catch (_err: unknown) {
    const error = _err as ServerActionError
    console.error("[ERROR] updateInventoryBatch failed:", error.message)
    return { success: false, message: error.message || "Failed to update stock batch" }
  }
}

export async function deleteInventoryBatch(id: string) {
  const authResult = await requireAuthSafe(["SUPER_ADMIN", "PHARMACIST"])
  if (!authResult.ok) return { success: false, message: authResult.error }

  try {
    await prisma.$transaction(async (tx) => {
      // 1. Fetch the batch to know what purchase data to clean up
      const batch = await tx.inventoryBatch.findUnique({
        where: { id },
        include: { medicine: true },
      })
      if (!batch) throw new Error("Stock batch not found")

      // 2. Find and clean up matching PurchaseItem(s)
      //    Match on: medicineId + batchNumber, scoped to the same supplier's invoice
      if (batch.invoiceNumber && batch.supplierId) {
        // Find the parent PurchaseInvoice(s) that match this batch's invoice + supplier
        const matchingInvoices = await tx.purchaseInvoice.findMany({
          where: {
            invoiceNumber: batch.invoiceNumber,
            supplierId: batch.supplierId,
          },
          select: { id: true },
        })

        const invoiceIds = matchingInvoices.map((inv) => inv.id)

        if (invoiceIds.length > 0) {
          // Delete matching PurchaseItem rows (same medicine + batch on those invoices)
          await tx.purchaseItem.deleteMany({
            where: {
              invoiceId: { in: invoiceIds },
              medicineId: batch.medicineId,
              batchNumber: batch.batchNumber,
            },
          })

          // 3. Recalculate each affected invoice or delete if empty
          for (const invoiceId of invoiceIds) {
            const remainingItems = await tx.purchaseItem.findMany({
              where: { invoiceId },
            })

            if (remainingItems.length === 0) {
              // No items left — delete the entire invoice
              await tx.purchaseInvoice.delete({ where: { id: invoiceId } })
            } else {
              // Recalculate totals from remaining items
              let subTotal = 0
              let taxTotal = 0
              for (const item of remainingItems) {
                const lineBase = item.quantity * item.rate
                const lineTax = lineBase * (item.taxPercent / 100)
                subTotal += lineBase
                taxTotal += lineTax
              }
              const grandTotal = subTotal + taxTotal

              const invoice = await tx.purchaseInvoice.findUnique({ where: { id: invoiceId } })
              const amountPaid = invoice?.amountPaid ?? 0
              const newStatus = amountPaid >= grandTotal ? "PAID" : amountPaid > 0 ? "PARTIAL" : "UNPAID"

              await tx.purchaseInvoice.update({
                where: { id: invoiceId },
                data: { subTotal, taxTotal, grandTotal, status: newStatus },
              })
            }
          }
        }
      }

      // 4. Delete the inventory batch itself
      await tx.inventoryBatch.delete({ where: { id } })
    })

    // 5. Revalidate ALL affected paths
    revalidatePath("/dashboard/pharmacy/inventory")
    revalidatePath("/dashboard/pharmacy/purchase-invoices")
    revalidatePath("/dashboard/finance/purchases")
    revalidatePath("/dashboard/finance/gst")
    revalidatePath("/dashboard/reports/medicine-pnl")
    revalidatePath("/dashboard/reports/hospital-pnl")
    revalidatePath("/dashboard/reports/gstr-2b")
    revalidatePath("/dashboard/reports/gstr-3b")
    revalidatePath("/dashboard/reports/gstr-9")

    writeAuditLog({ userId: authResult.session.userId, action: "DELETE", module: "InventoryBatch", recordId: id, changes: {} })
    return { success: true, message: "Stock batch and related purchase records deleted successfully" }
  } catch (_err: unknown) {
    const error = _err as ServerActionError
    console.error("[ERROR] deleteInventoryBatch failed:", error.message)
    if (error.code === 'P2003') return { success: false, message: "Cannot delete batch because it is referenced in billing." }
    return { success: false, message: error.message || "Failed to delete stock batch" }
  }
}


/**
 * Get all inventory batches with medicine and supplier details
 */
export async function getInventoryBatches() {
  await requireAuth()

  try {
    const batches = await prisma.inventoryBatch.findMany({
      where: { 
        isActive: true,
        quantity: { gt: 0 }
      },
      orderBy: [
        { expiryDate: 'asc' },
        { medicine: { name: 'asc' } }
      ],
      include: {
        medicine: true,
        supplier: true
      }
    })

    // Check and mark expired batches
    const now = new Date()
    const batchesWithStatus = batches.map(batch => {
      const isExpiringSoon = new Date(batch.expiryDate) <= new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000) // 90 days
      const isExpired = new Date(batch.expiryDate) < now

      return {
        ...batch,
        isExpiringSoon,
        isExpired
      }
    })

    return { success: true, data: batchesWithStatus }
  } catch (_err: unknown) {
    const error = _err as ServerActionError
    console.error("[ERROR] getInventoryBatches failed:", error.message)
    return { success: false, message: "Failed to fetch inventory batches" }
  }
}

// ============================================
// IPD DISCHARGE & SETTLEMENT MODULE
// ============================================

/**
 * Get admission details for discharge
 */
export async function getAdmissionForDischarge(admissionId: string) {
  await requireAuth()

  try {
    // Validate admissionId at the very top
    if (!admissionId) {
      throw new Error("Admission ID is missing")
    }

    // FIX: Strict query by ID only (findUnique requires ONLY unique fields)
    const admission = await prisma.iPDAdmission.findUnique({
      where: {
        id: admissionId // ONLY search by ID
      },
      include: {
        patient: true, // Fetch patient details
        bed: {
          include: { ward: true } // Fetch bed and ward details
        },
        primaryDoctor: {
          include: { user: true } // Fetch doctor with user details
        }
      }
    })

    if (!admission) {
      console.error("[ERROR] Admission not found:", admissionId)
      return { success: false, message: "Admission record not found" }
    }

    // Calculate days admitted
    const admissionDate = new Date(admission.admissionDate)
    const today = new Date()
    const daysAdmitted = Math.max(1, Math.ceil((today.getTime() - admissionDate.getTime()) / (1000 * 60 * 60 * 24)))

    // Calculate bed charges
    const totalBedCharges = daysAdmitted * admission.bed.pricePerDay

    // Get lab charges for this admission (if tracked)
    const labCharges = await prisma.billing.aggregate({
      where: {
        patientId: admission.patientId,
        type: "LABORATORY",
        billDate: {
          gte: admission.admissionDate,
          lte: today
        }
      },
      _sum: {
        netAmount: true
      }
    })

    // Get pharmacy charges for this admission
    const pharmacyCharges = await prisma.billing.aggregate({
      where: {
        patientId: admission.patientId,
        type: "PHARMACY",
        billDate: {
          gte: admission.admissionDate,
          lte: today
        }
      },
      _sum: {
        netAmount: true
      }
    })

    const totalLabCharges = labCharges._sum.netAmount || 0
    const totalPharmacyCharges = pharmacyCharges._sum.netAmount || 0

    // Calculate totals
    const totalBillAmount = totalBedCharges + totalLabCharges + totalPharmacyCharges
    const amountPaid = admission.initialDeposit
    const balanceDue = totalBillAmount - amountPaid

    return {
      success: true,
      data: {
        admission,
        daysAdmitted,
        totalBedCharges,
        totalLabCharges,
        totalPharmacyCharges,
        totalBillAmount,
        amountPaid,
        balanceDue
      }
    }
  } catch (_err: unknown) {
    const error = _err as ServerActionError
    console.error("[CRITICAL ERROR] getAdmissionForDischarge failed:", error.message)
    return { success: false, message: "Failed to load discharge details. Please contact support." }
  }
}

/**
 * @deprecated Use `processDischarge` from `@/app/actions/discharge` instead.
 * That version includes full financial gatekeeping, insurance exception logic,
 * and creates a formal Discharge record. This function is kept temporarily
 * for backward compatibility but should not be called by new code.
 */
export async function processDischarge_DEPRECATED(formData: FormData) {
  const authResult = await requireAuthSafe(["SUPER_ADMIN", "DOCTOR", "NURSE"])
  if (!authResult.ok) return { success: false, message: authResult.error }

  try {

    const admissionId = formData.get("admissionId") as string
    const dischargeType = formData.get("dischargeType") as string
    const finalDiagnosis = formData.get("finalDiagnosis") as string
    const reasonForAdmission = formData.get("reasonForAdmission") as string
    const courseInHospital = formData.get("courseInHospital") as string
    const conditionAtDischarge = formData.get("conditionAtDischarge") as string
    const adviceOnDischarge = formData.get("adviceOnDischarge") as string
    const followUpDateStr = formData.get("followUpDate") as string
    const filesHandedOver = formData.get("filesHandedOver") === "true"

    // Billing details
    const totalBedChargesRaw = formData.get("totalBedCharges") as string
    const totalLabChargesRaw = formData.get("totalLabCharges") as string
    const totalPharmacyChargesRaw = formData.get("totalPharmacyCharges") as string
    const additionalDiscountRaw = formData.get("additionalDiscount") as string
    const finalBalanceRaw = formData.get("finalBalance") as string

    if (!admissionId || !dischargeType) {
      return {
        success: false,
        message: "Admission ID and discharge type are required"
      }
    }

    // Parse numbers
    const totalBedCharges = parseFloat(totalBedChargesRaw) || 0
    const totalLabCharges = parseFloat(totalLabChargesRaw) || 0
    const totalPharmacyCharges = parseFloat(totalPharmacyChargesRaw) || 0
    const additionalDiscount = parseFloat(additionalDiscountRaw) || 0
    const finalBalance = parseFloat(finalBalanceRaw) || 0

    const totalBillAmount = totalBedCharges + totalLabCharges + totalPharmacyCharges - additionalDiscount
    const followUpDate = followUpDateStr ? new Date(followUpDateStr) : null

    // Get admission with relations
    const admission = await prisma.iPDAdmission.findUnique({
      where: { id: admissionId },
      include: {
        patient: true,
        bed: true
      }
    })

    if (!admission) {
      return { success: false, message: "Admission not found" }
    }

    if (admission.status !== "ADMITTED") {
      return { success: false, message: "Patient is not currently admitted" }
    }

    // ── FINANCIAL GATEKEEPING ──
    // For NORMAL discharges, enforce that the balance is settled (or covered by insurance)
    // LAMA, ABSCONDED, DEATH, REFERRED are exempt — hospital must release the patient
    const isNormalDischarge = dischargeType === "NORMAL"

    if (isNormalDischarge && finalBalance > 0) {
      // Check if there is an approved insurance claim that could cover the outstanding balance
      // Look for claims linked to this patient's billing that are APPROVED
      const approvedInsuranceClaims = await prisma.insuranceClaim.findMany({
        where: {
          policy: {
            patientId: admission.patientId,
          },
          status: "APPROVED",
        },
      })

      const totalInsuranceCoverage = approvedInsuranceClaims.reduce(
        (sum: number, claim: { approvedAmount: number | null }) => sum + (claim.approvedAmount || 0),
        0
      )

      // Also check for active (pending) claims — these are expected future payments
      const activePendingClaims = await prisma.insuranceClaim.findMany({
        where: {
          policy: {
            patientId: admission.patientId,
          },
          status: {
            in: ["SUBMITTED", "UNDER_REVIEW", "IN_PROCESS"],
          },
        },
      })

      const totalPendingClaimAmount = activePendingClaims.reduce(
        (sum: number, claim: { claimAmount: number }) => sum + (claim.claimAmount || 0),
        0
      )

      const hasInsuranceCoverage = totalInsuranceCoverage > 0 || totalPendingClaimAmount > 0

      if (!hasInsuranceCoverage) {
        return {
          success: false,
          message: `Cannot discharge. Outstanding balance of ₹${finalBalance.toFixed(2)}. Please clear dues or submit an insurance claim before proceeding.`,
        }
      }

      // Insurance exists — allow discharge but log the exception
    }

    // Get bed details for bill generation
    const bedWithWard = await prisma.bed.findUnique({
      where: { id: admission.bedId },
      include: { ward: true }
    })

    const daysAdmitted = Math.max(1, Math.ceil((new Date().getTime() - new Date(admission.admissionDate).getTime()) / (1000 * 60 * 60 * 24)))

    // Process discharge in a transaction
    const result = await prisma.$transaction(async (tx) => {
      // 1. Update IPD Admission with discharge details
      const updatedAdmission = await tx.iPDAdmission.update({
        where: { id: admissionId },
        data: {
          status: "DISCHARGED",
          dischargeDate: new Date(),
          dischargeType: dischargeType as DischargeType,
          finalDiagnosis,
          reason: reasonForAdmission || admission.reason,
          courseInHospital,
          conditionAtDischarge,
          adviceOnDischarge,
          followUpDate,

          // Billing details
          totalBedCharges,
          totalLabCharges,
          totalPharmacyCharges,
          totalBillAmount,
          amountPaid: admission.initialDeposit,
          balanceDue: finalBalance,

          // Indian context
          filesHandedOver,

          // Summary
          dischargeSummary: `Diagnosis: ${finalDiagnosis}\n\nCourse: ${courseInHospital}\n\nCondition: ${conditionAtDischarge}\n\nAdvice: ${adviceOnDischarge}`
        }
      })

      // 2. CRITICAL: Release the bed (change status to AVAILABLE)
      await tx.bed.update({
        where: { id: admission.bedId },
        data: {
          status: "AVAILABLE",
          lastCleaned: null // Mark for cleaning
        }
      })

      // 3. ALWAYS create discharge invoice (for printing, even if refund)
      const billNumber = `IPD-${Date.now()}`

      const dischargeBill = await tx.billing.create({
        data: {
          billNumber,
          patientId: admission.patientId,
          type: "IPD",
          billDate: new Date(),
          totalAmount: totalBedCharges + totalLabCharges + totalPharmacyCharges,
          discountAmount: additionalDiscount,
          netAmount: totalBillAmount,
          paidAmount: admission.initialDeposit,
          balanceAmount: finalBalance,
          status: finalBalance <= 0 ? "PAID" : "PENDING",
          paymentMethod: finalBalance <= 0 ? "ADVANCE_DEPOSIT" : null
        }
      })

      // 4. Create billing line items for detailed breakdown
      const billItems = []

      // Room/Bed Charges
      if (totalBedCharges > 0) {
        billItems.push(
          tx.billingItem.create({
            data: {
              billingId: dischargeBill.id,
              description: `Room Rent - ${bedWithWard?.ward.name} (${bedWithWard?.bedNumber})`,
              quantity: daysAdmitted,
              unitPrice: bedWithWard?.pricePerDay || 0,
              amount: totalBedCharges,
              gstRate: 0,
              gstAmount: 0,
              totalAmount: totalBedCharges
            }
          })
        )
      }

      // Lab Charges
      if (totalLabCharges > 0) {
        billItems.push(
          tx.billingItem.create({
            data: {
              billingId: dischargeBill.id,
              description: "Laboratory Investigations",
              quantity: 1,
              unitPrice: totalLabCharges,
              amount: totalLabCharges,
              gstRate: 0,
              gstAmount: 0,
              totalAmount: totalLabCharges
            }
          })
        )
      }

      // Pharmacy Charges
      if (totalPharmacyCharges > 0) {
        billItems.push(
          tx.billingItem.create({
            data: {
              billingId: dischargeBill.id,
              description: "Medicines & Consumables",
              quantity: 1,
              unitPrice: totalPharmacyCharges,
              amount: totalPharmacyCharges,
              gstRate: 0,
              gstAmount: 0,
              totalAmount: totalPharmacyCharges
            }
          })
        )
      }

      // Discount as a line item (if any)
      if (additionalDiscount > 0) {
        billItems.push(
          tx.billingItem.create({
            data: {
              billingId: dischargeBill.id,
              description: "Management Discount",
              quantity: 1,
              unitPrice: -additionalDiscount,
              amount: -additionalDiscount,
              gstRate: 0,
              gstAmount: 0,
              totalAmount: -additionalDiscount
            }
          })
        )
      }

      await Promise.all(billItems)

      return { updatedAdmission, dischargeBill }
    })

    // Fetch the complete bill with items for printing
    const completeBill = await prisma.billing.findUnique({
      where: { id: result.dischargeBill.id },
      include: {
        patient: true,
        items: true
      }
    })

    // Fetch doctor details
    const doctorDetails = await prisma.staff.findUnique({
      where: { id: admission.primaryDoctorId },
      include: { user: true }
    })

    revalidatePath("/dashboard/ipd")
    revalidatePath(`/dashboard/ipd/discharge/${admissionId}`)

    return {
      success: true,
      message: `Patient discharged successfully. Bed ${admission.bed.bedNumber} is now available.`,
      invoiceData: {
        billNumber: completeBill?.billNumber,
        billDate: completeBill?.billDate,
        patientName: admission.patient.patientId,
        patientAddress: admission.patient.address,
        patientAge: admission.patient.dateOfBirth
          ? Math.floor((new Date().getTime() - new Date(admission.patient.dateOfBirth).getTime()) / (1000 * 60 * 60 * 24 * 365.25))
          : null,
        patientGender: admission.patient.gender,
        admissionDate: admission.admissionDate,
        dischargeDate: new Date(),
        daysAdmitted,
        bedNumber: bedWithWard?.bedNumber,
        wardName: bedWithWard?.ward.name,
        doctorName: doctorDetails?.user?.name || "N/A",
        items: completeBill?.items || [],
        totalAmount: completeBill?.totalAmount || 0,
        discountAmount: additionalDiscount,
        netAmount: completeBill?.netAmount || 0,
        advancePaid: admission.initialDeposit,
        balanceDue: finalBalance,
        finalDiagnosis
      }
    }
  } catch (_err: unknown) {
    const error = _err as ServerActionError
    console.error("[ERROR] processDischarge failed:", error.message)

    return {
      success: false,
      message: error.message || "Failed to process discharge"
    }
  }
}

// ============================================
// EMR / ELECTRONIC MEDICAL RECORDS MODULE
// ============================================

/**
 * Get doctor's queue - today's appointments that need attention
 */
export async function getDoctorQueue(doctorId?: string) {
  await requireAuth()

  try {

    const today = new Date()
    today.setHours(0, 0, 0, 0)

    const tomorrow = new Date(today)
    tomorrow.setDate(tomorrow.getDate() + 1)

    const appointments = await prisma.appointment.findMany({
      where: {
        appointmentDate: {
          gte: today,
          lt: tomorrow
        },
        status: {
          in: ['PENDING', 'SCHEDULED', 'CONFIRMED', 'IN_PROGRESS', 'WAITING']
        },
        ...(doctorId ? { doctorId } : {})
      },
      include: {
        patient: {
          include: {
            user: true
          }
        },
        doctor: {
          include: {
            user: true
          }
        }
      },
      orderBy: [
        { status: 'desc' }, // IN_PROGRESS first
        { appointmentTime: 'asc' }
      ]
    })

    return {
      success: true,
      data: appointments
    }
  } catch (_err: unknown) {
    const error = _err as ServerActionError
    console.error("[ERROR] getDoctorQueue failed:", error.message)

    return {
      success: false,
      message: "Failed to load doctor's queue",
      data: []
    }
  }
}

/**
 * Save consultation (EMR) with prescription and lab orders
 */
export async function saveConsultation(data: {
  appointmentId: string
  // Vitals
  bloodPressure?: string
  pulse?: string
  temperature?: string
  weight?: string
  spo2?: string
  // Clinical Details
  chiefComplaint?: string
  historyOfPresentIllness?: string
  symptoms?: string
  diagnosis?: string
  notes?: string
  // Prescription
  medications: Array<{
    medicationName: string
    dosage: string
    frequency: string
    duration: string
    quantity: number
    instructions?: string
  }>
  // Lab Tests - SEPARATE arrays for Pathology and Radiology with full info
  pathologyTests?: Array<{ id: string; name: string; code: string; price: number }>
  radiologyTests?: Array<{ id: string; name: string; code: string; price: number }>
  // Legacy: simple array of test IDs (for backward compatibility)
  labTestIds?: string[]
  // Follow-up
  followUpDate?: string
  // Hold for reports (same-day return)
  waitingForReports?: boolean
  // Doctor's Advisory — IPD Admission
  advisedAdmission?: boolean
  admissionReason?: string
  admissionNotes?: string
  // Doctor's Advisory — Operation / Surgery
  advisedSurgery?: boolean
  advisedSurgeryName?: string
  surgeryUrgency?: string
  surgeryNotes?: string
  // Paper Consultation
  isPaperConsultation?: boolean
  scannedPaperUrl?: string
}) {
  const authResult = await requireAuthSafe(["SUPER_ADMIN", "DOCTOR"])
  if (!authResult.ok) return { success: false, message: authResult.error }

  try {

    // Validate
    if (!data.appointmentId) {
      return {
        success: false,
        message: "Appointment ID is required"
      }
    }

    // Get appointment
    const appointment = await prisma.appointment.findUnique({
      where: { id: data.appointmentId },
      include: {
        patient: true,
        doctor: {
          include: { user: true }
        }
      }
    })

    if (!appointment) {
      return {
        success: false,
        message: "Appointment not found"
      }
    }

    // Transaction: Update appointment + create prescription + create lab requests
    const result = await prisma.$transaction(async (tx) => {
      // 1. Update appointment with clinical data
      const updatedAppointment = await tx.appointment.update({
        where: { id: data.appointmentId },
        data: {
          status: data.waitingForReports ? 'WAITING_FOR_REPORTS' : 'COMPLETED',
          // Vitals
          bloodPressure: data.bloodPressure || null,
          pulse: data.pulse || null,
          temperature: data.temperature || null,
          weight: data.weight || null,
          spo2: data.spo2 || null,
          // Clinical
          chiefComplaint: data.chiefComplaint || null,
          historyOfPresentIllness: data.historyOfPresentIllness || null,
          symptoms: data.symptoms || null,
          diagnosis: data.diagnosis || null,
          notes: data.notes || null,
          // Doctor's Advisory — IPD Admission
          advisedAdmission: data.advisedAdmission || false,
          admissionReason: data.admissionReason || null,
          admissionNotes: data.admissionNotes || null,
          // Doctor's Advisory — Operation / Surgery
          advisedSurgery: data.advisedSurgery || false,
          advisedSurgeryName: data.advisedSurgeryName || null,
          surgeryUrgency: data.surgeryUrgency || null,
          surgeryNotes: data.surgeryNotes || null,
          isPaperConsultation: data.isPaperConsultation || false,
          scannedPaperUrl: data.scannedPaperUrl || null,
        }
      })

      // 2. Create Medical Record
      const medicalRecord = await tx.medicalRecord.create({
        data: {
          patientId: appointment.patientId,
          appointmentId: data.appointmentId,
          chiefComplaint: data.chiefComplaint || null,
          diagnosis: data.diagnosis || (data.isPaperConsultation ? "Treated on Physical OPD Paper" : null),
          symptoms: data.symptoms || null,
          examination: data.notes || (data.isPaperConsultation ? "Physical OPD examination on paper" : null),
          isPaperConsultation: data.isPaperConsultation || false,
          scannedPaperUrl: data.scannedPaperUrl || null,
          vitals: {
            bloodPressure: data.bloodPressure,
            pulse: data.pulse,
            temperature: data.temperature,
            weight: data.weight,
            spo2: data.spo2
          },
          followUpDate: data.followUpDate ? new Date(data.followUpDate) : null
        }
      })

      // 3. Create Prescription if medications provided
      let prescription = null
      if (data.medications && data.medications.length > 0) {
        prescription = await tx.prescription.create({
          data: {
            patientId: appointment.patientId,
            medicalRecordId: medicalRecord.id,
            prescribedBy: appointment.doctorId,
            prescriptionDate: new Date(),
            instructions: data.diagnosis || "As prescribed",
            medications: {
              create: data.medications.map(med => ({
                medicationName: med.medicationName,
                dosage: med.dosage,
                frequency: med.frequency,
                duration: med.duration,
                quantity: med.quantity,
                instructions: med.instructions || null
              }))
            }
          },
          include: {
            medications: true
          }
        })
      }

      // 4. Create Lab Requests if tests selected (with PATHOLOGY or RADIOLOGY type)
      const labRequests = []

      // Helper function to find or use test data
      const getOrCreateTestCatalogId = async (testItem: { id: string; name: string; code: string; price: number }, testType: 'PATHOLOGY' | 'RADIOLOGY') => {
        // Check if ID is a default/placeholder ID
        const isDefaultId = testItem.id.startsWith('default-')

        if (!isDefaultId) {
          // Try to find by ID first
          const existingById = await tx.labTestCatalog.findUnique({
            where: { id: testItem.id }
          })
          if (existingById) {
            return { catalogId: existingById.id, name: existingById.name, price: existingById.price }
          }
        }

        // Try to find by code
        const existingByCode = await tx.labTestCatalog.findUnique({
          where: { code: testItem.code }
        })
        if (existingByCode) {
          return { catalogId: existingByCode.id, name: existingByCode.name, price: existingByCode.price }
        }

        // Create new catalog entry (auto-seed from doctor's selection)
        const newCatalog = await tx.labTestCatalog.create({
          data: {
            name: testItem.name,
            code: testItem.code,
            price: testItem.price,
            type: testType,
            category: testType === 'RADIOLOGY' ? 'Radiology' : 'General',
            isActive: true,
          }
        })
        return { catalogId: newCatalog.id, name: newCatalog.name, price: newCatalog.price }
      }

      // Process PATHOLOGY tests
      if (data.pathologyTests && data.pathologyTests.length > 0) {
        for (const testItem of data.pathologyTests) {
          const { catalogId, name, price } = await getOrCreateTestCatalogId(testItem, 'PATHOLOGY')

          const labRequest = await tx.labRequest.create({
            data: {
              patientId: appointment.patientId,
              appointmentId: data.appointmentId,
              orderedBy: appointment.doctorId,
              testCatalogId: catalogId,
              testName: name,
              testPrice: price,
              testType: 'PATHOLOGY', // Explicitly set type
              status: 'PENDING_PAYMENT', // CRITICAL: Must be PENDING_PAYMENT for billing
              priority: 'ROUTINE',
              notes: `Ordered by Dr. ${appointment.doctor.user.name} during OPD consultation`
            }
          })
          labRequests.push(labRequest)
        }
      }

      // Process RADIOLOGY tests
      if (data.radiologyTests && data.radiologyTests.length > 0) {
        for (const testItem of data.radiologyTests) {
          const { catalogId, name, price } = await getOrCreateTestCatalogId(testItem, 'RADIOLOGY')

          const labRequest = await tx.labRequest.create({
            data: {
              patientId: appointment.patientId,
              appointmentId: data.appointmentId,
              orderedBy: appointment.doctorId,
              testCatalogId: catalogId,
              testName: name,
              testPrice: price,
              testType: 'RADIOLOGY', // Explicitly set type
              status: 'PENDING_PAYMENT', // CRITICAL: Must be PENDING_PAYMENT for billing
              priority: 'ROUTINE',
              notes: `Ordered by Dr. ${appointment.doctor.user.name} during OPD consultation`
            }
          })
          labRequests.push(labRequest)
        }
      }

      if (labRequests.length > 0) {
        const pathologyCount = data.pathologyTests?.length || 0
        const radiologyCount = data.radiologyTests?.length || 0
      }

      return { updatedAppointment, medicalRecord, prescription, labRequests }
    })

    revalidatePath(`/dashboard/clinical/emr/${data.appointmentId}`)
    revalidatePath("/dashboard/clinical/emr")
    revalidatePath("/dashboard/clinical/opd")
    revalidatePath("/dashboard/doctor")
    revalidatePath("/dashboard/pharmacy/queue")
    revalidatePath("/dashboard/pharmacy/pos")
    // Lab and Billing pages for diagnostic tests
    revalidatePath("/dashboard/billing/diagnostics")
    revalidatePath("/dashboard/lab/pathology/queue")
    revalidatePath("/dashboard/lab/radiology/queue")
    revalidatePath("/dashboard/radiology/queue")

      writeAuditLog({ userId: authResult.session.userId, action: "UPDATE", module: "Consultation", recordId: data.appointmentId, changes: { diagnosis: data.diagnosis } })

    const statusMsg = data.waitingForReports
      ? "Consultation saved. Patient held in queue for reports."
      : "Consultation saved successfully"

    return {
      success: true,
      message: statusMsg,
      data: {
        appointmentId: result.updatedAppointment.id,
        medicalRecordId: result.medicalRecord.id,
        prescriptionId: result.prescription?.id,
        labRequestsCreated: result.labRequests.length,
        waitingForReports: data.waitingForReports || false,
      }
    }
  } catch (_err: unknown) {
    const error = _err as ServerActionError
    console.error("[ERROR] saveConsultation failed:", error.message)

    return {
      success: false,
      message: error.message || "Failed to save consultation"
    }
  }
}

export async function updatePatient(
  prevState: Record<string, unknown> | null,
  formData: FormData
) {
  const authResult = await requireAuthSafe(["SUPER_ADMIN", "DOCTOR", "RECEPTIONIST", "NURSE"])
  if (!authResult.ok) return { success: false, message: authResult.error }

  // 1. Extract Identifiers
  const patientId = formData.get("patientId") as string
  const userId = formData.get("userId") as string

  // 2. Extract Data Fields
  const fullName = formData.get("fullName") as string
  const dateOfBirth = formData.get("dateOfBirth") as string
  const gender = formData.get("gender") as string
  const phone = formData.get("phone") as string
  const email = formData.get("email") as string
  const address = formData.get("address") as string
  
  // New Fields
  const fatherOrHusbandName = formData.get("fatherOrHusbandName") as string
  const bloodGroup = formData.get("bloodGroup") as string
  const maritalStatus = formData.get("maritalStatus") as string
  const occupation = formData.get("occupation") as string
  const nationality = formData.get("nationality") as string
  const religion = formData.get("religion") as string
  const aadharNumber = formData.get("aadharNumber") as string
  const referredBy = formData.get("referredBy") as string
  const city = formData.get("city") as string
  const state = formData.get("state") as string
  const pincode = formData.get("pincode") as string
  
  // Emergency Contact
  const emergencyContactName = formData.get("emergencyContactName") as string
  const emergencyContact = formData.get("emergencyContact") as string
  const emergencyContactRelation = formData.get("emergencyContactRelation") as string
  
  // Medical Info
  const allergies = formData.get("allergies") as string
  const currentMedications = formData.get("currentMedications") as string
  const medicalHistory = formData.get("medicalHistory") as string

  // 3. Basic Validation
  if (!patientId || !userId || !fullName || !dateOfBirth || !gender || !address) {
    return { success: false, error: true, message: "Missing required fields" }
  }

  // 4. Parse Date
  let dobDate: Date
  if (dateOfBirth.includes("-")) {
    const parts = dateOfBirth.split("-")
    if (parts[0].length === 4) {
      dobDate = new Date(dateOfBirth)
    } else {
      const [day, month, year] = parts
      dobDate = new Date(`${year}-${month}-${day}`)
    }
  } else {
    dobDate = new Date(dateOfBirth)
  }

  if (isNaN(dobDate.getTime())) {
    return { success: false, error: true, message: "Invalid date of birth" }
  }

  // 5. Update Database
  try {
    await prisma.$transaction(async (tx) => {
      // Update User record (Name & Email)
      await tx.user.update({
        where: { id: userId },
        data: { 
          name: fullName, 
          email: email && !email.includes("hospital-erp.internal") ? email : undefined 
        },
      })

      // Update Patient record (All other fields)
      await tx.patient.update({
        where: { id: patientId },
        data: { 
          dateOfBirth: dobDate, 
          gender: gender as any, 
          phone: phone || null, 
          address,
          city: city || null,
          state: state || null,
          pincode: pincode || null,
          bloodGroup: bloodGroup || null,
          aadharNumber: aadharNumber || null,
          fatherOrHusbandName: fatherOrHusbandName || null,
          maritalStatus: maritalStatus || null,
          occupation: occupation || null,
          nationality: nationality || "Indian",
          religion: religion || null,
          referredBy: referredBy || null,
          emergencyContact: emergencyContact || null,
          emergencyContactName: emergencyContactName || null,
          emergencyContactRelation: emergencyContactRelation || null,
          allergies: allergies || null,
          currentMedications: currentMedications || null,
          medicalHistory: medicalHistory || null,
        },
      })
    })

    writeAuditLog({ 
      userId: authResult.session.userId, 
      action: "UPDATE", 
      module: "Patient", 
      recordId: patientId, 
      changes: { fullName, phone } 
    })

    revalidatePath("/dashboard/clinical/opd")
    revalidatePath(`/dashboard/clinical/opd/edit/${patientId}`)
    
    return { success: true, message: "Patient information updated successfully!" }
  } catch (_error: any) {
    console.error("[ERROR] updatePatient failed:", _error.message)
    return { success: false, error: true, message: _error.message || "Failed to update patient" }
  }
}


/**
 * Helper to manually revalidate the OPD page from the client
 */
export async function revalidateOPDPage() {
  revalidatePath("/dashboard/clinical/opd")
  revalidatePath("/dashboard/finance/billing")
  return { success: true }
}
