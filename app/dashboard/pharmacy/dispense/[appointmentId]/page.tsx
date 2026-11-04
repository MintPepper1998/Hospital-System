import { Suspense } from "react"
import { notFound } from "next/navigation"
import { PharmacyPOSClient } from "@/components/pharmacy-pos-client"
import { prisma } from "@/lib/prisma"
import { getHospitalSettings } from "@/app/actions/settings"
import { getTemplateSettings } from "@/app/actions/print-template-settings"

interface DispensePageProps {
  params: Promise<{
    appointmentId: string
  }>
}

export default async function DispensePage({ params }: DispensePageProps) {
  const { appointmentId } = await params

  // Fetch the appointment with patient, doctor, and prescriptions
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
  })

  if (!appointment) {
    notFound()
  }

  // Fetch pending lab tests for this appointment (PENDING_PAYMENT status)
  const pendingLabTests = await prisma.labRequest.findMany({
    where: {
      appointmentId: appointmentId,
      status: "PENDING_PAYMENT",
    },
    orderBy: {
      createdAt: "asc",
    },
  })

  // Collect all prescribed medications
  const prescribedMedications = appointment.medicalRecords.flatMap((record) =>
    record.prescriptions.flatMap((prescription) => prescription.medications)
  )

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
    phone: p.phone || (p.user as any).phone || null,
    email: p.user.email || null,
  }))

  // Match prescribed medicines with inventory and build initial cart
  const initialCartItems: Array<{
    batchId: string
    medicineId: string
    medicineName: string
    batchNumber: string
    expiryDate: string
    availableStock: number
    unitPrice: number
    quantity: number
    taxRate: number
    subtotal: number
    taxAmount: number
    discountPercent: number
    discountAmount: number
    total: number
  }> = []

  for (const prescribed of prescribedMedications) {
    // Try to find a matching medicine in inventory by name (case-insensitive)
    const matchingMedicine = medicines.find(
      (med) =>
        med.name.toLowerCase().includes(prescribed.medicationName.toLowerCase()) ||
        prescribed.medicationName.toLowerCase().includes(med.name.toLowerCase()) ||
        med.genericName?.toLowerCase().includes(prescribed.medicationName.toLowerCase())
    )

    if (matchingMedicine && matchingMedicine.inventoryBatches.length > 0) {
      // Use the first available batch (FIFO by expiry)
      const batch = matchingMedicine.inventoryBatches[0]
      const quantity = Math.min(prescribed.quantity || 1, batch.quantity)
      const unitPrice = batch.sellingPrice
      const taxRate = 12 // Default GST
      const amount = unitPrice * quantity
      const discountPercent = 0
      const discountAmount = 0
      const total = amount - discountAmount
      const taxableAmount = total / (1 + (taxRate / 100))
      const taxAmount = total - taxableAmount
      const subtotal = amount

      // Avoid duplicates
      const existingIndex = initialCartItems.findIndex((item) => item.batchId === batch.id)
      if (existingIndex === -1) {
        initialCartItems.push({
          batchId: batch.id,
          medicineId: matchingMedicine.id,
          medicineName: `${matchingMedicine.name}${matchingMedicine.strength ? ` - ${matchingMedicine.strength}` : ""}`,
          batchNumber: batch.batchNumber,
          expiryDate: batch.expiryDate.toISOString(),
          availableStock: batch.quantity,
          unitPrice,
          quantity,
          taxRate,
          subtotal,
          discountPercent,
          discountAmount,
          taxAmount,
          total,
        })
      }
    }
  }

  // Initial data for the POS
  const initialData = {
    patientId: appointment.patient.id,
    patientName: appointment.patient.user.name || "Unknown",
    patientCode: appointment.patient.patientId,
    doctorName: appointment.doctor.user.name || "Unknown",
    appointmentId: appointment.id,
    cartItems: initialCartItems,
    // Include all prescribed medicines for reference (even if not matched)
    prescribedMedicines: prescribedMedications.map((med) => ({
      name: med.medicationName,
      dosage: med.dosage,
      frequency: med.frequency,
      duration: med.duration,
      quantity: med.quantity,
      instructions: med.instructions,
    })),
    // Include pending lab tests
    pendingLabTests: pendingLabTests.map((test) => ({
      id: test.id,
      testName: test.testName,
      testPrice: test.testPrice,
      priority: test.priority,
    })),
  }

  const [hospitalSettings, templateSettings] = await Promise.all([
    getHospitalSettings(),
    getTemplateSettings("MEDICINE_BILL")
  ])

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Dispense Prescription</h1>
        <p className="text-gray-500 mt-1">
          Patient: <span className="font-semibold text-[#0066CC]">{appointment.patient.user.name}</span>
          {" | "}
          Doctor: Dr. {appointment.doctor.user.name}
        </p>
      </div>

      {/* Prescription Reference Card */}
      {prescribedMedications.length > 0 && (
        <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
          <h3 className="font-semibold text-yellow-800 mb-2">Prescribed Medicines</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
            {prescribedMedications.map((med, idx) => (
              <div key={idx} className="text-sm bg-white p-2 rounded border">
                <p className="font-medium">{med.medicationName}</p>
                <p className="text-xs text-gray-500">
                  {med.dosage} | {med.frequency} | {med.duration}
                </p>
                <p className="text-xs text-gray-500">Qty: {med.quantity}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Pending Lab Tests Card */}
      {pendingLabTests.length > 0 && (
        <div className="mb-6 p-4 bg-purple-50 border border-purple-200 rounded-lg">
          <h3 className="font-semibold text-purple-800 mb-2">
            🧪 Pending Lab Tests ({pendingLabTests.length})
          </h3>
          <p className="text-xs text-purple-600 mb-2">
            These tests will be added to the invoice. Patient must pay before sample collection.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
            {pendingLabTests.map((test) => (
              <div key={test.id} className="text-sm bg-white p-2 rounded border flex justify-between items-center">
                <div>
                  <p className="font-medium">{test.testName}</p>
                  <p className="text-xs text-gray-500">{test.priority}</p>
                </div>
                <p className="font-semibold text-green-600">₹{test.testPrice}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      <Suspense fallback={<div>Loading POS...</div>}>
        <PharmacyPOSClient
          medicines={medicines}
          recentPatients={formattedPatients}
          initialData={initialData}
          hospitalSettings={hospitalSettings}
          printSettings={templateSettings}
        />
      </Suspense>
    </div>
  )
}
