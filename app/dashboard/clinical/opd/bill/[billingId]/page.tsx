import { notFound } from "next/navigation"
import { prisma } from "@/lib/prisma"
import { PrintBillTrigger } from "./print-bill-trigger"
import { getHospitalSettings } from "@/app/actions/settings"
import { getTemplateSettings } from "@/app/actions/print-template-settings"
import { MedicalBillTemplate } from "@/components/billing/medical-bill-template"

interface PrintOPDBillPageProps {
  params: Promise<{ billingId: string }>
}

export default async function PrintOPDBillPage({ params }: PrintOPDBillPageProps) {
  const { billingId } = await params

  const billing = await prisma.billing.findUnique({
    where: { id: billingId },
    include: {
      items: true,
      patient: {
        include: {
          user: true,
        },
      },
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
  })

  if (!billing) notFound()
  
  const hospitalSettings = await getHospitalSettings()
  const printSettings = await getTemplateSettings("PATIENT_BILLING")

  return (
    <>
      <PrintBillTrigger />

      <div className="bill-receipt bg-white min-h-screen print:min-h-0 print:m-0 print:p-0">
        <MedicalBillTemplate 
           billing={billing} 
           hospitalSettings={hospitalSettings} 
           printSettings={printSettings} 
        />
      </div>

      {/* Print-specific styles */}
      <style>{`
        @media print {
          body { 
            margin: 0; 
            padding: 0; 
            background: white;
          }
          .bill-receipt { 
            box-shadow: none; 
          }
          /* This removes browser headers/footers */
          @page { 
            margin: 5mm; 
          }
        }
      `}</style>
    </>
  )
}
