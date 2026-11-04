import { prisma } from "@/lib/prisma"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ArrowLeft } from "lucide-react"
import Link from "next/link"
import { SmartBillingClient } from "@/components/billing/smart-billing-client"

export default async function SmartBillingPage() {
  // Fetch all patients for the search dropdown
  const patients = await prisma.patient.findMany({
    where: { patientId: { not: "PAT-WALKIN" } },
    include: {
      user: true,
    },
    orderBy: {
      createdAt: 'desc',
    },
    take: 100, // Recent 100 patients
  })

  // Fetch all active lab tests for manual entry
  const labTests = await prisma.labTestCatalog.findMany({
    where: { isActive: true },
    orderBy: [
      { category: 'asc' },
      { name: 'asc' }
    ]
  })

  // Fetch active medicines for manual entry
  const medicines = await prisma.medicine.findMany({
    where: { isActive: true },
    include: {
      inventoryBatches: {
        where: {
          quantity: { gt: 0 }, // Only batches with stock
          expiryDate: { gte: new Date() }, // Not expired
        },
        orderBy: {
          expiryDate: 'asc', // FEFO - First Expiry First Out
        },
      },
    },
    orderBy: {
      name: 'asc',
    },
    take: 200, // Limit for performance
  })

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/dashboard/finance/billing">
            <button className="flex items-center gap-2 px-4 py-2 text-sm border rounded-lg hover:bg-accent transition-colors">
              <ArrowLeft className="h-4 w-4" />
              Back to Billing
            </button>
          </Link>
          <div>
            <h2 className="text-3xl font-bold tracking-tight text-[#0066CC]">
              Create New Invoice
            </h2>
            <p className="text-muted-foreground mt-1">
              Smart billing with automatic pending order detection
            </p>
          </div>
        </div>
      </div>

      {/* Info Card */}
      <Card className="border-l-4 border-l-blue-500 bg-blue-50/50 dark:bg-blue-950/20">
        <CardContent className="pt-6">
          <div className="flex items-start gap-3">
            <div className="rounded-full bg-blue-100 dark:bg-blue-900 p-2">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-5 w-5 text-blue-600"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-blue-900 dark:text-blue-100">
                Smart Billing System
              </h3>
              <p className="mt-1 text-sm text-blue-800 dark:text-blue-200">
                When you select a patient, this system will automatically detect:
              </p>
              <ul className="mt-2 text-sm text-blue-800 dark:text-blue-200 list-disc list-inside space-y-1">
                <li><strong>Pending Lab Tests</strong> - Tests ordered by doctor but not yet paid</li>
                <li><strong>Unbilled Prescriptions</strong> - Today's OPD prescriptions awaiting billing</li>
              </ul>
              <p className="mt-2 text-sm text-blue-800 dark:text-blue-200">
                These will be auto-added to the invoice. You can also manually add tests or medicines for direct billing.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Smart Billing Client Component */}
      <SmartBillingClient
        patients={patients}
        labTests={labTests}
        medicines={medicines}
      />
    </div>
  )
}
