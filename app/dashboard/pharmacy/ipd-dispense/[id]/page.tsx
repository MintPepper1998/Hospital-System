import { prisma } from "@/lib/prisma"
import { notFound } from "next/navigation"
import IPDDispensePageClient from "./client"

export default async function IPDDispensePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params

  const ipdPrescriptions = await prisma.iPDPrescription.findMany({
    where: {
      OR: [
        { admissionId: id },
        { emergencyVisitId: id },
        { id: id }
      ],
      status: "ACTIVE"
    },
    include: {
      admission: {
        include: {
          patient: { include: { user: true } },
          primaryDoctor: { include: { user: true } },
          bed: { include: { ward: true } },
        },
      },
      emergencyVisit: {
        include: {
          patient: { include: { user: true } },
          assignedDoctor: { include: { user: true } },
          bed: { include: { ward: true } },
        },
      },
    },
    orderBy: { createdAt: "desc" },
  })

  if (!ipdPrescriptions.length) {
    notFound()
  }

  const patient = ipdPrescriptions[0].admission?.patient || ipdPrescriptions[0].emergencyVisit?.patient
  const patientName = patient?.user.name || "Unknown Patient"
  const bed = ipdPrescriptions[0].admission?.bed || ipdPrescriptions[0].emergencyVisit?.bed
  const bedInfo = bed ? `${bed.ward.name} - Bed ${bed.bedNumber}` : (ipdPrescriptions[0].emergencyVisitId ? "Emergency" : "Unknown")
  const admissionId = ipdPrescriptions[0].admissionId || undefined
  const emergencyVisitId = ipdPrescriptions[0].emergencyVisitId || undefined

  // Look up medicine prices
  const allMedNames = [...new Set(ipdPrescriptions.map((rx) => rx.medicineName))]
  const medRecords = await prisma.medicine.findMany({
    where: { name: { in: allMedNames, mode: "insensitive" } },
    select: { 
      name: true, 
      unitPrice: true,
      inventoryBatches: {
        select: { sellingPrice: true },
        orderBy: { createdAt: "desc" },
      },
    },
  })
  const medPriceMap = new Map(
    medRecords.map((m) => [
      m.name.toLowerCase(), 
      m.inventoryBatches[0]?.sellingPrice || m.unitPrice
    ])
  )

  function parseDailyDosePOS(frequency: string): number {
    const f = frequency.trim().toUpperCase()
    if (f.includes("-")) return f.split("-").reduce((sum, n) => sum + (parseInt(n) || 0), 0)
    switch (f) {
      case "OD": return 1
      case "BD": return 2
      case "TDS":
      case "TID": return 3
      case "QID": return 4
      case "SOS": return 1
      case "STAT": return 1
      default: return 1
    }
  }

  const prescriptions = ipdPrescriptions.map((rx) => {
    const dailyDose = parseDailyDosePOS(rx.frequency)
    const days = parseInt(rx.duration) || 1
    return {
      id: rx.id,
      medicineName: rx.medicineName,
      dosage: rx.dosage,
      frequency: rx.frequency,
      duration: rx.duration,
      instruction: rx.instruction,
      unitPrice: medPriceMap.get(rx.medicineName.toLowerCase()) || 0,
      quantity: rx.requestedQuantity ?? (dailyDose * days || 1),
      status: rx.pharmacyStatus || "PENDING",
    }
  })

  return (
    <div className="container mx-auto p-4 sm:p-6 lg:p-8 min-h-screen max-w-6xl">
      <IPDDispensePageClient
        admissionId={admissionId}
        emergencyVisitId={emergencyVisitId}
        patientName={patientName}
        bedInfo={bedInfo}
        prescriptions={prescriptions}
      />
    </div>
  )
}
