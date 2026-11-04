import { notFound } from "next/navigation"
import { prisma } from "@/lib/prisma"
import { format } from "date-fns"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  TableFooter,
} from "@/components/ui/table"
import { InvoiceActions } from "@/components/pharmacy/invoice-actions"
import { MedicineBillTemplate } from "@/components/pharmacy/medicine-bill-template"
import { getHospitalSettings } from "@/app/actions/settings"
import { getTemplateSettings } from "@/app/actions/print-template-settings"

interface InvoicePageProps {
  params: Promise<{
    invoiceId: string
  }>
}

export default async function InvoicePage({ params }: InvoicePageProps) {
  const { invoiceId } = await params

  const [billing, hospitalSettings, templateSettings] = await Promise.all([
    prisma.billing.findUnique({
      where: { id: invoiceId },
      include: {
        patient: {
          include: {
            user: true,
          },
        },
        pharmacyCustomer: true,
        items: true,
        appointment: {
          include: {
            doctor: {
              include: {
                user: true,
              },
            },
          },
        },
      },
    }),
    getHospitalSettings(),
    getTemplateSettings("MEDICINE_BILL")
  ])

  if (!billing) {
    notFound()
  }

  // Fetch batch details to populate HSN code and expiry date
  if (billing.type === "PHARMACY" && billing.items.length > 0) {
    const batchIds = billing.items.map((item: any) => item.referenceId).filter(Boolean) as string[]
    if (batchIds.length > 0) {
      const batches = await prisma.inventoryBatch.findMany({
        where: { id: { in: batchIds } },
        include: { medicine: true }
      })
      const batchMap = new Map(batches.map((b: any) => [b.id, b]))
      
      billing.items = billing.items.map((item: any) => {
        const batch = item.referenceId ? batchMap.get(item.referenceId) : null
        return {
          ...item,
          hsnCode: batch?.medicine?.hsnCode || null,
          expiryDate: batch?.expiryDate || null,
        }
      })
    }
  }

  const isWalkIn = billing.patient.patientId === "PAT-WALKIN"

  return (
    <div className="container mx-auto p-6 max-w-4xl print:p-0 print:max-w-none invoice-page min-h-screen bg-gray-50 print:bg-white">
        {/* Header Actions - Hidden on Print */}
        <div className="flex justify-between items-center mb-6 print:hidden">
          <div>
            <h1 className="text-3xl font-bold text-[#0066CC]">Invoice</h1>
            <p className="text-muted-foreground">
              Bill #{billing.billNumber}
            </p>
          </div>
          <InvoiceActions invoiceId={invoiceId} />
        </div>

        {/* Invoice Area */}
        <div className="bg-white rounded-lg shadow-sm overflow-hidden" id="invoice-print-area">
          <MedicineBillTemplate 
            billing={billing}
            hospitalSettings={hospitalSettings}
            printSettings={templateSettings}
          />
        </div>
    </div>
  )
}
