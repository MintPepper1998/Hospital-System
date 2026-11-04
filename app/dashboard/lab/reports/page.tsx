import { prisma } from "@/lib/prisma"
import { format } from "date-fns"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Microscope, FileText, User, CheckCircle, Clock } from "lucide-react"
import Link from "next/link"

export const dynamic = "force-dynamic"

export default async function LabReportsPage() {
  // Fetch completed pathology tests with results
  const completedTests = await prisma.labRequest.findMany({
    where: {
      testType: "PATHOLOGY",
      status: "COMPLETED",
    },
    include: {
      patient: {
        include: {
          user: true,
        },
      },
      results: true,
      appointment: {
        include: {
          doctor: {
            include: {
              user: true,
            },
          },
        },
      },
    },
    orderBy: {
      updatedAt: "desc",
    },
    take: 50, // Show last 50 reports
  })

  // Stats
  const todayStart = new Date()
  todayStart.setHours(0, 0, 0, 0)
  
  const todayCount = completedTests.filter(
    t => new Date(t.updatedAt) >= todayStart
  ).length

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-blue-600 flex items-center gap-2">
            <FileText className="h-8 w-8" />
            Lab Reports
          </h2>
          <p className="text-muted-foreground mt-1">
            View and print completed pathology test reports
          </p>
        </div>
        <div className="flex gap-2">
          <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
            <CheckCircle className="h-3 w-3 mr-1" />
            {todayCount} completed today
          </Badge>
          <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
            {completedTests.length} total reports
          </Badge>
        </div>
      </div>

      {/* Reports Table */}
      <Card className="border-t-4 border-t-blue-500">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Microscope className="h-5 w-5 text-blue-600" />
            Completed Reports
          </CardTitle>
          <CardDescription>
            Recent pathology reports with results
          </CardDescription>
        </CardHeader>
        <CardContent>
          {completedTests.length === 0 ? (
            <div className="text-center py-10 text-muted-foreground">
              <FileText className="h-12 w-12 mx-auto mb-2 opacity-50" />
              <p>No completed reports yet</p>
              <p className="text-xs">Completed lab reports will appear here</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead>Patient</TableHead>
                  <TableHead>Test Name</TableHead>
                  <TableHead>Referred By</TableHead>
                  <TableHead>Completed</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {completedTests.map((test) => (
                  <TableRow key={test.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center">
                          <User className="h-4 w-4 text-blue-600" />
                        </div>
                        <div>
                          <p className="font-medium">{test.patient.user.name}</p>
                          <p className="text-xs text-muted-foreground">{test.patient.patientId}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <p className="font-medium">{test.testName}</p>
                      <p className="text-xs text-muted-foreground">
                        {test.results?.length || 0} result(s)
                      </p>
                    </TableCell>
                    <TableCell className="text-sm">
                      {test.appointment?.doctor?.user?.name
                        ? `Dr. ${test.appointment.doctor.user.name}`
                        : "Direct Order"}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {format(new Date(test.updatedAt), "dd MMM yyyy, hh:mm a")}
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button size="sm" variant="outline" className="border-blue-200 text-blue-600 hover:bg-blue-50" asChild>
                        <Link href={`/dashboard/lab/print/${test.id}`}>
                          View Report
                        </Link>
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
