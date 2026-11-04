"use server"

import { prisma } from "@/lib/prisma"
import { requireAuthSafe } from "@/lib/auth-guard"
import { calculateFinalBill } from "@/app/actions/billing"

// ============================================
// GET PAST ADMISSIONS (Listing)
// ============================================

export async function getPastAdmissions(search?: string, page = 1, pageSize = 20) {
  const authResult = await requireAuthSafe(["SUPER_ADMIN", "DOCTOR", "NURSE", "RECEPTIONIST", "ACCOUNTANT"])
  if (!authResult.ok) return { success: false, message: authResult.error, data: null }

  try {
    const where: any = {
      status: "DISCHARGED",
    }

    if (search && search.trim()) {
      const q = search.trim()
      where.OR = [
        { patient: { user: { name: { contains: q, mode: "insensitive" } } } },
        { patient: { patientId: { contains: q, mode: "insensitive" } } },
        { patient: { phone: { contains: q, mode: "insensitive" } } },
        { patient: { aadharNumber: { contains: q, mode: "insensitive" } } },
        { ipNumber: { contains: q, mode: "insensitive" } },
        { finalDiagnosis: { contains: q, mode: "insensitive" } },
      ]
    }

    const [admissions, total] = await Promise.all([
      prisma.iPDAdmission.findMany({
        where,
        include: {
          patient: { include: { user: true } },
          primaryDoctor: { include: { user: true } },
          bed: { include: { ward: true } },
          discharge: true,
        },
        orderBy: { dischargeDate: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.iPDAdmission.count({ where }),
    ])

    const serialized = admissions.map((adm) => {
      const admDate = new Date(adm.admissionDate)
      const disDate = adm.dischargeDate ? new Date(adm.dischargeDate) : null
      const days = disDate
        ? Math.max(1, Math.ceil((disDate.getTime() - admDate.getTime()) / (1000 * 60 * 60 * 24)))
        : 0

      return {
        id: adm.id,
        ipNumber: adm.ipNumber,
        patientName: adm.patient.user.name || "Unknown",
        patientId: adm.patient.patientId,
        gender: adm.patient.gender,
        phone: adm.patient.phone,
        admissionDate: adm.admissionDate.toISOString(),
        dischargeDate: adm.dischargeDate?.toISOString() || null,
        dischargeType: adm.discharge?.type || adm.dischargeType || null,
        daysAdmitted: days,
        wardName: adm.bed.ward.name,
        bedNumber: adm.bed.bedNumber,
        doctorName: adm.primaryDoctor.user.name || "Unknown",
        diagnosis: adm.finalDiagnosis || adm.diagnosis || null,
        totalBillAmount: adm.totalBillAmount,
        amountPaid: adm.amountPaid,
        balanceDue: adm.balanceDue,
        reason: adm.reason,
      }
    })

    return {
      success: true,
      data: {
        admissions: serialized,
        total,
        page,
        pageSize,
        totalPages: Math.ceil(total / pageSize),
      },
    }
  } catch (error: any) {
    console.error("[ERROR] getPastAdmissions:", error)
    return { success: false, message: error.message, data: null }
  }
}

// ============================================
// GET FULL ADMISSION HISTORY (Detail)
// ============================================

export async function getFullAdmissionHistory(admissionId: string) {
  const authResult = await requireAuthSafe(["SUPER_ADMIN", "DOCTOR", "NURSE", "RECEPTIONIST", "ACCOUNTANT"])
  if (!authResult.ok) return { success: false, message: authResult.error, data: null }

  try {
    const admission = await prisma.iPDAdmission.findUnique({
      where: { id: admissionId },
      include: {
        patient: {
          include: {
            user: true,
            documents: { orderBy: { uploadedAt: "desc" } },
            insurancePolicies: { where: { isActive: true } },
          },
        },
        primaryDoctor: { include: { user: true } },
        bed: { include: { ward: true } },
        clinicalNotes: { orderBy: { date: "desc" } },
        ipdPrescriptions: { orderBy: { createdAt: "desc" } },
        ipdLabRequests: { orderBy: { createdAt: "desc" } },
        vitals: {
          orderBy: { recordedAt: "desc" },
          include: { recordedBy: { include: { user: true } } },
        },
        discharge: true,
        dischargeMedicines: { orderBy: { createdAt: "asc" } },
        canteenDiets: {
          orderBy: { createdAt: "desc" },
          include: { dietPlan: true },
        },
        canteenOrders: {
          orderBy: { createdAt: "desc" },
          include: { items: true, mealSlot: true },
        },
        equipmentUsages: { 
          orderBy: { startTime: "desc" },
          include: { equipment: true }
        },
        bedTransfers: {
          orderBy: { transferDate: "desc" },
          include: {
            fromBed: { include: { ward: true } },
            toBed: { include: { ward: true } },
          },
        },
        doctors: {
          orderBy: { assignedAt: "asc" },
          include: { doctor: { include: { user: true } } },
        },
        assignedNurses: {
          include: { nurse: { include: { user: true } } },
        },
        timelineEvents: { orderBy: { timestamp: "desc" } },
        billings: { orderBy: { billDate: "desc" } },
      },
    })

    if (!admission) return { success: false, message: "Admission not found", data: null }

    // Fetch surgeries for this patient during the admission period
    const surgeries = await prisma.surgery.findMany({
      where: {
        patientId: admission.patientId,
        scheduledDate: {
          gte: admission.admissionDate,
          ...(admission.dischargeDate ? { lte: admission.dischargeDate } : {}),
        },
      },
      include: {
        leadSurgeon: { include: { user: true } },
        theater: true,
      },
      orderBy: { scheduledDate: "desc" },
    })

    // Calculate billing summary
    const billResult = await calculateFinalBill(admissionId)

    // Serialize dates
    const admDate = new Date(admission.admissionDate)
    const disDate = admission.dischargeDate ? new Date(admission.dischargeDate) : null
    const daysAdmitted = disDate
      ? Math.max(1, Math.ceil((disDate.getTime() - admDate.getTime()) / (1000 * 60 * 60 * 24)))
      : 0

    return {
      success: true,
      data: {
        id: admission.id,
        ipNumber: admission.ipNumber,
        status: admission.status,
        admissionDate: admission.admissionDate.toISOString(),
        dischargeDate: admission.dischargeDate?.toISOString() || null,
        daysAdmitted,
        reason: admission.reason,
        diagnosis: admission.diagnosis,
        treatmentPlan: admission.treatmentPlan,
        finalDiagnosis: admission.finalDiagnosis,
        proceduresDone: admission.proceduresDone,
        courseInHospital: admission.courseInHospital,
        treatmentGiven: admission.treatmentGiven,
        conditionAtDischarge: admission.conditionAtDischarge,
        adviceOnDischarge: admission.adviceOnDischarge,
        followUpDate: admission.followUpDate?.toISOString() || null,
        dischargeNotes: admission.dischargeNotes,
        dischargeSummary: admission.dischargeSummary,
        dischargeType: admission.discharge?.type || admission.dischargeType || null,
        isBskyAdmission: admission.isBskyAdmission,

        // Financial
        totalBillAmount: admission.totalBillAmount,
        amountPaid: admission.amountPaid,
        balanceDue: admission.balanceDue,
        discountAmount: admission.discountAmount,
        discountPercent: admission.discountPercent,
        discountType: admission.discountType,
        discountReason: admission.discountReason,

        // Patient
        patient: {
          name: admission.patient.user.name || "Unknown",
          patientId: admission.patient.patientId,
          gender: admission.patient.gender,
          dateOfBirth: admission.patient.dateOfBirth?.toISOString() || null,
          bloodGroup: admission.patient.bloodGroup,
          phone: admission.patient.phone,
          email: admission.patient.user.email,
          address: admission.patient.address,
          city: admission.patient.city,
          state: admission.patient.state,
          pincode: admission.patient.pincode,
          aadharNumber: admission.patient.aadharNumber,
          isBsky: admission.patient.isBsky,
          bskyNumber: admission.patient.bskyNumber,
          emergencyContact: admission.patient.emergencyContact,
          emergencyContactName: admission.patient.emergencyContactName,
          allergies: admission.patient.allergies,
          medicalHistory: admission.patient.medicalHistory,
          fatherOrHusbandName: admission.patient.fatherOrHusbandName,
        },

        // Ward & Bed
        ward: admission.bed.ward.name,
        wardType: admission.bed.ward.type,
        bedNumber: admission.bed.bedNumber,
        bedRatePerDay: admission.bed.pricePerDay,

        // Primary Doctor
        primaryDoctor: {
          name: admission.primaryDoctor.user.name || "Unknown",
          department: admission.primaryDoctor.department,
        },

        // Assigned Doctors
        doctors: admission.doctors.map((d) => ({
          name: d.doctor.user.name || "Unknown",
          department: d.doctor.department,
          assignedAt: d.assignedAt.toISOString(),
          role: d.role,
        })),

        // Assigned Nurses
        nurses: admission.assignedNurses.map((n) => ({
          name: n.nurse.user.name || "Unknown",
          shift: n.shift,
          cost: n.cost,
          assignedAt: n.assignedAt.toISOString(),
        })),

        // Clinical Notes
        clinicalNotes: admission.clinicalNotes.map((n) => ({
          id: n.id,
          date: n.date.toISOString(),
          authorName: n.authorName,
          note: n.note,
          medications: n.medications,
          labTests: n.labTests,
          bp: n.bp,
          pulse: n.pulse,
          temperature: n.temperature,
          spO2: n.spO2,
          respiratoryRate: n.respiratoryRate,
        })),

        // Vitals
        vitals: admission.vitals.map((v) => ({
          id: v.id,
          recordedAt: v.recordedAt.toISOString(),
          recordedBy: v.recordedBy?.user?.name || "Unknown",
          bp: v.bp,
          pulse: v.pulse,
          temperature: v.temperature,
          spO2: v.spO2,
          respiratoryRate: v.respiratoryRate,
          weight: v.weight,
          bloodSugar: v.bloodSugar,
          notes: v.notes,
        })),

        // Medications
        medications: admission.ipdPrescriptions.map((rx) => ({
          id: rx.id,
          medicineName: rx.medicineName,
          dosage: rx.dosage,
          frequency: rx.frequency,
          duration: rx.duration,
          instruction: rx.instruction,
          status: rx.status,
          pharmacyStatus: rx.pharmacyStatus,
          prescribedByName: rx.prescribedByName,
          dispensedQuantity: rx.dispensedQuantity,
          unitPrice: rx.unitPrice,
          totalPrice: rx.totalPrice,
          createdAt: rx.createdAt.toISOString(),
        })),

        // Discharge Medicines
        dischargeMedicines: admission.dischargeMedicines.map((dm) => ({
          id: dm.id,
          medicineName: dm.medicineName,
          dosage: dm.dosage,
          frequency: dm.frequency,
          duration: dm.duration,
          quantity: dm.quantity,
          instruction: dm.instruction,
          pharmacyStatus: dm.pharmacyStatus,
        })),

        // Lab Reports
        labReports: admission.ipdLabRequests.map((lr) => ({
          id: lr.id,
          testName: lr.testName,
          type: lr.type,
          status: lr.status,
          isUrgent: lr.isUrgent,
          result: lr.result,
          parameterResults: lr.parameterResults,
          orderedByName: lr.orderedByName,
          completedAt: lr.completedAt?.toISOString() || null,
          createdAt: lr.createdAt.toISOString(),
        })),

        // Surgeries
        surgeries: surgeries.map((s) => ({
          id: s.id,
          procedureName: s.procedureName,
          category: s.category,
          status: s.status,
          scheduledDate: s.scheduledDate.toISOString(),
          durationMinutes: s.durationMinutes,
          surgeonName: s.leadSurgeon.user.name || "Unknown",
          theaterName: s.theater.name,
          surgeryCharge: s.surgeryCharge,
          diagnosis: s.diagnosis,
          findings: s.findings,
        })),

        // Equipment
        equipment: admission.equipmentUsages.map((e) => ({
          id: e.id,
          equipmentName: e.equipment?.name || "Equipment",
          startDate: e.startTime.toISOString(),
          endDate: e.endTime?.toISOString() || null,
          dailyRate: e.ratePerUnit,
          totalCharge: e.computedCharge,
          notes: e.notes,
        })),

        // Diet
        diets: admission.canteenDiets.map((d) => ({
          id: d.id,
          dietPlanName: d.dietPlan?.name || "Custom",
          startDate: d.startDate.toISOString(),
          endDate: d.endDate?.toISOString() || null,
          instructions: d.dietPlan?.description || null,
        })),

        // Meals
        meals: admission.canteenOrders.map((o) => ({
          id: o.id,
          orderNumber: o.orderNumber,
          mealSlot: o.mealSlot?.name || "Unknown",
          status: o.status,
          totalAmount: o.totalAmount,
          items: o.items.map((i) => ({ name: i.itemName, qty: i.quantity, price: i.unitPrice })),
          createdAt: o.createdAt.toISOString(),
        })),

        // Bed Transfers
        bedTransfers: admission.bedTransfers.map((t) => ({
          id: t.id,
          fromBed: `${t.fromBed.ward.name} - ${t.fromBed.bedNumber}`,
          toBed: `${t.toBed.ward.name} - ${t.toBed.bedNumber}`,
          reason: t.reason,
          transferDate: t.transferDate.toISOString(),
        })),

        // Timeline
        timeline: admission.timelineEvents.map((e) => ({
          id: e.id,
          type: e.type,
          title: e.title,
          description: e.description,
          timestamp: e.timestamp.toISOString(),
        })),

        // Documents
        documents: admission.patient.documents.map((d) => ({
          id: d.id,
          title: d.title,
          fileUrl: d.fileUrl,
          fileType: d.fileType,
          uploadedAt: d.uploadedAt.toISOString(),
        })),

        // Billing summary
        billing: billResult.success ? billResult.data : null,
      },
    }
  } catch (error: any) {
    console.error("[ERROR] getFullAdmissionHistory:", error)
    return { success: false, message: error.message, data: null }
  }
}
