import { prisma } from "@/lib/prisma"
import { requireAuth } from "@/lib/auth-guard"
import { PreAuthCreateForm } from "@/components/insurance/pre-auth/pre-auth-create-form"

export default async function PreAuthCreatePage() {
  await requireAuth()

  const policies = await prisma.insurancePolicy.findMany({
    where: { isActive: true },
    include: { patient: { include: { user: true } } },
    orderBy: { createdAt: "desc" },
  })

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight text-[#0066CC]">New Pre-Authorization</h2>
        <p className="text-muted-foreground mt-1">Submit pre-authorization request to TPA/Insurer</p>
      </div>
      <PreAuthCreateForm policies={policies} />
    </div>
  )
}
