import { prisma } from "@/lib/prisma"
import { requireAuthSafe } from "@/lib/auth-guard"
import { redirect } from "next/navigation"
import { BillingDashboardClient } from "@/components/ipd/billing-dashboard-client"
import { calculateFinalBill } from "@/app/actions/billing"
import { getSecureUrl } from "@/lib/s3-server"

export default async function IPDBillingCounterPage() {
  const authResult = await requireAuthSafe(["SUPER_ADMIN", "ACCOUNTANT", "RECEPTIONIST", "BILLING_CLERK", "ADMIN"])
  if (!authResult.ok) {
    redirect("/dashboard")
  }

  // Fetch all admitted patients + discharged patients who still might have bills to settle
  const admissions = await prisma.iPDAdmission.findMany({
    where: {
      OR: [
        { status: "ADMITTED" },
        { status: "DISCHARGED" }
      ]
    },
    include: {
      patient: {
        include: { user: true }
      },
      bed: {
        include: { ward: true }
      },
      primaryDoctor: {
        include: { user: true }
      }
    },
    orderBy: {
      admissionDate: "desc"
    }
  })

  // Fetch nurses
  const nurses = await prisma.staff.findMany({
    where: { 
      user: { role: "NURSE" } 
    },
    include: { user: true }
  })

  // Calculate live bills for all admissions
  const enrichedAdmissions = await Promise.all(
    admissions.map(async (adm) => {
      const billData = await calculateFinalBill(adm.id)
      const profilePhoto = await getSecureUrl(adm.patient.profilePhotoUrl)
      
      return {
        id: adm.id,
        patientId: adm.patientId,
        patientDisplayId: adm.patient.patientId,
        patientName: adm.patient.user.name || "Unknown",
        patientAge: adm.patient.dateOfBirth 
          ? Math.floor((new Date().getTime() - new Date(adm.patient.dateOfBirth).getTime()) / (1000 * 60 * 60 * 24 * 365.25))
          : "N/A",
        patientGender: adm.patient.gender,
        patientPhoto: profilePhoto,
        admissionDate: adm.admissionDate.toISOString(),
        status: adm.status,
        bedNumber: adm.bed.bedNumber,
        wardName: adm.bed.ward.name,
        doctorName: adm.primaryDoctor.user.name,
        
        // Billing Data
        hasInsuranceCoverage: billData.data?.hasInsuranceCoverage || false,
        isBsky: billData.data?.isBsky || false,
        totalBillAmount: billData.data?.totalBillAmount || 0,
        amountPaid: billData.data?.amountPaid || 0,
        patientLiability: billData.data?.patientLiability || 0,
        balanceDue: billData.data?.balanceDue || 0,
        
        // Full breakdown object for the modal
        billBreakdown: billData.data
      }
    })
  )

  // Filter out discharged patients who have 0 balance due, 
  // so we only see currently admitted OR those who owe money/need refunds.
  const activeBillingProfiles = enrichedAdmissions.filter(a => 
    a.status === "ADMITTED" || Math.abs(a.balanceDue) > 1
  )

  return (
    <div className="flex flex-col min-h-screen bg-[#FDFBF7] selection:bg-black/10">
      <BillingDashboardClient 
        admissions={activeBillingProfiles} 
        nurses={nurses.map(n => ({ id: n.id, name: n.user.name || "Unknown Nurse" }))}
      />
    </div>
  )
}
