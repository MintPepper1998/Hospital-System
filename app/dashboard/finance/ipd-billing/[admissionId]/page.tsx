import { notFound } from "next/navigation"
import { prisma } from "@/lib/prisma"
import { IPDBillingClient } from "./ipd-billing-client"

export default async function IPDBillingPage({ params }: { params: { admissionId: string } }) {
  const admission = await prisma.iPDAdmission.findUnique({
    where: { id: params.admissionId },
    include: {
      patient: true,
      primaryDoctor: { include: { user: true } },
      bed: { include: { ward: true } },
      billings: {
        include: {
          items: true,
          payments: true
        }
      }
    }
  })

  if (!admission) {
    notFound()
  }

  // To prevent Prisma hydration issues with dates in Server Components
  const serializedAdmission = JSON.parse(JSON.stringify(admission))

  return <IPDBillingClient admission={serializedAdmission} />
}
