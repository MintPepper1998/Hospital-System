import { notFound } from "next/navigation"
import { prisma } from "@/lib/prisma"
import { requireAuthSafe } from "@/lib/auth-guard"
import { PharmacyBillEditClient } from "@/components/pharmacy/pharmacy-bill-edit-client"
import { BillingType } from "@prisma/client"

export default async function EditPharmacyBillPage({
  params,
}: {
  params: Promise<{ billId: string }>
}) {
  const authResult = await requireAuthSafe(["SUPER_ADMIN", "PHARMACIST"])
  if (!authResult.ok) return notFound()

  const resolvedParams = await params
  const bill = await prisma.billing.findUnique({
    where: {
      id: resolvedParams.billId,
      type: BillingType.PHARMACY,
    },
    include: {
      patient: {
        select: {
          phone: true,
          user: { select: { name: true } },
        },
      },
      items: {
        orderBy: {
          createdAt: "asc"
        }
      },
    },
  })

  if (!bill) {
    notFound()
  }

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <PharmacyBillEditClient bill={bill} />
    </div>
  )
}
