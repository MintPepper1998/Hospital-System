"use client"

import { useMemo } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { format, parseISO } from "date-fns"
import { ShiftCell } from "./shift-cell"

interface Employee {
  id: string
  department: string | null
  designation: string | null
  isOnLeave: boolean
  leaveReason: string | null
  user: {
    name: string | null
    role: string
  }
  rosters: Array<{
    id: string
    date: Date | string // Can be serialized string from server
    shift: {
      id: string
      name: string
      code: string
      startTime: string
      endTime: string
      color: string | null
      icon: string | null
    }
  }>
}

interface Shift {
  id: string
  name: string
  code: string
  startTime: string
  endTime: string
  color: string | null
  icon: string | null
}

interface RosterGridProps {
  employees: Employee[]
  shifts: Shift[]
  weekDates: (Date | string)[] // Can be serialized strings from server
  employeesByDepartment: Record<string, Employee[]>
}

// Helper to safely convert date string/object to Date
function toDate(d: Date | string): Date {
  if (typeof d === "string") {
    return parseISO(d)
  }
  return d
}

// Helper to compare dates by YYYY-MM-DD only (ignoring time)
function isSameDateOnly(d1: Date | string, d2: Date | string): boolean {
  const date1 = toDate(d1)
  const date2 = toDate(d2)
  return (
    date1.getFullYear() === date2.getFullYear() &&
    date1.getMonth() === date2.getMonth() &&
    date1.getDate() === date2.getDate()
  )
}

export function RosterGrid({
  employees,
  shifts,
  weekDates,
  employeesByDepartment,
}: RosterGridProps) {
  // Create today's date fresh on the client
  const today = useMemo(() => new Date(), [])
  const dayNames = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]

  // Convert weekDates to proper Date objects
  const parsedWeekDates = useMemo(() => weekDates.map(toDate), [weekDates])

  // Helper to get roster for a specific employee on a specific date
  const getRoster = (employee: Employee, date: Date) => {
    return employee.rosters.find((r) => isSameDateOnly(r.date, date))
  }

  return (
    <div className="space-y-6">
      {Object.entries(employeesByDepartment).map(([department, deptEmployees]) => (
        <Card key={department}>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <Badge variant="outline" className="text-sm">
                {department}
              </Badge>
              <span className="text-muted-foreground text-sm font-normal">
                ({deptEmployees.length} staff)
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr>
                    <th className="text-left p-2 border-b font-medium text-sm min-w-[180px]">
                      Employee
                    </th>
                    {parsedWeekDates.map((date, idx) => {
                      // Use our custom date comparison that ignores time
                      const isToday = isSameDateOnly(date, today)
                      const isWeekend = idx >= 5

                      return (
                        <th
                          key={format(date, "yyyy-MM-dd")}
                          className={`text-center p-2 border-b font-medium text-sm min-w-[100px]
                            ${isToday ? "bg-blue-50 dark:bg-blue-950/20" : ""}
                            ${isWeekend && !isToday ? "bg-gray-50 dark:bg-gray-900/20" : ""}
                          `}
                        >
                          <div>{dayNames[idx]}</div>
                          <div className={`text-xs ${isToday ? "text-blue-600 font-bold" : "text-muted-foreground"}`}>
                            {format(date, "d MMM")}
                          </div>
                        </th>
                      )
                    })}
                  </tr>
                </thead>
                <tbody>
                  {deptEmployees.map((employee) => (
                    <tr key={employee.id} className="hover:bg-muted/30">
                      <td className="p-2 border-b">
                        <div className="flex items-center gap-2">
                          <div
                            className={`h-8 w-8 rounded-full flex items-center justify-center text-sm font-medium
                              ${employee.isOnLeave ? "bg-orange-100 text-orange-600" : "bg-blue-100 text-blue-600"}
                            `}
                          >
                            {employee.user.name?.charAt(0) || "?"}
                          </div>
                          <div>
                            <div className="font-medium text-sm flex items-center gap-1">
                              {employee.user.name}
                              {employee.isOnLeave && (
                                <span className="text-orange-600 text-xs">(Leave)</span>
                              )}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {employee.designation || employee.user.role.replace("_", " ")}
                            </div>
                          </div>
                        </div>
                      </td>
                      {parsedWeekDates.map((date, idx) => {
                        const roster = getRoster(employee, date)
                        // Use our custom date comparison that ignores time
                        const isToday = isSameDateOnly(date, today)
                        const isWeekend = idx >= 5

                        return (
                          <td
                            key={format(date, "yyyy-MM-dd")}
                            className={`p-1 border-b text-center
                              ${isToday ? "bg-blue-50 dark:bg-blue-950/20" : ""}
                              ${isWeekend && !isToday ? "bg-gray-50 dark:bg-gray-900/20" : ""}
                            `}
                          >
                            <ShiftCell
                              staffId={employee.id}
                              date={date}
                              currentShift={roster?.shift}
                              shifts={shifts}
                              isOnLeave={employee.isOnLeave}
                            />
                          </td>
                        )
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
