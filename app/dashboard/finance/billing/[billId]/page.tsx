import { notFound, redirect } from "next/navigation"
import { Suspense } from "react"
import { prisma } from "@/lib/prisma"
import { Card, CardContent } from "@/components/ui/card"
import { BillingStatus } from "@prisma/client"
import { getHospitalSettings } from "@/app/actions/settings"
import { getPrintSettings } from "@/app/actions/print-settings"
import { InvoiceActions } from "./invoice-actions"
import { PaymentModal } from "@/components/finance/payment-modal"
import { MedicalBillTemplate } from "@/components/billing/medical-bill-template"
import { MedicineBillTemplate } from "@/components/pharmacy/medicine-bill-template"

interface InvoicePageProps {
  params: Promise<{
    billId: string
  }>
}

export default async function InvoicePage({ params }: InvoicePageProps) {
  const { billId } = await params

  let billing: any = null
  let dbError = false
  let errorMessage = ""

  const hospitalSettings = await getHospitalSettings()
  const printSettings = await getPrintSettings()

  try {
    // Fetch billing details
    billing = await prisma.billing.findUnique({
      where: { id: billId },
      include: {
        patient: {
          include: {
            user: true,
          },
        },
        pharmacyCustomer: true,
        appointment: {
          include: {
            doctor: {
              include: {
                user: true,
              },
            },
          },
        },
        items: true,
        payments: {
          orderBy: { paymentDate: "desc" },
        },
      },
    })

    if (!billing) {
      notFound()
    }

    if (billing.type === "PHARMACY") {
      redirect(`/dashboard/pharmacy/invoice/${billing.id}`)
    }

  } catch (error: any) {
    // Re-throw Next.js internal errors (redirect, notFound)
    if (error?.digest?.startsWith("NEXT_")) {
      throw error
    }
    dbError = true
    errorMessage = error.message || "Failed to connect to database"
    console.error("Invoice detail error:", error)
  }

  // Show error state if database connection failed
  if (dbError) {
    return (
      <div className="space-y-6 max-w-5xl mx-auto">
        <InvoiceActions />

        <Card className="border-red-500 bg-red-50 dark:bg-red-950">
          <CardContent className="p-6 print:p-2">
          <div className="grid md:grid-cols-2 gap-8 mb-8 print:gap-4 print:mb-4">
              <div className="rounded-full bg-red-100 dark:bg-red-900 p-2">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-6 w-6 text-red-600"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                  />
                </svg>
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-red-900 dark:text-red-100">
                  Database Connection Error
                </h3>
                <p className="mt-1 text-sm text-red-800 dark:text-red-200">
                  {errorMessage}
                </p>
                <div className="mt-4 space-y-2">
                  <p className="text-sm font-medium text-red-900 dark:text-red-100">
                    To fix this issue:
                  </p>
                  <ol className="list-decimal list-inside text-sm text-red-800 dark:text-red-200 space-y-1">
                    <li>Make sure Docker Desktop is running</li>
                    <li>Start the database: <code className="bg-red-100 dark:bg-red-900 px-2 py-0.5 rounded">docker-compose up -d</code></li>
                    <li>Refresh this page</li>
                  </ol>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Header Actions */}
      <Suspense fallback={<div className="h-9" />}>
        <InvoiceActions
          billingData={{
            billingId: billing.id,
            billNumber: billing.billNumber,
            patientName: billing.pharmacyCustomer?.name || billing.patient?.user?.name || "Patient",
            patientPhone: billing.patient?.phone || billing.patient?.user?.phone || null,
            grandTotal: billing.netAmount,
          }}
        />
      </Suspense>

      {/* Screen Interactive Elements (Payment / Status) - Hidden on Print */}
      {billing.balanceAmount > 0 && billing.status !== BillingStatus.CANCELLED && (
        <div className="flex items-center justify-between bg-orange-50 border border-orange-200 rounded-lg p-4 print:hidden shadow-sm">
          <div>
            <p className="text-sm font-semibold text-orange-800">
              Outstanding Balance: <span className="text-lg">₹{billing.balanceAmount.toFixed(2)}</span>
            </p>
            <p className="text-xs text-orange-600 mt-0.5">
              {billing.status === BillingStatus.PARTIALLY_PAID
                ? `Partially paid — ₹${billing.paidAmount.toFixed(2)} of ₹${billing.netAmount.toFixed(2)} received`
                : "No payments recorded yet"}
            </p>
          </div>
          <PaymentModal
            invoiceId={billing.id}
            billNumber={billing.billNumber}
            totalAmount={billing.netAmount}
            paidAmount={billing.paidAmount}
            balanceAmount={billing.balanceAmount}
            patientName={billing.pharmacyCustomer?.name || billing.patient?.user?.name || undefined}
          />
        </div>
      )}

      {billing.status === BillingStatus.PAID && (
        <div className="flex items-center gap-3 bg-green-50 border border-green-200 rounded-lg p-4 print:hidden shadow-sm">
          <div className="rounded-full bg-green-100 p-2">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-green-600" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
            </svg>
          </div>
          <div>
            <p className="text-sm font-semibold text-green-800">This invoice is fully paid</p>
            <p className="text-xs text-green-600">
              Total of ₹{billing.paidAmount.toFixed(2)} received across {billing.payments?.length || 1} payment(s)
            </p>
          </div>
        </div>
      )}

      {/* Bill Preview Box (Shown on Screen & used for Print) */}
      <div className="bg-gray-100 p-8 rounded-xl border flex justify-center print:bg-white print:border-none print:p-0 print:m-0 print:block">
        <div data-bill-template>
          {billing.type === "PHARMACY" ? (
            <MedicineBillTemplate 
              billing={billing} 
              hospitalSettings={hospitalSettings} 
              printSettings={printSettings as any} 
            />
          ) : (
            <MedicalBillTemplate 
              billing={billing} 
              hospitalSettings={hospitalSettings} 
              printSettings={printSettings as any} 
            />
          )}
        </div>
      </div>

      {/* Print-specific style reset so the invoice uses whole paper without scrollbars */}
      <style>{`
        @media print {
          body { 
            margin: 0; 
            padding: 0; 
            background: white !important;
          }
          /* Hide non-bill elements */
          .print\\:hidden {
            display: none !important;
          }
        }
      `}</style>
    </div>
  )
}
