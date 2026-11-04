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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Microscope, FlaskConical, Clock, User, TestTube, AlertCircle, BedDouble, Stethoscope } from "lucide-react"
import Link from "next/link"
import { CollectSampleButton } from "@/components/lab/collect-sample-button"

export const dynamic = "force-dynamic"

export default async function LabQueuePage() {
  // ==========================================
  // 1. Fetch OPD: PAID pathology tests ready for sample collection
  // ==========================================
  const opdPendingCollection = await prisma.labRequest.findMany({
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
  const ipdPendingCollection = await prisma.iPDLabRequest.findMany({
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
  // 3. Fetch OPD: tests in processing (sample collected)
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
      appointment: {
        include: {
          doctor: {
            include: { user: true },
          },
        },
      },
    },
    orderBy: { updatedAt: "asc" },
  })

  // ==========================================
  // 4. Fetch IPD: tests in progress
  // ==========================================
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
    orderBy: { updatedAt: "asc" },
  })

  // ==========================================
  // 5. Build unified collection queue
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
    billStatus: string
    billTime: string | null
    tokenOrBed: string
    notes: string | null
    requestId: string
  }

  const collectionQueue: CollectionItem[] = [
    // OPD items
    ...opdPendingCollection.map((req, index) => ({
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
      billStatus: `Bill: ${req.billing?.billNumber || "N/A"}`,
      billTime: req.billing?.billDate
        ? format(new Date(req.billing.billDate), "hh:mm a")
        : null,
      tokenOrBed: `L-${String(index + 1).padStart(3, "0")}`,
      notes: req.notes,
      requestId: req.id,
    })),
    // IPD items
    ...ipdPendingCollection.map((req) => ({
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
      billStatus: "IPD Credit",
      billTime: format(new Date(req.createdAt), "hh:mm a"),
      tokenOrBed: `${(req.admission?.bed || req.emergencyVisit?.bed)?.ward.name || ""} - ${(req.admission?.bed || req.emergencyVisit?.bed)?.bedNumber || ""}`,
      notes: req.notes,
      requestId: req.id,
    })),
  ]

  // Sort: STAT/URGENT first, then by creation time
  collectionQueue.sort((a, b) => {
    const priorityOrder: Record<string, number> = { STAT: 0, URGENT: 1, ROUTINE: 2 }
    return (priorityOrder[a.priority] ?? 2) - (priorityOrder[b.priority] ?? 2)
  })

  // ==========================================
  // 6. Build unified processing queue
  // ==========================================
  type ProcessingItem = {
    id: string
    source: "OPD" | "IPD"
    patientName: string
    patientId: string
    testName: string
    doctorName: string
    collectedAt: string
    tokenOrBed: string
    entryUrl: string
  }

  const processingQueue: ProcessingItem[] = [
    // OPD
    ...opdProcessing.map((req) => ({
      id: req.id,
      source: "OPD" as const,
      patientName: req.patient.user.name || "Unknown",
      patientId: req.patient.patientId,
      testName: req.testName,
      doctorName: req.appointment?.doctor?.user?.name
        ? `Dr. ${req.appointment.doctor.user.name}`
        : "Direct Order",
      collectedAt: format(new Date(req.updatedAt), "dd MMM, hh:mm a"),
      tokenOrBed: "OPD",
      entryUrl: `/dashboard/lab/entry/${req.id}`,
    })),
    // IPD
    ...ipdProcessing.map((req) => ({
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
      collectedAt: format(new Date(req.updatedAt), "dd MMM, hh:mm a"),
      tokenOrBed: `${(req.admission?.bed || req.emergencyVisit?.bed)?.ward.name || ""} - ${(req.admission?.bed || req.emergencyVisit?.bed)?.bedNumber || ""}`,
      entryUrl: `/dashboard/lab/entry/${req.id}`, // TODO: IPD-specific entry page if needed
    })),
  ]

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

  const opdCollectionCount = opdPendingCollection.length
  const ipdCollectionCount = ipdPendingCollection.length
  const totalCollection = collectionQueue.length
  const totalProcessing = processingQueue.length

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-blue-600 flex items-center gap-2">
            <Microscope className="h-8 w-8" />
            Lab Queue
          </h2>
          <p className="text-muted-foreground mt-1">
            Manage sample collection and result entry for pathology tests
          </p>
        </div>
        <div className="flex gap-2">
          <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
            {opdCollectionCount} OPD
          </Badge>
          <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200">
            {ipdCollectionCount} IPD
          </Badge>
          <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200">
            <TestTube className="h-3 w-3 mr-1" />
            {totalCollection} pending
          </Badge>
          <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
            <Clock className="h-3 w-3 mr-1" />
            {totalProcessing} processing
          </Badge>
        </div>
      </div>

      {/* Tabs for different stages */}
      <Tabs defaultValue="collection" className="space-y-4">
        <TabsList className="grid w-full grid-cols-2 max-w-md">
          <TabsTrigger value="collection" className="flex items-center gap-2">
            <FlaskConical className="h-4 w-4" />
            Pending Collection
            {totalCollection > 0 && (
              <Badge variant="secondary" className="ml-1">{totalCollection}</Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="processing" className="flex items-center gap-2">
            <Clock className="h-4 w-4" />
            Processing
            {totalProcessing > 0 && (
              <Badge variant="secondary" className="ml-1">{totalProcessing}</Badge>
            )}
          </TabsTrigger>
        </TabsList>

        {/* ================================ */}
        {/* Pending Collection Tab */}
        {/* ================================ */}
        <TabsContent value="collection">
          <Card className="border-t-4 border-t-yellow-500">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FlaskConical className="h-5 w-5 text-yellow-600" />
                Sample Collection Queue
              </CardTitle>
              <CardDescription>
                OPD tests (paid) and IPD tests (post-paid/credit) ready for sample collection.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {collectionQueue.length === 0 ? (
                <div className="text-center py-10 text-muted-foreground">
                  <TestTube className="h-12 w-12 mx-auto mb-2 opacity-50" />
                  <p className="font-medium">No pending samples</p>
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
                    {collectionQueue.map((item) => (
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
                        {/* Source Type */}
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

                        {/* Token (OPD) / Bed (IPD) */}
                        <TableCell className="font-mono font-semibold text-sm">
                          {item.tokenOrBed}
                        </TableCell>

                        {/* Patient */}
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

                        {/* Test */}
                        <TableCell>
                          <p className="font-medium">{item.testName}</p>
                          {item.notes && (
                            <p className="text-xs text-muted-foreground">{item.notes}</p>
                          )}
                        </TableCell>

                        {/* Doctor */}
                        <TableCell className="text-sm">{item.doctorName}</TableCell>

                        {/* Priority */}
                        <TableCell>
                          <Badge variant="outline" className={getPriorityColor(item.priority)}>
                            {item.isUrgent && <AlertCircle className="h-3 w-3 mr-1" />}
                            {item.priority}
                          </Badge>
                        </TableCell>

                        {/* Bill Status */}
                        <TableCell>
                          {item.source === "IPD" ? (
                            <Badge className="bg-purple-50 text-purple-700 border border-purple-200 text-xs">
                              IPD Credit
                            </Badge>
                          ) : (
                            <div>
                              <p className="text-xs text-muted-foreground">{item.billStatus}</p>
                              {item.billTime && (
                                <p className="text-xs text-muted-foreground">{item.billTime}</p>
                              )}
                            </div>
                          )}
                        </TableCell>

                        {/* Action */}
                        <TableCell className="text-right">
                          <CollectSampleButton
                            requestId={item.requestId}
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
        </TabsContent>

        {/* ================================ */}
        {/* Processing Tab */}
        {/* ================================ */}
        <TabsContent value="processing">
          <Card className="border-t-4 border-t-blue-500">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5 text-blue-600" />
                Awaiting Results Entry
              </CardTitle>
              <CardDescription>
                Samples collected and ready for result entry. Click &quot;Enter Results&quot; to type findings.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {processingQueue.length === 0 ? (
                <div className="text-center py-10 text-muted-foreground">
                  <Clock className="h-12 w-12 mx-auto mb-2 opacity-50" />
                  <p className="font-medium">No tests in processing</p>
                  <p className="text-xs">Collect samples first, then they&apos;ll appear here</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/50">
                      <TableHead className="w-16">Type</TableHead>
                      <TableHead className="w-32">Location</TableHead>
                      <TableHead>Patient</TableHead>
                      <TableHead>Test Name</TableHead>
                      <TableHead>Ordered By</TableHead>
                      <TableHead>Sample Collected</TableHead>
                      <TableHead className="text-right">Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {processingQueue.map((item) => (
                      <TableRow key={`${item.source}-${item.id}`}>
                        <TableCell>
                          {item.source === "OPD" ? (
                            <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-100 text-xs">OPD</Badge>
                          ) : (
                            <Badge className="bg-purple-100 text-purple-800 hover:bg-purple-100 text-xs">IPD</Badge>
                          )}
                        </TableCell>
                        <TableCell className="font-mono text-sm">
                          {item.tokenOrBed}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center">
                              <User className="h-4 w-4 text-blue-600" />
                            </div>
                            <div>
                              <p className="font-medium">{item.patientName}</p>
                              <p className="text-xs text-muted-foreground">{item.patientId}</p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="font-medium">{item.testName}</TableCell>
                        <TableCell className="text-sm">{item.doctorName}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {item.collectedAt}
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
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
