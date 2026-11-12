"use server"

import { prisma } from "@/lib/prisma"
import { revalidatePath } from "next/cache"
import { requireAuth, requireAuthSafe } from "@/lib/auth-guard"
import { writeAuditLog } from "@/lib/audit"

// ============================================
// TYPES
// ============================================

interface DischargeMedicineItem {
  id?: string // existing DischargeMedicine id (omit for new rows)
  medicineId?: string | null // pharmacy Medicine id (required for pending rows)
  medicineName: string
  dosage: string
  frequency: string
  duration: string
  quantity: number
  instruction?: string
}

export interface SavedDischargeMedicine {
  id: string
  medicineId: string | null
  medicineName: string
  dosage: string
  frequency: string
  duration: string
  quantity: number
  instruction: string | null
  pharmacyStatus: string
}

interface DischargeSummaryData {
  dischargeTypeCode?: string | null
  customDischargeData?: any
  finalDiagnosis: string
  proceduresDone?: string
  courseInHospital?: string
  treatmentGiven?: string
  conditionAtDischarge?: string
  adviceOnDischarge?: string
  followUpDate?: string | null // ISO date string
  dischargeMedicines?: DischargeMedicineItem[]
  dischargeDoctorId?: string | null
  dischargeSignatoryId?: string | null
}

// ============================================
// SAVE DISCHARGE SUMMARY (Draft)
// ============================================

/**
 * saveDischargeSummary — Save or update the discharge summary fields
 * on the IPDAdmission record.
 *
 * This is a "Save Draft" action. The doctor can save and come back
 * to edit before the actual discharge is processed.
 */
export async function saveDischargeSummary(
  context: { admissionId?: string; emergencyVisitId?: string },
  data: DischargeSummaryData
): Promise<{ success: boolean; message: string; dischargeMedicines?: SavedDischargeMedicine[] }> {
  const authResult = await requireAuthSafe(["SUPER_ADMIN", "DOCTOR"])
  if (!authResult.ok) return { success: false, message: authResult.error }

  try {
    if (!context.admissionId && !context.emergencyVisitId) {
      return { success: false, message: "Admission ID or ER Visit ID is required" }
    }

    // Resolve final diagnosis from data or customDischargeData or admission record
    let resolvedDiagnosis = data.finalDiagnosis?.trim() || ""
    if (!resolvedDiagnosis && data.customDischargeData && typeof data.customDischargeData === "object") {
      const cd = data.customDischargeData as Record<string, any>
      resolvedDiagnosis = (
        cd.finalDiagnosis ||
        cd.disease ||
        cd.DISEASE ||
        cd.diagnosis ||
        cd.provisionalDiagnosis ||
        Object.entries(cd).find(([k, v]) => (k.toLowerCase().includes("diag") || k.toLowerCase().includes("disease")) && typeof v === "string" && v.trim().length > 0)?.[1] ||
        Object.values(cd).find((val) => typeof val === "string" && val.trim().length > 0) ||
        ""
      ).toString().trim()
    }

    if (!resolvedDiagnosis && context.admissionId) {
      const adm = await prisma.iPDAdmission.findUnique({
        where: { id: context.admissionId },
        select: { diagnosis: true, reason: true },
      })
      resolvedDiagnosis = adm?.diagnosis?.trim() || adm?.reason?.trim() || ""
    }

    if (!resolvedDiagnosis && context.emergencyVisitId) {
      const vis = await prisma.emergencyVisit.findUnique({
        where: { id: context.emergencyVisitId },
        select: { chiefComplaint: true, triageLevel: true },
      })
      resolvedDiagnosis = vis?.chiefComplaint?.trim() || vis?.triageLevel?.trim() || ""
    }

    if (!resolvedDiagnosis) {
      resolvedDiagnosis = "Clinical Evaluation / Normal Discharge"
    }

    // Parse follow-up date if provided
    let followUpDate: Date | null = null
    if (data.followUpDate) {
      followUpDate = new Date(data.followUpDate)
      if (isNaN(followUpDate.getTime())) {
        followUpDate = null
      }
    }

    let savedMedicines: SavedDischargeMedicine[] | undefined

    if (context.admissionId) {
      const admissionId = context.admissionId
      const admission = await prisma.iPDAdmission.findUnique({
        where: { id: admissionId },
        select: { id: true, status: true },
      })
      if (!admission) return { success: false, message: "Admission not found" }

      // Discharge medicines are locked once the patient is discharged — the final bill is closed.
      const medicinesLocked = admission.status === "DISCHARGED"
      const incoming = !medicinesLocked && data.dischargeMedicines ? data.dischargeMedicines : null

      // ---- Validate incoming medicines BEFORE writing anything ----
      let medicineMap = new Map<string, { id: string; name: string }>()
      if (incoming) {
        const existingRows = await prisma.dischargeMedicine.findMany({
          where: { admissionId },
          select: { id: true, pharmacyStatus: true },
        })
        const statusById = new Map(existingRows.map((r) => [r.id, r.pharmacyStatus]))

        // Rows that will be written = new rows + rows that are still PENDING in the DB.
        // Ids pointing to DISPENSED/CANCELLED rows (or unknown ids) are ignored.
        const writable = incoming.filter((m) => !m.id || statusById.get(m.id) === "PENDING")

        for (const m of writable) {
          const label = m.medicineName?.trim() || "(blank row)"
          if (!m.medicineId) {
            return { success: false, message: `Re-select "${label}" from the pharmacy list. Only pharmacy medicines can be prescribed.` }
          }
          if (!Number.isInteger(m.quantity) || m.quantity < 1) {
            return { success: false, message: `Quantity for "${label}" must be a whole number of at least 1` }
          }
        }

        const ids = [...new Set(writable.map((m) => m.medicineId!))]
        const meds = ids.length
          ? await prisma.medicine.findMany({ where: { id: { in: ids }, isActive: true }, select: { id: true, name: true } })
          : []
        medicineMap = new Map(meds.map((m) => [m.id, m]))
        const missing = writable.find((m) => !medicineMap.has(m.medicineId!))
        if (missing) {
          return { success: false, message: `"${missing.medicineName}" is not an active pharmacy medicine. Please re-select it.` }
        }
      }

      await prisma.$transaction(async (tx) => {
        const validDischargeType = data.dischargeTypeCode && ["NORMAL", "LAMA", "DAMA", "ABSCONDED", "DEATH", "REFERRED", "TRANSFER"].includes(data.dischargeTypeCode)
          ? (data.dischargeTypeCode as any)
          : (data.dischargeTypeCode === "NORMAL" ? "NORMAL" : undefined)

        await tx.iPDAdmission.update({
          where: { id: admissionId },
          data: {
            dischargeTypeCode: data.dischargeTypeCode || "NORMAL",
            ...(validDischargeType ? { dischargeType: validDischargeType } : {}),
            customDischargeData: data.customDischargeData || null,
            finalDiagnosis: resolvedDiagnosis,
            proceduresDone: data.proceduresDone?.trim() || null,
            courseInHospital: data.courseInHospital?.trim() || null,
            treatmentGiven: data.treatmentGiven?.trim() || null,
            conditionAtDischarge: data.conditionAtDischarge?.trim() || null,
            adviceOnDischarge: data.adviceOnDischarge?.trim() || null,
            followUpDate,
            ...(data.dischargeDoctorId !== undefined ? { dischargeDoctorId: data.dischargeDoctorId || null } : {}),
            ...(data.dischargeSignatoryId !== undefined ? { dischargeSignatoryId: data.dischargeSignatoryId || null } : {}),
          },
        })

        if (!incoming) return

        // Re-read inside the transaction so a row dispensed a moment ago is never overwritten.
        const current = await tx.dischargeMedicine.findMany({
          where: { admissionId },
          select: { id: true, pharmacyStatus: true },
        })
        const pendingIds = new Set(current.filter((r) => r.pharmacyStatus === "PENDING").map((r) => r.id))
        const keptPendingIds = new Set<string>()

        for (const m of incoming) {
          if (m.id && !pendingIds.has(m.id)) continue // dispensed/cancelled/unknown → never touched
          const med = medicineMap.get(m.medicineId!)
          if (!med) continue // only possible for ignored rows (validated above)
          const rowData = {
            medicineId: med.id,
            medicineName: med.name, // canonical pharmacy name
            dosage: (m.dosage || "").trim(),
            frequency: (m.frequency || "").trim(),
            duration: (m.duration || "").trim(),
            quantity: m.quantity,
            instruction: m.instruction?.trim() || null,
          }
          if (m.id) {
            // Conditional update: only if still PENDING at write time
            const res = await tx.dischargeMedicine.updateMany({
              where: { id: m.id, pharmacyStatus: "PENDING" },
              data: rowData,
            })
            if (res.count === 1) keptPendingIds.add(m.id)
          } else {
            await tx.dischargeMedicine.create({ data: { admissionId, ...rowData } })
          }
        }

        // Pending rows the doctor removed from the list
        const toDelete = [...pendingIds].filter((id) => !keptPendingIds.has(id))
        if (toDelete.length > 0) {
          await tx.dischargeMedicine.deleteMany({
            where: { id: { in: toDelete }, pharmacyStatus: "PENDING" },
          })
        }
      })

      savedMedicines = await prisma.dischargeMedicine.findMany({
        where: { admissionId },
        orderBy: { createdAt: "asc" },
        select: {
          id: true, medicineId: true, medicineName: true, dosage: true, frequency: true,
          duration: true, quantity: true, instruction: true, pharmacyStatus: true,
        },
      })

      revalidatePath(`/dashboard/ipd/patient/${admissionId}`)
      revalidatePath(`/dashboard/ipd/discharge/${admissionId}`)
      revalidatePath(`/dashboard/ipd/print/summary/${admissionId}`)
      revalidatePath(`/dashboard/pharmacy/pos`) // Update pharmacy queue
    } else if (context.emergencyVisitId) {
      const visit = await prisma.emergencyVisit.findUnique({
        where: { id: context.emergencyVisitId },
        select: { id: true, status: true },
      })
      if (!visit) return { success: false, message: "ER Visit not found" }

      await prisma.emergencyVisit.update({
        where: { id: context.emergencyVisitId },
        data: {
          finalDiagnosis: resolvedDiagnosis,
          proceduresDone: data.proceduresDone?.trim() || null,
          courseInHospital: data.courseInHospital?.trim() || null,
          treatmentGiven: data.treatmentGiven?.trim() || null,
          conditionAtDischarge: data.conditionAtDischarge?.trim() || null,
          adviceOnDischarge: data.adviceOnDischarge?.trim() || null,
          followUpDate,
        },
      })
      revalidatePath(`/dashboard/clinical/emergency/patient/${context.emergencyVisitId}`)
    }

    writeAuditLog({ userId: authResult.session.userId, action: "UPDATE", module: "DischargeSummary", recordId: context.admissionId || context.emergencyVisitId || "", changes: { diagnosis: resolvedDiagnosis } })

    return {
      success: true,
      message: "Discharge summary saved successfully",
      dischargeMedicines: savedMedicines,
    }
  } catch (error: any) {
    console.error("[ERROR] saveDischargeSummary:", error)
    return {
      success: false,
      message: error.message || "Failed to save discharge summary",
    }
  }
}

// ============================================
// GET DISCHARGE SUMMARY
// ============================================

/**
 * getDischargeSummary — Fetch the discharge summary for an admission
 * along with patient/doctor details needed for the print view.
 */
export async function getDischargeSummary(context: { admissionId?: string; emergencyVisitId?: string }) {
  await requireAuth()

  try {
    if (context.admissionId) {
      const admission = await prisma.iPDAdmission.findUnique({
        where: { id: context.admissionId },
        include: {
          patient: { include: { user: true } },
          primaryDoctor: { include: { user: true } },
          dischargeDoctor: { include: { user: true } },
          dischargeSignatory: { include: { user: true } },
          doctors: {
            include: {
              doctor: { include: { user: true } },
            },
          },
          bed: { include: { ward: true } },
          ipdPrescriptions: { where: { status: "ACTIVE" }, orderBy: { createdAt: "asc" } },
          ipdLabRequests: { where: { status: "COMPLETED" }, orderBy: { createdAt: "asc" } },
          dischargeMedicines: true,
        },
      })

      if (!admission) return { success: false, message: "Admission not found", data: null }

      const ipdSignatoryStaff = await prisma.staff.findMany({
        where: {
          isIpdSignatory: true,
          user: { isActive: true },
        },
        include: { user: true },
        orderBy: { user: { name: "asc" } },
      })

      const doctorMap = new Map<string, {
        id: string
        name: string
        department: string | null
        specialization: string | null
        signatureUrl: string | null
        isPrimary: boolean
        roleLabel: string
      }>()

      if (admission.primaryDoctor) {
        doctorMap.set(admission.primaryDoctor.id, {
          id: admission.primaryDoctor.id,
          name: admission.primaryDoctor.user.name || "Unknown Doctor",
          department: admission.primaryDoctor.department,
          specialization: admission.primaryDoctor.specialization,
          signatureUrl: admission.primaryDoctor.signatureUrl || admission.primaryDoctor.user.signatureUrl || null,
          isPrimary: true,
          roleLabel: "Primary Treating Doctor",
        })
      }

      for (const d of admission.doctors || []) {
        if (d.doctor && !doctorMap.has(d.doctor.id)) {
          doctorMap.set(d.doctor.id, {
            id: d.doctor.id,
            name: d.doctor.user.name || "Unknown Doctor",
            department: d.doctor.department,
            specialization: d.doctor.specialization,
            signatureUrl: d.doctor.signatureUrl || d.doctor.user.signatureUrl || null,
            isPrimary: false,
            roleLabel: d.role ? `${d.role.replace("_", " ")} Doctor` : "Assigned Doctor",
          })
        }
      }

      const assignedDoctors = Array.from(doctorMap.values())

      const ipdSignatories = ipdSignatoryStaff.map((s) => ({
        id: s.id,
        name: s.user.name || "Unknown Staff",
        department: s.department,
        designation: s.designation || s.user.role.replace("_", " "),
        signatureUrl: s.signatureUrl || s.user.signatureUrl || null,
        hasSignature: Boolean(s.signatureUrl || s.user.signatureUrl),
      }))

      const selectedDoctorId = admission.dischargeDoctorId || admission.primaryDoctorId
      const selectedDoctor = doctorMap.get(selectedDoctorId) || assignedDoctors[0] || null
      const selectedSignatoryId = admission.dischargeSignatoryId || (ipdSignatories.length > 0 ? ipdSignatories[0].id : null)
      const selectedSignatory = ipdSignatories.find((s) => s.id === selectedSignatoryId) || null

      const admissionDate = new Date(admission.admissionDate)
      const dischargeDate = admission.dischargeDate ? new Date(admission.dischargeDate) : new Date()
      const daysAdmitted = Math.max(1, Math.ceil((dischargeDate.getTime() - admissionDate.getTime()) / (1000 * 60 * 60 * 24)))

      let age: number | null = null
      if (admission.patient.dateOfBirth) {
        age = Math.floor((new Date().getTime() - new Date(admission.patient.dateOfBirth).getTime()) / (1000 * 60 * 60 * 24 * 365.25))
      }

      return {
        success: true,
        message: "Summary fetched",
        data: {
          admissionId: admission.id,
          status: admission.status,
          admissionDate: admission.admissionDate.toISOString(),
          dischargeDate: admission.dischargeDate?.toISOString() || null,
          daysAdmitted,
          reason: admission.reason,
          diagnosis: admission.diagnosis,
          finalDiagnosis: admission.finalDiagnosis,
          proceduresDone: admission.proceduresDone,
          courseInHospital: admission.courseInHospital,
          treatmentGiven: admission.treatmentGiven,
          conditionAtDischarge: admission.conditionAtDischarge,
          adviceOnDischarge: admission.adviceOnDischarge,
          followUpDate: admission.followUpDate?.toISOString() || null,
          patientName: admission.patient.user.name || "Unknown",
          patientId: admission.patient.patientId,
          age,
          gender: admission.patient.gender,
          bloodGroup: admission.patient.bloodGroup,
          phone: admission.patient.phone,
          address: [admission.patient.address, admission.patient.city, admission.patient.state, admission.patient.pincode].filter(Boolean).join(", "),
          doctorName: selectedDoctor ? selectedDoctor.name : (admission.primaryDoctor.user.name || "Unknown"),
          doctorDepartment: selectedDoctor ? selectedDoctor.department : admission.primaryDoctor.department,
          doctorSpecialization: selectedDoctor ? selectedDoctor.specialization : admission.primaryDoctor.specialization,
          doctorSignatureUrl: selectedDoctor ? selectedDoctor.signatureUrl : (admission.primaryDoctor.signatureUrl || admission.primaryDoctor.user.signatureUrl || null),
          dischargeDoctorId: selectedDoctorId,
          dischargeSignatoryId: selectedSignatoryId,
          signatoryName: selectedSignatory ? selectedSignatory.name : "Authorized Signatory",
          signatoryDesignation: selectedSignatory ? selectedSignatory.designation : "Authorized Signatory",
          signatoryDepartment: selectedSignatory ? selectedSignatory.department : null,
          signatorySignatureUrl: selectedSignatory ? selectedSignatory.signatureUrl : null,
          assignedDoctors,
          ipdSignatories,
          bedNumber: admission.bed.bedNumber,
          wardName: admission.bed.ward.name,
          activeMedications: admission.ipdPrescriptions.map((rx) => ({ name: rx.medicineName, dosage: rx.dosage, frequency: rx.frequency, duration: rx.duration, instruction: rx.instruction })),
          completedInvestigations: admission.ipdLabRequests.map((lr) => ({ testName: lr.testName, type: lr.type, result: lr.result, completedAt: lr.completedAt?.toISOString() || null })),
          dischargeMedicines: admission.dischargeMedicines,
        },
      }
    } else if (context.emergencyVisitId) {
      const visit = await prisma.emergencyVisit.findUnique({
        where: { id: context.emergencyVisitId },
        include: {
          patient: { include: { user: true } },
          assignedDoctor: { include: { user: true } },
          bed: { include: { ward: true } },
          ipdPrescriptions: { where: { status: "ACTIVE" }, orderBy: { createdAt: "asc" } },
          ipdLabRequests: { where: { status: "COMPLETED" }, orderBy: { createdAt: "asc" } },
        },
      })

      if (!visit) return { success: false, message: "ER Visit not found", data: null }

      const arrivalTime = new Date(visit.arrivalTime)
      const dischargeTime = visit.dischargeTime ? new Date(visit.dischargeTime) : new Date()
      const daysAdmitted = Math.max(1, Math.ceil((dischargeTime.getTime() - arrivalTime.getTime()) / (1000 * 60 * 60 * 24)))

      let age: number | null = null
      if (visit.patient?.dateOfBirth) {
        age = Math.floor((new Date().getTime() - new Date(visit.patient.dateOfBirth).getTime()) / (1000 * 60 * 60 * 24 * 365.25))
      }

      return {
        success: true,
        message: "Summary fetched",
        data: {
          emergencyVisitId: visit.id,
          status: visit.status,
          admissionDate: visit.arrivalTime.toISOString(),
          dischargeDate: visit.dischargeTime?.toISOString() || null,
          daysAdmitted,
          reason: visit.chiefComplaint,
          diagnosis: visit.triageLevel,
          finalDiagnosis: visit.finalDiagnosis,
          proceduresDone: visit.proceduresDone,
          courseInHospital: visit.courseInHospital,
          treatmentGiven: visit.treatmentGiven,
          conditionAtDischarge: visit.conditionAtDischarge,
          adviceOnDischarge: visit.adviceOnDischarge,
          followUpDate: visit.followUpDate?.toISOString() || null,
          patientName: visit.patient?.user.name || "Unknown",
          patientId: visit.patient?.patientId,
          age,
          gender: visit.patient?.gender,
          bloodGroup: visit.patient?.bloodGroup,
          phone: visit.patient?.phone,
          address: [visit.patient?.address, visit.patient?.city, visit.patient?.state, visit.patient?.pincode].filter(Boolean).join(", "),
          doctorName: visit.assignedDoctor?.user.name || "Unknown",
          doctorDepartment: visit.assignedDoctor?.department,
          doctorSpecialization: visit.assignedDoctor?.specialization,
          bedNumber: visit.bed?.bedNumber,
          wardName: visit.bed?.ward.name,
          activeMedications: visit.ipdPrescriptions.map((rx) => ({ name: rx.medicineName, dosage: rx.dosage, frequency: rx.frequency, duration: rx.duration, instruction: rx.instruction })),
          completedInvestigations: visit.ipdLabRequests.map((lr) => ({ testName: lr.testName, type: lr.type, result: lr.result, completedAt: lr.completedAt?.toISOString() || null })),
        },
      }
    }
    
    return { success: false, message: "Invalid context", data: null }
  } catch (error: any) {
    console.error("[ERROR] getDischargeSummary:", error)
    return { success: false, message: error.message || "Failed to fetch discharge summary", data: null }
  }
}

// ============================================
// UPDATE DISCHARGE SIGNATURES
// ============================================

export async function updateDischargeSignatures(
  admissionId: string,
  data: { dischargeDoctorId?: string | null; dischargeSignatoryId?: string | null }
) {
  const authResult = await requireAuthSafe(["SUPER_ADMIN", "DOCTOR", "NURSE", "ADMIN"])
  if (!authResult.ok) return { success: false, message: authResult.error }

  try {
    const admission = await prisma.iPDAdmission.findUnique({
      where: { id: admissionId },
      select: { id: true },
    })

    if (!admission) {
      return { success: false, message: "Admission not found" }
    }

    await prisma.iPDAdmission.update({
      where: { id: admissionId },
      data: {
        ...(data.dischargeDoctorId !== undefined ? { dischargeDoctorId: data.dischargeDoctorId || null } : {}),
        ...(data.dischargeSignatoryId !== undefined ? { dischargeSignatoryId: data.dischargeSignatoryId || null } : {}),
      },
    })

    revalidatePath(`/dashboard/ipd/print/summary/${admissionId}`)
    revalidatePath(`/dashboard/ipd/patient/${admissionId}`)

    return { success: true, message: "Discharge signatures updated successfully" }
  } catch (error: any) {
    console.error("[ERROR] updateDischargeSignatures:", error)
    return { success: false, message: error.message || "Failed to update discharge signatures" }
  }
}

