import { requireAuthSafe } from "@/lib/auth-guard"
import { notFound } from "next/navigation"
import { prisma } from "@/lib/prisma"
import { RolesClient } from "@/components/admin/roles-client"

export const metadata = {
  title: "Role Management | Admin",
  description: "Manage custom role templates and permissions",
}

export default async function RolesPage() {
  const authResult = await requireAuthSafe(["SUPER_ADMIN"])
  if (!authResult.ok) return notFound()

  const roles = await prisma.roleTemplate.findMany({
    orderBy: { createdAt: "desc" },
  })

  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Role Management</h2>
          <p className="text-muted-foreground">
            Create custom roles with predefined permissions for your staff
          </p>
        </div>
      </div>
      <RolesClient initialRoles={roles} />
    </div>
  )
}
