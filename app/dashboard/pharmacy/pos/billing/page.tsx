import { Suspense } from "react"
import { PharmacyPOSClient } from "@/components/pharmacy-pos-client"
import { prisma } from "@/lib/prisma"
import { getHospitalSettings } from "@/app/actions/settings"
import { getTemplateSettings } from "@/app/actions/print-template-settings"

export default async function PharmacyPOSPage() {
  // Fetch all medicines with their active batches
  const medicines = await prisma.medicine.findMany({
    where: {
      isActive: true,
    },
    include: {
      inventoryBatches: {
        where: {
          quantity: {
            gt: 0, // Only show batches with stock
          },
          expiryDate: {
            gte: new Date(), // Not expired
          },
          isActive: true,
        },
        orderBy: {
          expiryDate: "asc", // FIFO - First Expiry First Out
        },
      },
    },
    orderBy: {
      name: "asc",
    },
  })

  // Fetch recent patients for quick selection (optional)
  const rawPatients = await prisma.patient.findMany({
    where: { patientId: { not: "PAT-WALKIN" } },
    include: {
      user: {
        select: {
          name: true,
          email: true,
          phone: true,
        },
      },
    },
    orderBy: {
      createdAt: "desc",
    },
    take: 50,
  })

  // Transform patients: flatten user.name → name for the POS component
  const recentPatients = rawPatients.map((p) => ({
    id: p.id,
    patientId: p.patientId,
    name: p.user.name || "Unknown",
    phone: p.phone || (p.user as any).phone || null,
    email: p.user.email || null,
  }))

  const [hospitalSettings, templateSettings] = await Promise.all([
    getHospitalSettings(),
    getTemplateSettings("MEDICINE_BILL")
  ])

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Pharmacy POS</h1>
        <p className="text-gray-500 mt-1">Point of Sale - Billing & Inventory Management</p>
      </div>

      <Suspense fallback={<div>Loading POS...</div>}>
        <PharmacyPOSClient 
          medicines={medicines} 
          recentPatients={recentPatients}
          hospitalSettings={hospitalSettings}
          printSettings={templateSettings}
        />
      </Suspense>
    </div>
  )
}
