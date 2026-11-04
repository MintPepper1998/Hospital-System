import { format } from "date-fns"
import { prisma } from "@/lib/prisma"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { PharmacyQueueClient } from "@/components/pharmacy/pharmacy-queue-client"

export default async function PharmacyQueuePage() {
  const startOfDay = new Date()
  startOfDay.setHours(0, 0, 0, 0)

  // ==========================================
  // 1. Fetch OPD appointments with prescriptions (existing logic)
  // ==========================================
  const appointments = await prisma.appointment.findMany({
    where: {
      status: { in: ["COMPLETED", "IN_PROGRESS"] },
      appointmentDate: { gte: startOfDay },
      medicalRecords: {
        some: {
          prescriptions: {
            some: {
              medications: {
                some: {},
              },
            },
          },
        },
      },
    },
    include: {
      patient: { include: { user: true } },
      doctor: { include: { user: true } },
      medicalRecords: {
        include: {
          prescriptions: {
            include: {
              medications: true,
            },
          },
        },
      },
    },
    orderBy: [
      { appointmentDate: "asc" },
      { appointmentTime: "asc" },
    ],
  })

  const opdRows = appointments.map((appointment, index) => {
    const medicineCount = appointment.medicalRecords.reduce((recordTotal, record) => {
      const recordCount = record.prescriptions.reduce(
        (prescriptionTotal, prescription) => prescriptionTotal + prescription.medications.length,
        0
      )
      return recordTotal + recordCount
    }, 0)

    return {
      id: appointment.id,
      queueType: "OPD" as const,
      patientName: appointment.patient.user.name || "Unknown",
      doctorName: appointment.doctor.user.name || "Unknown",
      tokenOrBed: `#${index + 1}`,
      medicineCount,
      medicines: appointment.medicalRecords.flatMap((r) =>
        r.prescriptions.flatMap((p) =>
          p.medications.map((m) => `${m.medicationName} ${m.dosage}`)
        )
      ),
      opdPrescriptionItems: appointment.medicalRecords.flatMap((r) =>
        r.prescriptions.flatMap((p) => p.medications)
      ),
      createdAt: appointment.appointmentDate.toISOString(),
    }
  })

  // ==========================================
  // 2. Fetch IPD prescriptions pending pharmacy dispense.
  // Clinical status is independent; only ACTIVE meds should appear here.
  // ==========================================
  const ipdPrescriptions = await prisma.iPDPrescription.findMany({
    where: {
      status: "ACTIVE",
      pharmacyStatus: "PENDING",
      createdAt: {
        lte: new Date(new Date().setHours(23, 59, 59, 999))
      }
    },
    include: {
      admission: {
        include: {
          patient: {
            include: { user: true },
          },
          primaryDoctor: {
            include: { user: true },
          },
          bed: {
            include: { ward: true },
          },
        },
      },
      emergencyVisit: {
        include: {
          patient: {
            include: { user: true },
          },
          assignedDoctor: {
            include: { user: true },
          },
          bed: {
            include: { ward: true },
          },
        },
      },
    },
    orderBy: { createdAt: "desc" },
  })

  // Group IPD and ER prescriptions by their respective visits for a cleaner queue
  const ipdByAdmission = new Map<
    string,
    {
      admissionId?: string
      emergencyVisitId?: string
      patientName: string
      doctorName: string
      bedInfo: string
      isEmergency: boolean
      prescriptions: typeof ipdPrescriptions
    }
  >()

  for (const rx of ipdPrescriptions) {
    const key = rx.admissionId || rx.emergencyVisitId || rx.id
    if (!ipdByAdmission.has(key)) {
      const isEmergency = !!rx.emergencyVisitId
      
      let patientName = "Unknown"
      let doctorName = "Unknown"
      let bedInfo = ""

      if (rx.admission) {
        patientName = rx.admission.patient.user.name || "Unknown"
        doctorName = rx.admission.primaryDoctor.user.name || "Unknown"
        bedInfo = rx.admission.bed ? `${rx.admission.bed.ward.name} - ${rx.admission.bed.bedNumber}` : ""
      } else if (rx.emergencyVisit) {
        patientName = rx.emergencyVisit.patient?.user.name || "Unknown"
        doctorName = rx.emergencyVisit.assignedDoctor?.user.name || "Unknown"
        bedInfo = rx.emergencyVisit.bed ? `${rx.emergencyVisit.bed.ward.name} - ${rx.emergencyVisit.bed.bedNumber}` : "ER"
      }

      ipdByAdmission.set(key, {
        admissionId: rx.admissionId || undefined,
        emergencyVisitId: rx.emergencyVisitId || undefined,
        patientName,
        doctorName,
        bedInfo,
        isEmergency,
        prescriptions: [],
      })
    }
    ipdByAdmission.get(key)!.prescriptions.push(rx)
  }

  // Look up medicine prices for IPD prescriptions
  const allMedicineNames = [...new Set(ipdPrescriptions.map(rx => rx.medicineName))]
  const medicineRecords = await prisma.medicine.findMany({
    where: { name: { in: allMedicineNames, mode: "insensitive" } },
    select: { name: true, unitPrice: true },
  })
  const priceMap = new Map(medicineRecords.map(m => [m.name.toLowerCase(), m.unitPrice]))

  // Helper: parse frequency to daily dose
  function parseDailyDose(frequency: string): number {
    const f = frequency.trim().toUpperCase()
    if (f.includes("-")) return f.split("-").reduce((sum, n) => sum + (parseInt(n) || 0), 0)
    switch (f) {
      case "OD": return 1
      case "BD": return 2
      case "TDS": return 3
      case "QID": return 4
      default: return 1
    }
  }

  const ipdRows = Array.from(ipdByAdmission.values()).map((group) => ({
    id: group.admissionId || group.emergencyVisitId || "unknown",
    queueType: group.isEmergency ? ("EMERGENCY" as const) : ("IPD" as const),
    patientName: group.patientName,
    doctorName: group.doctorName,
    tokenOrBed: group.bedInfo,
    medicineCount: group.prescriptions.length,
    medicines: group.prescriptions.map((rx) => `${rx.medicineName} ${rx.dosage} (${rx.frequency})`),
    createdAt: group.prescriptions[0]?.createdAt.toISOString() || new Date().toISOString(),
    // IPD-specific: individual prescription IDs for dispensing with price and qty
    ipdPrescriptionIds: group.prescriptions.map((rx) => {
      const dailyDose = parseDailyDose(rx.frequency)
      const days = parseInt(rx.duration) || 1
      const calculatedQty = rx.requestedQuantity ?? (dailyDose * days || 1)
      const unitPrice = priceMap.get(rx.medicineName.toLowerCase()) || 0

      return {
        id: rx.id,
        medicineName: rx.medicineName,
        dosage: rx.dosage,
        frequency: rx.frequency,
        duration: rx.duration,
        instruction: rx.instruction,
        requestedQuantity: rx.requestedQuantity,
        status: rx.status,
        unitPrice,
        calculatedQty,
      }
    }),
  }))

  // ==========================================
  // 3. Merge into unified queue
  // ==========================================
  const allRows = [...opdRows.map((r) => ({ ...r, ipdPrescriptionIds: undefined })), ...ipdRows]

  const opdCount = opdRows.length
  const ipdCount = ipdRows.length

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-[#0066CC]">
            Pharmacy Queue
          </h2>
          <p className="text-muted-foreground mt-1">
            Pending prescriptions for {format(new Date(), "MMM dd, yyyy")}
          </p>
        </div>
        <div className="flex gap-2">
          <Badge variant="outline" className="text-blue-700 border-blue-200">
            {opdCount} OPD
          </Badge>
          <Badge variant="outline" className="text-purple-700 border-purple-200">
            {ipdCount} IPD
          </Badge>
          <Badge variant="outline" className="font-semibold">
            {allRows.length} total
          </Badge>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Prescriptions Awaiting Dispense</CardTitle>
        </CardHeader>
        <CardContent>
          {allRows.length === 0 ? (
            <div className="text-center py-10 text-muted-foreground">
              No pending prescriptions for today.
            </div>
          ) : (
            <PharmacyQueueClient rows={allRows} />
          )}
        </CardContent>
      </Card>
    </div>
  )
}
