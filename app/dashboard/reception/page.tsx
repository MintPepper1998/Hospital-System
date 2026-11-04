import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { UserPlus, Users, Calendar, Clock, Activity, HelpCircle } from "lucide-react"
import { format } from "date-fns"
import { redirect } from "next/navigation"
import Link from "next/link"
import { PublicHolidays } from "@/components/dashboard/public-holidays"
import { OnlineBookingsSection } from "@/components/reception/online-bookings-section"

export default async function ReceptionDashboardPage() {
  const session = await auth()
  
  if (!session?.user?.email) {
    redirect("/login")
  }

  const user = await prisma.user.findUnique({
    where: { email: session.user.email }
  })

  if (!user || user.role !== "RECEPTIONIST") {
    redirect("/dashboard")
  }

  // Get today's date range
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const tomorrow = new Date(today)
  tomorrow.setDate(today.getDate() + 1)

  // Fetch reception data
  const [todayQueue, todayRegistrations, recentPatients, queueStats, onlineBookings, availableDoctors, unresolvedFeedbackCount] = await Promise.all([
    // Today's OPD queue
    prisma.appointment.findMany({
      where: {
        appointmentDate: {
          gte: today,
          lt: tomorrow
        }
      },
      include: {
        patient: {
          include: {
            user: true
          }
        },
        doctor: {
          include: {
            user: true
          }
        }
      },
      orderBy: [
        { appointmentTime: 'asc' },
        { createdAt: 'asc' }
      ]
    }),

    // Today's new registrations
    prisma.patient.count({
      where: {
        createdAt: {
          gte: today,
          lt: tomorrow
        }
      }
    }),

    // Recent patients (last 10)
    prisma.patient.findMany({
      where: { patientId: { not: "PAT-WALKIN" } },
      include: {
        user: true
      },
      orderBy: {
        createdAt: 'desc'
      },
      take: 10
    }),

    // Queue statistics
    prisma.appointment.groupBy({
      by: ['status'],
      where: {
        appointmentDate: {
          gte: today,
          lt: tomorrow
        }
      },
      _count: true
    }),

    // Online bookings (all recent)
    prisma.onlineBooking.findMany({
      include: {
        preferredDoctor: {
          include: { user: true },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
    }),

    // Available doctors for confirm dialog
    prisma.staff.findMany({
      where: {
        user: { role: 'DOCTOR', isActive: true },
        isOnLeave: false,
      },
      select: {
        id: true,
        department: true,
        specialization: true,
        user: { select: { name: true } },
      },
      orderBy: { user: { name: 'asc' } },
    }),

    // Unresolved Patient Feedback
    prisma.patientFeedback.count({
      where: { status: { not: 'RESOLVED' } }
    }),
  ])

  // Calculate stats
  const totalQueue = todayQueue.length
  const pending = queueStats.find(s => s.status === 'PENDING')?._count || 0
  const inProgress = queueStats.find(s => s.status === 'IN_PROGRESS')?._count || 0
  const completed = queueStats.find(s => s.status === 'COMPLETED')?._count || 0

  const getStatusBadge = (status: string) => {
    const variants: Record<string, { variant: any, label: string, className?: string }> = {
      PENDING: { variant: 'outline', label: 'Waiting', className: 'border-orange-500 text-orange-700 dark:text-orange-400' },
      IN_PROGRESS: { variant: 'default', label: 'In Consultation', className: 'bg-blue-600' },
      COMPLETED: { variant: 'outline', label: 'Completed', className: 'bg-green-600 text-white' },
      CANCELLED: { variant: 'destructive', label: 'Cancelled' }
    }
    const config = variants[status] || variants.PENDING
    return <Badge variant={config.variant} className={config.className}>{config.label}</Badge>
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-[#0066CC] flex items-center gap-2">
            <Users className="h-8 w-8" />
            Reception Dashboard
          </h2>
          <p className="text-muted-foreground mt-2">
            Welcome back, {user.name}
          </p>
        </div>
        <Link href="/dashboard/clinical/opd/register">
          <Button className="bg-green-600 hover:bg-green-700">
            <UserPlus className="mr-2 h-4 w-4" />
            Register New Patient
          </Button>
        </Link>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-5">
        <Card className="border-t-4 border-t-blue-500">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Queue</CardTitle>
            <Users className="h-5 w-5 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{totalQueue}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Appointments today
            </p>
          </CardContent>
        </Card>

        <Card className="border-t-4 border-t-orange-500">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Waiting</CardTitle>
            <Clock className="h-5 w-5 text-orange-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">{pending}</div>
            <p className="text-xs text-muted-foreground mt-1">
              In waiting room
            </p>
          </CardContent>
        </Card>

        <Card className="border-t-4 border-t-purple-500">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">In Consultation</CardTitle>
            <Activity className="h-5 w-5 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-600">{inProgress}</div>
            <p className="text-xs text-muted-foreground mt-1">
              With doctors
            </p>
          </CardContent>
        </Card>

        <Card className="border-t-4 border-t-green-500">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">New Registrations</CardTitle>
            <UserPlus className="h-5 w-5 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{todayRegistrations}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Registered today
            </p>
          </CardContent>
        </Card>

        <Link href="/dashboard/feedback" className="block transition-transform hover:scale-105">
        <Card className="border-t-4 border-t-red-500 h-full">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Feedback</CardTitle>
              <HelpCircle className="h-5 w-5 text-red-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">{unresolvedFeedbackCount}</div>
              <p className="text-xs text-muted-foreground mt-1">
                Unresolved issues
              </p>
            </CardContent>
          </Card>
        </Link>

        {/* Nager.Date Public Holidays Integration */}
        <div className="md:col-span-1">
           <PublicHolidays />
        </div>
      </div>

      {/* Online Booking Requests */}
      <OnlineBookingsSection
        initialBookings={JSON.parse(JSON.stringify(onlineBookings))}
        doctors={JSON.parse(JSON.stringify(availableDoctors))}
        currentUser={{ id: user.id, name: user.name || 'Reception' }}
      />

      {/* OPD Queue */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5 text-[#0066CC]" />
            Today's OPD Queue
          </CardTitle>
          <CardDescription>
            {format(today, "EEEE, MMMM dd, yyyy")}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {todayQueue.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No appointments scheduled for today</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Token</TableHead>
                  <TableHead>Time</TableHead>
                  <TableHead>Patient</TableHead>
                  <TableHead>Doctor</TableHead>
                  <TableHead>Reason</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {todayQueue.map((appointment, index) => (
                  <TableRow key={appointment.id} className={appointment.status === 'IN_PROGRESS' ? 'bg-blue-50 dark:bg-blue-950/20' : ''}>
                    <TableCell className="font-bold text-lg">
                      #{index + 1}
                    </TableCell>
                    <TableCell className="font-medium">
                      {appointment.appointmentTime}
                    </TableCell>
                    <TableCell>
                      <div>
                        <p className="font-medium">{appointment.patient.user.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {appointment.patient.patientId}
                        </p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div>
                        <p className="font-medium">Dr. {appointment.doctor.user.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {appointment.doctor.specialization || 'General'}
                        </p>
                      </div>
                    </TableCell>
                    <TableCell className="max-w-xs truncate">
                      {appointment.reason || "General Consultation"}
                    </TableCell>
                    <TableCell>
                      {getStatusBadge(appointment.status)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Recent Patients */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5 text-[#0066CC]" />
            Recently Registered Patients
          </CardTitle>
          <CardDescription>Last 10 registrations</CardDescription>
        </CardHeader>
        <CardContent>
          {recentPatients.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <UserPlus className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No patients registered yet</p>
            </div>
          ) : (
            <div className="space-y-3">
              {recentPatients.map((patient) => (
                <div key={patient.id} className="flex items-center justify-between p-3 border rounded-lg hover:bg-accent/50 transition-colors">
                  <div>
                    <p className="font-medium">{patient.user.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {patient.patientId} • {patient.phone || 'No phone'}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-muted-foreground">
                      {format(new Date(patient.createdAt), "MMM dd, yyyy")}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {format(new Date(patient.createdAt), "hh:mm a")}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
          <CardDescription>Common tasks for reception</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 md:grid-cols-3">
            <Link href="/dashboard/clinical/opd/register">
              <Button variant="outline" className="w-full justify-start">
                <UserPlus className="mr-2 h-4 w-4" />
                Register New Patient
              </Button>
            </Link>
            <Link href="/dashboard/clinical/opd">
              <Button variant="outline" className="w-full justify-start">
                <Calendar className="mr-2 h-4 w-4" />
                Book Appointment
              </Button>
            </Link>
            <Link href="/dashboard/finance/billing/create">
              <Button variant="outline" className="w-full justify-start">
                <Activity className="mr-2 h-4 w-4" />
                Create Invoice
              </Button>
            </Link>
            <Link href="/dashboard/feedback">
              <Button variant="outline" className="w-full justify-start border-red-200 text-red-700 hover:bg-red-50 hover:text-red-800">
                <HelpCircle className="mr-2 h-4 w-4" />
                Manage Feedback
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
