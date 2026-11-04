import { prisma } from "@/lib/prisma"
import { notFound } from "next/navigation"
import { EditUserForm } from "@/components/admin/edit-user-form"

export default async function EditUserPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params

  const user = await prisma.user.findUnique({
    where: { id },
    select: {
      id: true,
      name: true,
      email: true,
      phone: true,
      role: true,
      permissions: true,
      isActive: true,
      staff: {
        select: {
          department: true,
          designation: true,
          specialization: true,
          licenseNumber: true,
          phone: true,
          address: true,
          emergencyContact: true,
          consultationFee: true,
          basicSalary: true,
          employeeId: true,
        },
      },
    },
  })

  if (!user) notFound()

  return <EditUserForm user={user} />
}
