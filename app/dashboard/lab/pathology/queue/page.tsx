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
import { Microscope, FlaskConical, Clock, User, AlertCircle, BedDouble, Stethoscope } from "lucide-react"
import Link from "next/link"
import { CollectSampleButton } from "@/components/lab/collect-sample-button"

export const dynamic = "force-dynamic"

interface PathologyQueuePageProps {
  searchParams: Promise<{
    q?: string
    filter?: string
    technician?: string
  }>
}

export default async function PathologyQueuePage({ searchParams }: PathologyQueuePageProps) {
  const params = await searchParams
  const q = (params?.q || "").trim().toLowerCase()
  const filter = params?.filter || "ALL"
  const technicianFilter = params?.technician || "ALL"
  // ==========================================
  // 1. Fetch OPD: PAID pathology tests ready for sample collection
  // ==========================================
  const opdQueue = await prisma.labRequest.findMany({
    where: {
      testType: "PATHOLOGY",
      status: "PAID_PENDING_SAMPLE",
    },
    include: {
      patient: {
        include: { user: true },
      },
      billing: true,
      appointment: {
        include: {
          doctor: {
            include: { user: true },
          },
        },
      },
    },
    orderBy: [
      { priority: "desc" },
      { createdAt: "asc" },
    ],
  })

  // ==========================================
  // 2. Fetch IPD: PENDING pathology lab requests
  // ==========================================
  const ipdQueue = await prisma.iPDLabRequest.findMany({
    where: {
      type: "PATHOLOGY",
      status: "PENDING",
    },
    include: {
      admission: {
        include: {
          patient: {
            include: { user: true },
          },
          primaryDoctor: {
            include: { user: true },
          },
          bed: {
            include: { ward: true },
          },
        },
      },
      emergencyVisit: {
        include: {
          patient: {
            include: { user: true },
          },
          assignedDoctor: {
            include: { user: true },
          },
          bed: {
            include: { ward: true },
          },
        },
      },
    },
    orderBy: [
      { isUrgent: "desc" },
      { createdAt: "asc" },
    ],
  })

  // ==========================================
  // 3. Fetch OPD processing + IPD IN_PROGRESS
  // ==========================================
  const opdProcessing = await prisma.labRequest.findMany({
    where: {
      testType: "PATHOLOGY",
      status: "SAMPLE_COLLECTED",
    },
    include: {
      patient: {
        include: { user: true },
      },
      results: true,
    },
    orderBy: { updatedAt: "desc" },
  })

  const ipdProcessing = await prisma.iPDLabRequest.findMany({
    where: {
      type: "PATHOLOGY",
      status: "IN_PROGRESS",
    },
    include: {
      admission: {
        include: {
          patient: {
            include: { user: true },
          },
          primaryDoctor: {
            include: { user: true },
          },
          bed: {
            include: { ward: true },
          },
        },
      },
      emergencyVisit: {
        include: {
          patient: {
            include: { user: true },
          },
          assignedDoctor: {
            include: { user: true },
          },
          bed: {
            include: { ward: true },
          },
        },
      },
    },
    orderBy: { updatedAt: "desc" },
  })

  // ==========================================
  // Build unified collection queue
  // ==========================================
  type CollectionItem = {
    id: string
    source: "OPD" | "IPD"
    patientName: string
    patientId: string
    testName: string
    doctorName: string
    priority: string
    isUrgent: boolean
    billInfo: string
    paidAt: string | null
    tokenOrBed: string
    notes: string | null
  }

  const collectionItems: CollectionItem[] = [
    ...opdQueue.map((req, idx) => ({
      id: req.id,
      source: "OPD" as const,
      patientName: req.patient.user.name || "Unknown",
      patientId: req.patient.patientId,
      testName: req.testName,
      doctorName: req.appointment?.doctor?.user?.name
        ? `Dr. ${req.appointment.doctor.user.name}`
        : "Direct Order",
      priority: req.priority,
      isUrgent: req.priority === "STAT" || req.priority === "URGENT",
      billInfo: `Bill: ${req.billing?.billNumber || "N/A"}`,
      paidAt: req.billing?.billDate
        ? format(new Date(req.billing.billDate), "hh:mm a")
        : null,
      tokenOrBed: `P-${String(idx + 1).padStart(3, "0")}`,
      notes: req.notes,
    })),
    ...ipdQueue.map((req) => ({
      id: req.id,
      source: "IPD" as const,
      patientName: (req.admission?.patient || req.emergencyVisit?.patient)?.user.name || "Unknown",
      patientId: (req.admission?.patient || req.emergencyVisit?.patient)?.patientId || "",
      testName: req.testName,
      doctorName: req.orderedByName
        ? `Dr. ${req.orderedByName}`
        : (req.admission?.primaryDoctor || req.emergencyVisit?.assignedDoctor)?.user.name
        ? `Dr. ${(req.admission?.primaryDoctor || req.emergencyVisit?.assignedDoctor)?.user.name}`
        : "Doctor",
      priority: req.isUrgent ? "URGENT" : "ROUTINE",
      isUrgent: req.isUrgent,
      billInfo: "IPD Credit",
      paidAt: format(new Date(req.createdAt), "hh:mm a"),
      tokenOrBed: `${(req.admission?.bed || req.emergencyVisit?.bed)?.ward.name || ""} - ${(req.admission?.bed || req.emergencyVisit?.bed)?.bedNumber || ""}`,
      notes: req.notes,
    })),
  ]

  // Sort: urgent first
  collectionItems.sort((a, b) => {
    const priorityOrder: Record<string, number> = { STAT: 0, URGENT: 1, ROUTINE: 2 }
    return (priorityOrder[a.priority] ?? 2) - (priorityOrder[b.priority] ?? 2)
  })

  // Build unified processing queue
  type ProcessingItem = {
    id: string
    source: "OPD" | "IPD"
    patientName: string
    patientId: string
    testName: string
    collectedAt: string
    tokenOrBed: string
    entryUrl: string
    technician: string
  }

  const processingItems: ProcessingItem[] = [
    ...opdProcessing.map((req) => ({
      id: req.id,
      source: "OPD" as const,
      patientName: req.patient.user.name || "Unknown",
      patientId: req.patient.patientId,
      testName: req.testName,
      collectedAt: format(new Date(req.updatedAt), "MMM dd, hh:mm a"),
      tokenOrBed: "OPD",
      entryUrl: `/dashboard/lab/entry/${req.id}`,
      technician: req.performedBy || "UNASSIGNED",
    })),
    ...ipdProcessing.map((req) => ({
      id: req.id,
      source: "IPD" as const,
      patientName: (req.admission?.patient || req.emergencyVisit?.patient)?.user.name || "Unknown",
      patientId: (req.admission?.patient || req.emergencyVisit?.patient)?.patientId || "",
      testName: req.testName,
      collectedAt: format(new Date(req.updatedAt), "MMM dd, hh:mm a"),
      tokenOrBed: `${(req.admission?.bed || req.emergencyVisit?.bed)?.ward.name || ""} - ${(req.admission?.bed || req.emergencyVisit?.bed)?.bedNumber || ""}`,
      entryUrl: `/dashboard/lab/entry/${req.id}`,
      technician: "IPD",
    })),
  ]

  const technicians = Array.from(new Set(processingItems.map((i) => i.technician)))

  let filteredCollectionItems = collectionItems
  let filteredProcessingItems = processingItems

  if (q) {
    filteredCollectionItems = filteredCollectionItems.filter((item) =>
      item.patientName.toLowerCase().includes(q) ||
      item.patientId.toLowerCase().includes(q) ||
      item.testName.toLowerCase().includes(q) ||
      item.id.toLowerCase().includes(q)
    )
    filteredProcessingItems = filteredProcessingItems.filter((item) =>
      item.patientName.toLowerCase().includes(q) ||
      item.patientId.toLowerCase().includes(q) ||
      item.testName.toLowerCase().includes(q) ||
      item.id.toLowerCase().includes(q)
    )
  }

  if (filter === "PENDING_COLLECTION") filteredProcessingItems = []
  if (filter === "PENDING_RESULT") filteredCollectionItems = []
  if (filter === "CRITICAL") {
    filteredCollectionItems = filteredCollectionItems.filter((i) => i.isUrgent)
    filteredProcessingItems = filteredProcessingItems.filter(() => true)
  }
  if (technicianFilter !== "ALL") {
    filteredProcessingItems = filteredProcessingItems.filter((i) => i.technician === technicianFilter)
  }

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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-blue-600 flex items-center gap-2">
            <Microscope className="h-8 w-8" />
            Pathology Queue
          </h2>
          <p className="text-muted-foreground mt-1">
            Blood tests, urine tests, and other pathology investigations
          </p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
            {opdQueue.length} OPD
          </Badge>
          <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200">
            {ipdQueue.length} IPD
          </Badge>
          <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200">
            {collectionItems.length} awaiting sample
          </Badge>
          <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
            {processingItems.length} processing
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

      {/* ================================ */}
      {/* Sample Collection Queue */}
      {/* ================================ */}
      <Card className="border-t-4 border-t-blue-500">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FlaskConical className="h-5 w-5 text-blue-600" />
            Sample Collection Queue
          </CardTitle>
          <CardDescription>
            OPD tests (paid) and IPD tests (post-paid/credit) ready for sample collection
          </CardDescription>
        </CardHeader>
        <CardContent>
          {collectionItems.length === 0 ? (
            <div className="text-center py-10 text-muted-foreground">
              <Microscope className="h-12 w-12 mx-auto mb-2 opacity-50" />
              <p>No pending samples</p>
              <p className="text-xs">OPD tests appear after payment. IPD tests appear when ordered.</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead className="w-16">Type</TableHead>
                  <TableHead className="w-32">Token / Bed</TableHead>
                  <TableHead>Patient</TableHead>
                  <TableHead>Test</TableHead>
                  <TableHead>Ordered By</TableHead>
                  <TableHead>Priority</TableHead>
                  <TableHead>Bill Status</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
              {filteredCollectionItems.map((item) => (
                  <TableRow
                    key={`${item.source}-${item.id}`}
                    className={
                      item.priority === "STAT"
                        ? "bg-red-50"
                        : item.priority === "URGENT"
                        ? "bg-orange-50"
                        : ""
                    }
                  >
                    <TableCell>
                      {item.source === "OPD" ? (
                        <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-100 text-xs">
                          <Stethoscope className="h-3 w-3 mr-1" />
                          OPD
                        </Badge>
                      ) : (
                        <Badge className="bg-purple-100 text-purple-800 hover:bg-purple-100 text-xs">
                          <BedDouble className="h-3 w-3 mr-1" />
                          IPD
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="font-mono font-semibold text-sm">
                      {item.tokenOrBed}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <div
                          className={`h-8 w-8 rounded-full flex items-center justify-center ${
                            item.source === "IPD" ? "bg-purple-100" : "bg-blue-100"
                          }`}
                        >
                          <User className={`h-4 w-4 ${item.source === "IPD" ? "text-purple-600" : "text-blue-600"}`} />
                        </div>
                        <div>
                          <p className="font-medium">{item.patientName}</p>
                          <p className="text-xs text-muted-foreground">{item.patientId}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <p className="font-medium">{item.testName}</p>
                      {item.notes && (
                        <p className="text-xs text-muted-foreground">{item.notes}</p>
                      )}
                    </TableCell>
                    <TableCell className="text-sm">{item.doctorName}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className={getPriorityColor(item.priority)}>
                        {item.isUrgent && <AlertCircle className="h-3 w-3 mr-1" />}
                        {item.priority}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {item.source === "IPD" ? (
                        <Badge className="bg-purple-50 text-purple-700 border border-purple-200 text-xs">
                          IPD Credit
                        </Badge>
                      ) : (
                        <div>
                          <p className="text-xs text-muted-foreground">{item.billInfo}</p>
                          {item.paidAt && (
                            <p className="text-xs text-muted-foreground">{item.paidAt}</p>
                          )}
                        </div>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <CollectSampleButton
                        requestId={item.id}
                        testName={item.testName}
                        isIPD={item.source === "IPD"}
                      />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* ================================ */}
      {/* Processing Queue */}
      {/* ================================ */}
      {filteredProcessingItems.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-orange-600" />
              Processing (Sample Collected)
            </CardTitle>
            <CardDescription>
              Samples collected, awaiting results entry
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead className="w-16">Type</TableHead>
                  <TableHead className="w-32">Location</TableHead>
                  <TableHead>Patient</TableHead>
                  <TableHead>Test</TableHead>
                  <TableHead>Sample Collected</TableHead>
                  <TableHead>Technician</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredProcessingItems.map((item) => (
                  <TableRow key={`${item.source}-${item.id}`}>
                    <TableCell>
                      {item.source === "OPD" ? (
                        <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-100 text-xs">OPD</Badge>
                      ) : (
                        <Badge className="bg-purple-100 text-purple-800 hover:bg-purple-100 text-xs">IPD</Badge>
                      )}
                    </TableCell>
                    <TableCell className="font-mono text-sm">{item.tokenOrBed}</TableCell>
                    <TableCell>
                      <p className="font-medium">{item.patientName}</p>
                      <p className="text-xs text-muted-foreground">{item.patientId}</p>
                    </TableCell>
                    <TableCell className="font-medium">{item.testName}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {item.collectedAt}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {item.technician}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button size="sm" className="bg-blue-600 hover:bg-blue-700" asChild>
                        <Link href={item.entryUrl}>
                          Enter Results
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
