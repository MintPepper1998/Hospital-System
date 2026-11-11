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
import { Radiation, ScanLine, Clock, User, CheckCircle } from "lucide-react"
import Link from "next/link"
import { CollectSampleButton } from "@/components/lab/collect-sample-button"

export const dynamic = "force-dynamic"

interface RadiologyQueueProps {
  searchParams: Promise<{
    q?: string
    filter?: string
    technician?: string
  }>
}

export default async function RadiologyQueuePage({ searchParams }: RadiologyQueueProps) {
  const params = await searchParams
  const q = (params?.q || "").trim().toLowerCase()
  const filter = params?.filter || "ALL"
  const technicianFilter = params?.technician || "ALL"

  // ── OPD: Fetch PAID radiology tests ready for imaging (status = PAID_PENDING_SAMPLE or billed) ──
  const radiologyQueueRaw = await prisma.labRequest.findMany({
    where: {
      testType: "RADIOLOGY",
      OR: [
        { status: "PAID_PENDING_SAMPLE" },
        { status: "PENDING_PAYMENT", billingId: { not: null } },
      ],
    },
    include: {
      patient: {
        include: {
          user: true,
        },
      },
      billing: true,
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
    orderBy: [
      { priority: "desc" },
      { createdAt: "asc" },
    ],
  })

  // ── IPD: Fetch radiology requests ordered from IPD ──
  const ipdRadiologyRaw = await prisma.iPDLabRequest.findMany({
    where: {
      type: "RADIOLOGY",
      status: "PENDING",
    },
    include: {
      admission: {
        include: {
          patient: {
            include: {
              user: true,
            },
          },
        },
      },
      emergencyVisit: {
        include: {
          patient: {
            include: {
              user: true,
            },
          },
        },
      },
    },
    orderBy: [
      { isUrgent: "desc" },
      { createdAt: "asc" },
    ],
  })

  // ── Normalize IPD records to match OPD shape for unified rendering ──
  type QueueItem = {
    id: string
    patientName: string
    patientId: string
    testName: string
    doctorName: string
    priority: string
    createdAt: Date
    billNumber: string | null
    isIPD: boolean
    source: "OPD" | "IPD"
    notes: string | null
  }

  const opdQueue: QueueItem[] = radiologyQueueRaw.map((r) => ({
    id: r.id,
    patientName: r.patient.user.name || "Unknown",
    patientId: r.patient.patientId,
    testName: r.testName,
    doctorName: r.appointment?.doctor?.user?.name ? `Dr. ${r.appointment.doctor.user.name}` : "Direct Order",
    priority: r.priority,
    createdAt: r.createdAt,
    billNumber: r.billing?.billNumber || null,
    isIPD: false,
    source: "OPD" as const,
    notes: r.notes,
  }))

  const ipdQueue: QueueItem[] = ipdRadiologyRaw.map((r) => ({
    id: r.id,
    patientName: (r.admission?.patient || r.emergencyVisit?.patient)?.user.name || "Unknown",
    patientId: (r.admission?.patient || r.emergencyVisit?.patient)?.patientId || "Unknown",
    testName: r.testName,
    doctorName: r.orderedByName ? `Dr. ${r.orderedByName}` : "IPD Doctor",
    priority: r.isUrgent ? "URGENT" : "ROUTINE",
    createdAt: r.createdAt,
    billNumber: null,
    isIPD: true,
    source: "IPD" as const,
    notes: r.notes,
  }))

  // ── OPD: Processing queue (scan done, awaiting report) ──
  const processingQueueRaw = await prisma.labRequest.findMany({
    where: {
      testType: "RADIOLOGY",
      status: "SAMPLE_COLLECTED",
    },
    include: {
      patient: {
        include: {
          user: true,
        },
      },
      results: true,
    },
    orderBy: {
      updatedAt: "desc",
    },
  })

  // ── IPD: Processing queue (IN_PROGRESS = scan done, awaiting report) ──
  const ipdProcessingRaw = await prisma.iPDLabRequest.findMany({
    where: {
      type: "RADIOLOGY",
      status: "IN_PROGRESS",
    },
    include: {
      admission: {
        include: {
          patient: {
            include: {
              user: true,
            },
          },
        },
      },
      emergencyVisit: {
        include: {
          patient: {
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
  })

  type ProcessingItem = {
    id: string
    patientName: string
    patientId: string
    testName: string
    updatedAt: Date
    performedBy: string
    isIPD: boolean
    source: "OPD" | "IPD"
  }

  const opdProcessing: ProcessingItem[] = processingQueueRaw.map((r) => ({
    id: r.id,
    patientName: r.patient.user.name || "Unknown",
    patientId: r.patient.patientId,
    testName: r.testName,
    updatedAt: r.updatedAt,
    performedBy: r.performedBy || "UNASSIGNED",
    isIPD: false,
    source: "OPD" as const,
  }))

  const ipdProcessing: ProcessingItem[] = ipdProcessingRaw.map((r) => ({
    id: r.id,
    patientName: (r.admission?.patient || r.emergencyVisit?.patient)?.user.name || "Unknown",
    patientId: (r.admission?.patient || r.emergencyVisit?.patient)?.patientId || "Unknown",
    testName: r.testName,
    updatedAt: r.updatedAt,
    performedBy: "UNASSIGNED",
    isIPD: true,
    source: "IPD" as const,
  }))

  // Completed today counts (OPD + IPD)
  const startOfToday = new Date()
  startOfToday.setHours(0, 0, 0, 0)
  
  const [completedTodayOPD, completedTodayIPD] = await Promise.all([
    prisma.labRequest.count({
      where: {
        testType: "RADIOLOGY",
        status: "COMPLETED",
        updatedAt: { gte: startOfToday }
      }
    }),
    prisma.iPDLabRequest.count({
      where: {
        type: "RADIOLOGY",
        status: "COMPLETED",
        completedAt: { gte: startOfToday }
      }
    })
  ])
  const completedToday = completedTodayOPD + completedTodayIPD

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "STAT":
        return "bg-red-100 text-red-800 border-red-200"
      case "URGENT":
        return "bg-orange-100 text-orange-800 border-orange-200"
      default:
        return "bg-gray-100 text-gray-800 border-gray-200"
    }
  }

  // Merge queues
  let mergedPendingQueue = [...opdQueue, ...ipdQueue]
  let mergedProcessingQueue = [...opdProcessing, ...ipdProcessing]

  const technicians = Array.from(
    new Set(mergedProcessingQueue.map((r) => r.performedBy))
  )

  // Apply filters
  if (q) {
    mergedPendingQueue = mergedPendingQueue.filter((r) =>
      r.patientName.toLowerCase().includes(q) ||
      r.patientId.toLowerCase().includes(q) ||
      r.testName.toLowerCase().includes(q) ||
      r.id.toLowerCase().includes(q)
    )
    mergedProcessingQueue = mergedProcessingQueue.filter((r) =>
      r.patientName.toLowerCase().includes(q) ||
      r.patientId.toLowerCase().includes(q) ||
      r.testName.toLowerCase().includes(q) ||
      r.id.toLowerCase().includes(q)
    )
  }

  if (filter === "PENDING_COLLECTION") mergedProcessingQueue = []
  if (filter === "PENDING_RESULT") mergedPendingQueue = []
  if (filter === "CRITICAL") mergedPendingQueue = mergedPendingQueue.filter((r) => r.priority === "STAT" || r.priority === "URGENT")
  if (technicianFilter !== "ALL") {
    mergedProcessingQueue = mergedProcessingQueue.filter(
      (r) => r.performedBy === technicianFilter
    )
  }

  // Alias for template
  const radiologyQueue = mergedPendingQueue
  const processingQueue = mergedProcessingQueue

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-purple-600 flex items-center gap-2">
            <Radiation className="h-8 w-8" />
            Radiology Queue
          </h2>
          <p className="text-muted-foreground mt-1">
            X-Ray, CT Scan, MRI, Ultrasound, and other imaging investigations
          </p>
        </div>
        <div className="flex gap-2">
          <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200">
            {radiologyQueue.length} awaiting scan
          </Badge>
          <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200">
            {processingQueue.length} awaiting report
          </Badge>
          <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
            <CheckCircle className="h-3 w-3 mr-1" />
            {completedToday} done today
          </Badge>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <form method="GET" className="grid grid-cols-1 md:grid-cols-4 gap-3 items-end">
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Search</label>
              <input name="q" defaultValue={q} className="h-10 w-full rounded-md border px-3 text-sm" placeholder="patient / test / requisition" />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Filter</label>
              <select name="filter" defaultValue={filter} className="h-10 w-full rounded-md border px-3 text-sm">
                <option value="ALL">All</option>
                <option value="PENDING_COLLECTION">Pending Collection</option>
                <option value="PENDING_RESULT">Pending Result</option>
                <option value="CRITICAL">Critical</option>
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Technician</label>
              <select name="technician" defaultValue={technicianFilter} className="h-10 w-full rounded-md border px-3 text-sm">
                <option value="ALL">All</option>
                {technicians.map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </div>
            <div>
              <Button type="submit">Apply</Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="border-l-4 border-l-yellow-500">
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Pending Scans</p>
                <p className="text-2xl font-bold text-yellow-600">{radiologyQueue.length}</p>
              </div>
              <ScanLine className="h-8 w-8 text-yellow-500 opacity-70" />
            </div>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-purple-500">
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Awaiting Reports</p>
                <p className="text-2xl font-bold text-purple-600">{processingQueue.length}</p>
              </div>
              <Clock className="h-8 w-8 text-purple-500 opacity-70" />
            </div>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-green-500">
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Completed Today</p>
                <p className="text-2xl font-bold text-green-600">{completedToday}</p>
              </div>
              <CheckCircle className="h-8 w-8 text-green-500 opacity-70" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Imaging Queue */}
      <Card className="border-t-4 border-t-purple-500">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ScanLine className="h-5 w-5 text-purple-600" />
            Imaging Queue (Ready for Scan)
          </CardTitle>
          <CardDescription>
            OPD tests (after payment) and IPD tests (doctor-ordered) ready for imaging
          </CardDescription>
        </CardHeader>
        <CardContent>
          {radiologyQueue.length === 0 ? (
            <div className="text-center py-10 text-muted-foreground">
              <Radiation className="h-12 w-12 mx-auto mb-2 opacity-50" />
              <p>No pending scans</p>
              <p className="text-xs">Tests will appear here from OPD billing or IPD doctor orders</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead className="w-16">Token</TableHead>
                  <TableHead>Patient</TableHead>
                  <TableHead>Test Name</TableHead>
                  <TableHead>Doctor</TableHead>
                  <TableHead>Source</TableHead>
                  <TableHead>Priority</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {radiologyQueue.map((request, index) => (
                  <TableRow key={request.id} className={request.priority === "STAT" ? "bg-red-50" : ""}>
                    <TableCell className="font-mono font-bold text-purple-600">
                      R-{String(index + 1).padStart(3, "0")}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <div className={`h-8 w-8 rounded-full flex items-center justify-center ${request.isIPD ? 'bg-blue-100' : 'bg-purple-100'}`}>
                          <User className={`h-4 w-4 ${request.isIPD ? 'text-blue-600' : 'text-purple-600'}`} />
                        </div>
                        <div>
                          <p className="font-medium">{request.patientName}</p>
                          <p className="text-xs text-muted-foreground">{request.patientId}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <p className="font-medium">{request.testName}</p>
                      {request.billNumber && (
                        <p className="text-xs text-muted-foreground">
                          Bill: {request.billNumber}
                        </p>
                      )}
                      {request.notes && (
                        <p className="text-xs text-orange-600">{request.notes}</p>
                      )}
                    </TableCell>
                    <TableCell className="text-sm">
                      {request.doctorName}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className={request.isIPD ? 'bg-blue-50 text-blue-700 border-blue-200' : 'bg-gray-50 text-gray-600 border-gray-200'}>
                        {request.source}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className={getPriorityColor(request.priority)}>
                        {request.priority}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {format(new Date(request.createdAt), "dd MMM yyyy")}
                    </TableCell>
                    <TableCell className="text-right">
                      <CollectSampleButton 
                        requestId={request.id} 
                        testName={request.testName}
                        buttonText="Mark Scan Done"
                        isRadiology
                        isIPD={request.isIPD}
                      />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Processing Queue (Awaiting Report) */}
      {processingQueue.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-orange-600" />
              Awaiting Report
            </CardTitle>
            <CardDescription>
              Imaging completed, awaiting radiologist report
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead>Patient</TableHead>
                  <TableHead>Investigation</TableHead>
                  <TableHead>Scan Completed</TableHead>
                  <TableHead>Technician</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {processingQueue.map((request) => (
                  <TableRow key={request.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <p className="font-medium">{request.patientName}</p>
                        {request.isIPD && <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 text-[10px]">IPD</Badge>}
                      </div>
                      <p className="text-xs text-muted-foreground">{request.patientId}</p>
                    </TableCell>
                    <TableCell className="font-medium">{request.testName}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {format(new Date(request.updatedAt), "MMM dd, hh:mm a")}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {request.performedBy}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button size="sm" className="bg-purple-600 hover:bg-purple-700" asChild>
                        <Link href={`/dashboard/radiology/entry/${request.id}`}>
                          Enter Report
                        </Link>
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
