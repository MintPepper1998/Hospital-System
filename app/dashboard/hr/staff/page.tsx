import { getStaffList } from "@/app/actions/staff"
import { getRoleTemplates } from "@/app/actions/roles"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Users, UserCheck, UserX, Clock } from "lucide-react"
import { StaffDirectoryClient } from "@/components/hr/staff-directory-client"

export default async function StaffDirectoryPage() {
  const result = await getStaffList()
  const data = result.data

  const stats = data?.stats ?? { total: 0, active: 0, inactive: 0, onLeave: 0 }
  const allStaff = data?.all ?? []
  
  const roleTemplatesRes = await getRoleTemplates()
  const roleTemplates = roleTemplatesRes.success && roleTemplatesRes.data ? roleTemplatesRes.data : []
  
  const { getHRDepartments } = await import("@/app/actions/staff")
  const hrDeptRes = await getHRDepartments()
  const hrDepartments = hrDeptRes.success && hrDeptRes.data ? hrDeptRes.data : []
  
  const { prisma } = await import("@/lib/prisma")
  const tempPermissions = await prisma.temporaryPermission.findMany({
    orderBy: { grantedAt: "desc" }
  })
  // Serialize for client
  const serializedPermissions = tempPermissions.map((p) => ({
    id: p.id,
    userId: p.userId,
    permission: p.permission,
    grantedAt: p.grantedAt.toISOString(),
    expiresAt: p.expiresAt ? p.expiresAt.toISOString() : null,
    grantedBy: p.grantedBy,
  }))

  // Serialize dates for client
  const serializedStaff = allStaff.map((emp) => ({
    id: emp.id,
    employeeId: emp.employeeId,
    department: emp.department,
    designation: emp.designation,
    specialization: emp.specialization,
    licenseNumber: emp.licenseNumber,
    phone: emp.phone,
    consultationFee: emp.consultationFee,
    basicSalary: emp.basicSalary,
    isOnLeave: emp.isOnLeave,
    leaveReason: emp.leaveReason,
    joiningDate: emp.joiningDate.toISOString(),
    idCardImage: emp.idCardImage,
    user: {
      id: emp.user.id,
      name: emp.user.name,
      email: emp.user.email,
      role: emp.user.role,
      isActive: emp.user.isActive,
      image: emp.user.image,
      permissions: emp.user.permissions || [],
    },
  }))

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-3xl font-bold tracking-tight text-blue-600">
          Hospital Staff Directory
        </h2>
        <p className="text-muted-foreground mt-1">
          Manage staff accounts, roles, and access
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Staff</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
            <p className="text-xs text-muted-foreground">Registered accounts</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active</CardTitle>
            <UserCheck className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{stats.active}</div>
            <p className="text-xs text-muted-foreground">Login enabled</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">On Leave</CardTitle>
            <Clock className="h-4 w-4 text-amber-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-amber-600">{stats.onLeave}</div>
            <p className="text-xs text-muted-foreground">Currently away</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Disabled</CardTitle>
            <UserX className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{stats.inactive}</div>
            <p className="text-xs text-muted-foreground">Login disabled</p>
          </CardContent>
        </Card>
      </div>

      {/* Client Component: Tabs + Cards + Add Dialog */}
      <StaffDirectoryClient staff={serializedStaff} roleTemplates={roleTemplates} temporaryPermissions={serializedPermissions} initialDepartments={hrDepartments} />
    </div>
  )
}
