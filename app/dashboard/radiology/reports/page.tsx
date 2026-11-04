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
import { Radiation, FileText, User, CheckCircle, Clock } from "lucide-react"
import Link from "next/link"

export const dynamic = "force-dynamic"

export default async function RadiologyReportsPage() {
  // Fetch completed radiology tests with results
  const completedTests = await prisma.labRequest.findMany({
    where: {
      testType: "RADIOLOGY",
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
          <h2 className="text-3xl font-bold tracking-tight text-purple-600 flex items-center gap-2">
            <FileText className="h-8 w-8" />
            Radiology Reports
          </h2>
          <p className="text-muted-foreground mt-1">
            View and manage completed radiology reports
          </p>
        </div>
        <div className="flex gap-2">
          <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
            <CheckCircle className="h-3 w-3 mr-1" />
            {todayCount} completed today
          </Badge>
          <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200">
            {completedTests.length} total reports
          </Badge>
        </div>
      </div>

      {/* Reports Table */}
      <Card className="border-t-4 border-t-purple-500">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Radiation className="h-5 w-5 text-purple-600" />
            Completed Reports
          </CardTitle>
          <CardDescription>
            Recent radiology reports with findings
          </CardDescription>
        </CardHeader>
        <CardContent>
          {completedTests.length === 0 ? (
            <div className="text-center py-10 text-muted-foreground">
              <FileText className="h-12 w-12 mx-auto mb-2 opacity-50" />
              <p>No completed reports yet</p>
              <p className="text-xs">Completed radiology reports will appear here</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead>Patient</TableHead>
                  <TableHead>Investigation</TableHead>
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
                        <div className="h-8 w-8 rounded-full bg-purple-100 flex items-center justify-center">
                          <User className="h-4 w-4 text-purple-600" />
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
                      <Button size="sm" variant="outline" className="border-purple-200 text-purple-600 hover:bg-purple-50" asChild>
                        <Link href={`/dashboard/radiology/print/${test.id}`}>
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
