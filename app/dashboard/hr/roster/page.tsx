import { prisma } from "@/lib/prisma"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ChevronLeft, ChevronRight, Calendar, Users, Settings } from "lucide-react"
import Link from "next/link"
import { format, startOfWeek, addDays, addWeeks, subWeeks, parseISO } from "date-fns"
import { RosterGrid } from "@/components/hr/roster-grid"

interface RosterPageProps {
  searchParams: Promise<{ week?: string }>
}

export default async function RosterPage({ searchParams }: RosterPageProps) {
  const { week } = await searchParams
  
  // Calculate the week to display
  const currentDate = week ? parseISO(week) : new Date()
  const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 }) // Monday
  
  // Generate dates for the week
  const weekDates = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i))

  // Fetch shifts
  const shifts = await prisma.shift.findMany({
    where: { isActive: true },
    orderBy: { startTime: "asc" },
  })

  // Fetch employees with their rosters for this week
  const employees = await prisma.staff.findMany({
    where: {
      user: { isActive: true },
    },
    include: {
      user: true,
      rosters: {
        where: {
          date: {
            gte: weekStart,
            lte: weekDates[6],
          },
        },
        include: {
          shift: true,
        },
      },
    },
    orderBy: [
      { department: "asc" },
      { user: { name: "asc" } },
    ],
  })

  // Navigation links
  const prevWeek = format(subWeeks(weekStart, 1), "yyyy-MM-dd")
  const nextWeek = format(addWeeks(weekStart, 1), "yyyy-MM-dd")
  const today = format(new Date(), "yyyy-MM-dd")

  // Group employees by department
  const employeesByDepartment = employees.reduce((acc, emp) => {
    const dept = emp.department || "Unassigned"
    if (!acc[dept]) acc[dept] = []
    acc[dept].push(emp)
    return acc
  }, {} as Record<string, typeof employees>)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-blue-600">
            Staff Roster
          </h2>
          <p className="text-muted-foreground mt-1">
            Weekly shift schedule for all hospital staff
          </p>
        </div>
        <div className="flex gap-2">
          <Link href="/dashboard/hr/staff">
            <Button variant="outline">
              <Users className="mr-2 h-4 w-4" />
              Staff Directory
            </Button>
          </Link>
        </div>
      </div>

      {/* Week Navigation */}
      <Card>
        <CardContent className="py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Link href={`/dashboard/hr/roster?week=${prevWeek}`}>
                <Button variant="outline" size="icon">
                  <ChevronLeft className="h-4 w-4" />
                </Button>
              </Link>
              <Link href={`/dashboard/hr/roster?week=${today}`}>
                <Button variant="outline" size="sm">
                  Today
                </Button>
              </Link>
              <Link href={`/dashboard/hr/roster?week=${nextWeek}`}>
                <Button variant="outline" size="icon">
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </Link>
            </div>

            <div className="flex items-center gap-2">
              <Calendar className="h-5 w-5 text-blue-600" />
              <span className="text-lg font-semibold">
                {format(weekStart, "MMM d")} - {format(weekDates[6], "MMM d, yyyy")}
              </span>
            </div>

            <div className="flex gap-2">
              {shifts.map((shift) => (
                <Badge
                  key={shift.id}
                  variant="outline"
                  style={{
                    backgroundColor: shift.color ? `${shift.color}20` : undefined,
                    borderColor: shift.color || undefined,
                    color: shift.color || undefined,
                  }}
                >
                  {shift.icon} {shift.name}
                </Badge>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Roster Grid */}
      {shifts.length === 0 ? (
        <Card>
          <CardContent className="py-12">
            <div className="text-center">
              <Settings className="h-12 w-12 mx-auto text-muted-foreground opacity-50" />
              <h3 className="mt-4 text-lg font-semibold">No Shifts Configured</h3>
              <p className="text-muted-foreground mt-2">
                Get started by creating your first shift template
              </p>
            </div>
          </CardContent>
        </Card>
      ) : employees.length === 0 ? (
        <Card>
          <CardContent className="py-12">
            <div className="text-center">
              <Users className="h-12 w-12 mx-auto text-muted-foreground opacity-50" />
              <h3 className="mt-4 text-lg font-semibold">No Staff Members</h3>
              <p className="text-muted-foreground mt-2">
                Add employees before creating rosters
              </p>
              <Link href="/dashboard/hr/staff">
                <Button className="mt-4">Go to Staff Directory</Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      ) : (
        <RosterGrid
          employees={employees}
          shifts={shifts}
          weekDates={weekDates}
          employeesByDepartment={employeesByDepartment}
        />
      )}

      {/* Legend */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Shift Legend</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-4">
            {shifts.map((shift) => (
              <div key={shift.id} className="flex items-center gap-2">
                <div
                  className="h-6 w-6 rounded flex items-center justify-center text-sm"
                  style={{ backgroundColor: shift.color || "#e5e7eb" }}
                >
                  {shift.icon}
                </div>
                <div>
                  <span className="font-medium text-sm">{shift.name}</span>
                  <span className="text-xs text-muted-foreground ml-2">
                    {shift.startTime} - {shift.endTime}
                  </span>
                </div>
              </div>
            ))}
            <div className="flex items-center gap-2">
              <div className="h-6 w-6 rounded bg-orange-100 flex items-center justify-center text-sm">
                🏖️
              </div>
              <span className="font-medium text-sm">On Leave</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
