import { Suspense } from "react"
import { notFound } from "next/navigation"
import { PharmacyPOSClient } from "@/components/pharmacy-pos-client"
import { prisma } from "@/lib/prisma"
import { getHospitalSettings } from "@/app/actions/settings"
import { getTemplateSettings } from "@/app/actions/print-template-settings"

interface DispenseOTPageProps {
  params: Promise<{
    surgeryId: string
  }>
}

export default async function DispenseOTPage({ params }: DispenseOTPageProps) {
  const { surgeryId } = await params

  // Fetch the surgery with patient, lead surgeon
  const surgery = await prisma.surgery.findUnique({
    where: { id: surgeryId },
    include: {
      patient: {
        include: {
          user: true,
        },
      },
      leadSurgeon: {
        include: {
          user: true,
        },
      },
    },
  })

  if (!surgery) {
    notFound()
  }

  // Fetch all medicines with inventory for the POS
  const medicines = await prisma.medicine.findMany({
    where: {
      isActive: true,
    },
    include: {
      inventoryBatches: {
        where: {
          quantity: { gt: 0 },
          expiryDate: { gte: new Date() },
          isActive: true,
        },
        orderBy: {
          expiryDate: "asc", // FIFO
        },
      },
    },
    orderBy: {
      name: "asc",
    },
  })

  // Fetch recent patients for dropdown
  const recentPatients = await prisma.patient.findMany({
    where: { patientId: { not: "PAT-WALKIN" } },
    include: {
      user: true,
    },
    orderBy: {
      createdAt: "desc",
    },
    take: 50,
  })

  // Transform patients for the POS component
  const formattedPatients = recentPatients.map((p) => ({
    id: p.id,
    patientId: p.patientId,
    name: p.user.name || "Unknown",
    phone: p.phone || "",
    email: p.user.email || null,
    gender: p.gender || undefined,
    dateOfBirth: p.dateOfBirth || undefined,
  }))

  const [hospitalSettings, printSettings] = await Promise.all([
    getHospitalSettings(),
    getTemplateSettings("PHARMACY_BILL"),
  ])

  // Extract medicines from consumables.otPharmacy
  const consumables: any = surgery.consumables || {}
  const otPharmacyMeds: any[] = consumables.otPharmacy || []

  // Create initial cart items based on the OT medicines and available inventory
  const initialCartItems = []

  for (const rx of otPharmacyMeds) {
    // Find matching medicine
    const medicine = medicines.find(
      (m) =>
        m.name.toLowerCase() === rx.medicineName.toLowerCase() ||
        (rx.medicineId && m.id === rx.medicineId)
    )

    if (medicine && medicine.inventoryBatches.length > 0) {
      const batch = medicine.inventoryBatches[0] // Pick oldest valid batch
      const qty = rx.quantity || 1
      const taxRate = batch.taxPercent || 0
      const unitPrice = batch.sellingPrice || 0
      const subtotal = qty * unitPrice
      const taxAmount = (subtotal * taxRate) / 100

      initialCartItems.push({
        batchId: batch.id,
        medicineId: medicine.id,
        medicineName: medicine.name,
        batchNumber: batch.batchNumber,
        expiryDate: batch.expiryDate.toISOString(),
        availableStock: batch.quantity,
        unitPrice: unitPrice,
        quantity: qty,
        taxRate: taxRate,
        subtotal: subtotal,
        taxAmount: taxAmount,
        discountPercent: 0,
        discountAmount: 0,
        total: subtotal + taxAmount,
      })
    }
  }

  // Determine source route to go back
  const sourceRoute = "/dashboard/pharmacy/pos"

  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <div className="flex items-center justify-between space-y-2">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-[#0066CC]">Pharmacy POS</h2>
          <p className="text-muted-foreground mt-1">
            Dispense medicines for OT Surgery: {surgery.procedureName}
          </p>
        </div>
      </div>
      
      <div className="mt-4 mb-4 p-4 bg-orange-50 border border-orange-200 rounded-lg text-sm text-orange-800">
        <div className="font-semibold mb-1">OT Surgery Information:</div>
        <div className="grid grid-cols-2 gap-2 mt-2">
          <div><span className="opacity-75">Patient:</span> {surgery.patient.user.name} ({surgery.patient.patientId})</div>
          <div><span className="opacity-75">Surgeon:</span> Dr. {surgery.leadSurgeon.user.name}</div>
          <div><span className="opacity-75">Procedure:</span> {surgery.procedureName}</div>
          <div><span className="opacity-75">Date:</span> {new Date(surgery.scheduledDate).toLocaleDateString()}</div>
        </div>
      </div>

      <div className="mt-2">
        <Suspense fallback={<div>Loading POS system...</div>}>
          <PharmacyPOSClient
            medicines={medicines.map((m) => ({
              id: m.id,
              name: m.name,
              manufacturer: m.manufacturer,
              genericName: m.genericName,
              strength: m.strength,
              type: m.type,
              unitPrice: m.unitPrice,
              inventoryBatches: m.inventoryBatches.map((b) => ({
                id: b.id,
                batchNumber: b.batchNumber,
                sellingPrice: b.sellingPrice,
                purchasePrice: b.purchasePrice,
                taxPercent: b.taxPercent,
                expiryDate: b.expiryDate,
                quantity: b.quantity,
                medicinesPerStrip: b.medicinesPerStrip,
              })),
            }))}
            recentPatients={formattedPatients}
            initialData={{
              patientId: surgery.patientId,
              patientName: surgery.patient.user.name || "Unknown",
              cartItems: initialCartItems,
              pendingLabTests: [],
            }}
            hospitalSettings={hospitalSettings as any}
            printSettings={printSettings as any}
          />
        </Suspense>
      </div>
    </div>
  )
}
