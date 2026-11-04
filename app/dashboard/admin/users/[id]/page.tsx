import { prisma } from "@/lib/prisma"
import { notFound } from "next/navigation"
import { format } from "date-fns"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import Link from "next/link"
import {
  ArrowLeft,
  Pencil,
  Mail,
  Phone,
  Calendar,
  Building2,
  BadgeCheck,
  Stethoscope,
  IndianRupee,
  MapPin,
  ShieldAlert,
  Briefcase,
  Hash,
} from "lucide-react"

const ROLE_STYLES: Record<string, string> = {
  SUPER_ADMIN: "bg-purple-100 text-purple-700",
  DOCTOR: "bg-blue-100 text-blue-700",
  NURSE: "bg-pink-100 text-pink-700",
  ADMIN: "bg-gray-100 text-gray-700",
  PATIENT: "bg-green-100 text-green-700",
  RECEPTIONIST: "bg-amber-100 text-amber-700",
  PHARMACIST: "bg-teal-100 text-teal-700",
  LAB_TECHNICIAN: "bg-cyan-100 text-cyan-700",
  ACCOUNTANT: "bg-orange-100 text-orange-700",
}

export default async function UserDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params

  const user = await prisma.user.findUnique({
    where: { id },
    include: {
      staff: true,
      patient: true,
    },
  })

  if (!user) notFound()

  const roleStyle = ROLE_STYLES[user.role] || "bg-gray-100 text-gray-700"
  const initials = (user.name || "?")
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2)

  return (
    <div className="max-w-4xl mx-auto space-y-5">
      {/* Back + Edit */}
      <div className="flex items-center justify-between">
        <Link
          href="/dashboard/admin/users"
          className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Users
        </Link>
        <Link href={`/dashboard/admin/users/${id}/edit`}>
          <Button variant="outline" className="gap-2">
            <Pencil className="h-3.5 w-3.5" />
            Edit User
          </Button>
        </Link>
      </div>

      {/* Profile Header */}
      <Card className="border-0 shadow-sm overflow-hidden">
        <div className="bg-gradient-to-r from-indigo-500 to-purple-600 px-6 py-8">
          <div className="flex items-center gap-4">
            <div className="h-16 w-16 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center shadow-lg">
              <span className="text-xl font-bold text-white">{initials}</span>
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white">{user.name || "Unnamed"}</h1>
              <div className="flex items-center gap-3 mt-1">
                <Badge className={`${roleStyle} border-0 text-[10px] font-semibold`}>
                  {user.role.replace(/_/g, " ")}
                </Badge>
                <Badge
                  variant="outline"
                  className={
                    user.isActive
                      ? "text-white border-white/40 bg-white/10"
                      : "text-red-200 border-red-300/40 bg-red-500/20"
                  }
                >
                  {user.isActive ? "Active" : "Inactive"}
                </Badge>
                {user.staff?.employeeId && (
                  <span className="text-sm text-white/70">{user.staff.employeeId}</span>
                )}
              </div>
            </div>
          </div>
        </div>

        <CardContent className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {/* Contact Info */}
            <InfoItem icon={Mail} label="Email" value={user.email} />
            <InfoItem icon={Phone} label="Phone" value={user.phone || user.staff?.phone || "—"} />
            <InfoItem
              icon={Calendar}
              label="Account Created"
              value={format(new Date(user.createdAt), "MMM d, yyyy 'at' h:mm a")}
            />

            {/* Staff-specific fields */}
            {user.staff && (
              <>
                <InfoItem icon={Building2} label="Department" value={user.staff.department || "—"} />
                <InfoItem icon={Briefcase} label="Designation" value={user.staff.designation || "—"} />
                <InfoItem icon={Stethoscope} label="Specialization" value={user.staff.specialization || "—"} />
                <InfoItem icon={Hash} label="License Number" value={user.staff.licenseNumber || "—"} />
                <InfoItem
                  icon={IndianRupee}
                  label="Consultation Fee"
                  value={user.staff.consultationFee ? `₹${user.staff.consultationFee.toLocaleString()}` : "—"}
                />
                <InfoItem
                  icon={IndianRupee}
                  label="Basic Salary"
                  value={user.staff.basicSalary ? `₹${user.staff.basicSalary.toLocaleString()}/mo` : "—"}
                />
                <InfoItem icon={MapPin} label="Address" value={user.staff.address || "—"} />
                <InfoItem icon={ShieldAlert} label="Emergency Contact" value={user.staff.emergencyContact || "—"} />
                <InfoItem
                  icon={Calendar}
                  label="Joining Date"
                  value={format(new Date(user.staff.joiningDate), "MMM d, yyyy")}
                />
              </>
            )}

            {/* Patient-specific fields */}
            {user.patient && (
              <>
                <InfoItem icon={Hash} label="Patient ID" value={user.patient.patientId} />
                <InfoItem icon={Phone} label="Phone" value={user.patient.phone || "—"} />
                <InfoItem
                  icon={Calendar}
                  label="Date of Birth"
                  value={
                    user.patient.dateOfBirth
                      ? format(new Date(user.patient.dateOfBirth), "MMM d, yyyy")
                      : "—"
                  }
                />
                <InfoItem icon={BadgeCheck} label="Gender" value={user.patient.gender || "—"} />
                <InfoItem icon={MapPin} label="Address" value={user.patient.address || "—"} />
                <InfoItem icon={BadgeCheck} label="Blood Group" value={user.patient.bloodGroup || "—"} />
              </>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

function InfoItem({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ElementType
  label: string
  value: string
}) {
  return (
    <div className="flex items-start gap-3">
      <div className="h-8 w-8 rounded-lg bg-gray-100 flex items-center justify-center flex-shrink-0 mt-0.5">
        <Icon className="h-4 w-4 text-gray-400" />
      </div>
      <div className="min-w-0">
        <p className="text-[10px] text-gray-400 uppercase tracking-wider font-semibold">{label}</p>
        <p className="text-sm font-medium text-gray-800 truncate">{value}</p>
      </div>
    </div>
  )
}
