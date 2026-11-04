"use client"

import { useState, useEffect, useTransition } from "react"
import { format } from "date-fns"
import { Calendar as CalendarIcon, Save, Loader2 } from "lucide-react"
import { toast } from "sonner"
import { cn } from "@/lib/utils"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Calendar } from "@/components/ui/calendar"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

import { getAttendanceForDate, saveBulkAttendance, type StaffAttendanceRecord } from "@/app/actions/hr-attendance"

export function AttendanceClient() {
  const [date, setDate] = useState<Date>(new Date())
  const [records, setRecords] = useState<StaffAttendanceRecord[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [isPending, startTransition] = useTransition()

  // Load data when date changes
  useEffect(() => {
    let isMounted = true
    async function loadData() {
      setIsLoading(true)
      const res = await getAttendanceForDate(date.toISOString())
      if (isMounted) {
        if (res.success && res.data) {
          setRecords(res.data)
        } else {
          toast.error(res.message || "Failed to load attendance")
          setRecords([])
        }
        setIsLoading(false)
      }
    }
    loadData()
    return () => { isMounted = false }
  }, [date])

  const handleStatusChange = (staffId: string, status: StaffAttendanceRecord["status"]) => {
    setRecords(prev => prev.map(r => 
      r.staffId === staffId ? { ...r, status } : r
    ))
  }

  const handleHalfDayTimeChange = (staffId: string, timeStr: string) => {
    setRecords(prev => prev.map(r => 
      r.staffId === staffId ? { ...r, halfDayTime: timeStr } : r
    ))
  }

  const handleRemarksChange = (staffId: string, remarks: string) => {
    setRecords(prev => prev.map(r => 
      r.staffId === staffId ? { ...r, remarks } : r
    ))
  }

  const handleSave = () => {
    startTransition(async () => {
      const res = await saveBulkAttendance(date.toISOString(), records)
      if (res.success) {
        toast.success(res.message)
      } else {
        toast.error(res.message || "Failed to save attendance")
      }
    })
  }

  return (
    <Card className="shadow-sm">
      <CardHeader className="flex flex-row items-center justify-between pb-4 border-b">
        <CardTitle className="text-xl">Daily Attendance Entry</CardTitle>
        <div className="flex items-center gap-4">
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant={"outline"}
                className={cn(
                  "w-[240px] justify-start text-left font-normal",
                  !date && "text-muted-foreground"
                )}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {date ? format(date, "PPP") : <span>Pick a date</span>}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0">
              <Calendar
                mode="single"
                selected={date}
                onSelect={(d) => d && setDate(d)}
                initialFocus
              />
            </PopoverContent>
          </Popover>

          <Button 
            onClick={handleSave} 
            disabled={isPending || isLoading}
            className="bg-teal-600 hover:bg-teal-700"
          >
            {isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
            Save Attendance
          </Button>
        </div>
      </CardHeader>
      
      <CardContent className="pt-4 p-0">
        {isLoading ? (
          <div className="py-20 flex justify-center items-center">
            <Loader2 className="h-8 w-8 animate-spin text-teal-600" />
          </div>
        ) : (
          <div className="rounded-md border mx-6 mb-6">
            <Table>
              <TableHeader className="bg-gray-50">
                <TableRow>
                  <TableHead className="w-[200px]">Employee Name</TableHead>
                  <TableHead className="w-[150px]">Department</TableHead>
                  <TableHead className="w-[200px]">Status</TableHead>
                  <TableHead className="w-[200px]">Half-Day Time / Note</TableHead>
                  <TableHead>Remarks</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {records.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center h-24 text-muted-foreground">
                      No active staff found.
                    </TableCell>
                  </TableRow>
                ) : (
                  records.map((record) => (
                    <TableRow key={record.staffId}>
                      <TableCell className="font-medium">
                        {record.name}
                        <div className="text-xs text-muted-foreground">
                          {record.employeeId ? `Emp ID: ${record.employeeId}` : "No Emp ID"}
                        </div>
                      </TableCell>
                      <TableCell>{record.department}</TableCell>
                      <TableCell>
                        <Select 
                          value={record.status} 
                          onValueChange={(val: any) => handleStatusChange(record.staffId, val)}
                        >
                          <SelectTrigger className="w-[140px] h-9">
                            <SelectValue placeholder="Status" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="PRESENT">
                              <span className="text-green-600 font-medium">Present</span>
                            </SelectItem>
                            <SelectItem value="ABSENT">
                              <span className="text-red-600 font-medium">Absent</span>
                            </SelectItem>
                            <SelectItem value="HALF_DAY">
                              <span className="text-amber-600 font-medium">Half-Day</span>
                            </SelectItem>
                            <SelectItem value="LEAVE">
                              <span className="text-blue-600 font-medium">Leave</span>
                            </SelectItem>
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell>
                        {record.status === "HALF_DAY" ? (
                          <Input 
                            placeholder="e.g. 10AM - 2PM" 
                            className="h-9 w-full text-sm"
                            value={record.halfDayTime || ""}
                            onChange={(e) => handleHalfDayTimeChange(record.staffId, e.target.value)}
                          />
                        ) : (
                          <span className="text-xs text-muted-foreground pl-3">N/A</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <Input 
                          placeholder="Reason or notes..." 
                          className="h-9 w-full text-sm"
                          value={record.remarks || ""}
                          onChange={(e) => handleRemarksChange(record.staffId, e.target.value)}
                        />
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
