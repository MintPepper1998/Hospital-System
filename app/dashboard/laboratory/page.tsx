import { prisma } from "@/lib/prisma"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { FlaskConical, Droplet, FileText, Clock, CheckCircle2 } from "lucide-react"
import { format } from "date-fns"
import { CollectSampleButton } from "@/components/lab/collect-sample-button"
import { EnterResultButton } from "@/components/lab/enter-result-button"

export default async function LaboratoryPage() {
  // Fetch lab requests for Sample Collection Queue (PAID_PENDING_SAMPLE or billed)
  // Note: Only showing PAID or billed tests to enforce billing rule
  const sampleQueue = await prisma.labRequest.findMany({
    where: {
      OR: [
        { status: 'PAID_PENDING_SAMPLE' },
        { status: 'PENDING_PAYMENT', billingId: { not: null } },
      ],
    },
    include: {
      patient: {
        include: {
          user: true,
        },
      },
      billing: true,
    },
    orderBy: {
      createdAt: 'asc', // FIFO queue
    },
  })

  console.log(`🔬 Lab Dashboard: Found ${sampleQueue.length} tests in Sample Collection Queue`)

  // Fetch lab requests for Processing (SAMPLE_COLLECTED)
  const processingQueue = await prisma.labRequest.findMany({
    where: {
      status: 'SAMPLE_COLLECTED',
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
      updatedAt: 'asc',
    },
  })

  // Fetch completed tests (for stats)
  const completedToday = await prisma.labRequest.count({
    where: {
      status: 'COMPLETED',
      updatedAt: {
        gte: new Date(new Date().setHours(0, 0, 0, 0)),
      },
    },
  })

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-3xl font-bold tracking-tight text-[#0066CC]">
          Laboratory & Diagnostics
        </h2>
        <p className="text-muted-foreground mt-1">
          Manage sample collection, testing, and result entry
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Awaiting Sample</CardTitle>
            <Droplet className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{sampleQueue.length}</div>
            <p className="text-xs text-muted-foreground">
              Paid tests waiting for collection
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">In Processing</CardTitle>
            <FlaskConical className="h-4 w-4 text-orange-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">{processingQueue.length}</div>
            <p className="text-xs text-muted-foreground">
              Samples collected, awaiting results
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Completed Today</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{completedToday}</div>
            <p className="text-xs text-muted-foreground">
              Tests completed and reported
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Main Tabs */}
      <Tabs defaultValue="queue" className="space-y-4">
        <TabsList>
          <TabsTrigger value="queue" className="gap-2">
            <Droplet className="h-4 w-4" />
            Sample Collection Queue
            {sampleQueue.length > 0 && (
              <Badge variant="destructive" className="ml-2">
                {sampleQueue.length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="processing" className="gap-2">
            <FlaskConical className="h-4 w-4" />
            Processing
            {processingQueue.length > 0 && (
              <Badge variant="secondary" className="ml-2">
                {processingQueue.length}
              </Badge>
            )}
          </TabsTrigger>
        </TabsList>

        {/* Sample Collection Queue Tab */}
        <TabsContent value="queue" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Droplet className="h-5 w-5 text-blue-600" />
                Sample Collection Queue
              </CardTitle>
              <CardDescription>
                These tests have been paid for. Collect samples to move them to processing.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {sampleQueue.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <Droplet className="h-12 w-12 mx-auto mb-4 opacity-20" />
                  <p className="text-lg font-medium">No samples pending collection</p>
                  <p className="text-sm mt-1">All paid tests have been collected</p>
                </div>
              ) : (
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-muted/50">
                        <TableHead>Patient</TableHead>
                        <TableHead>Test Name</TableHead>
                        <TableHead>Category</TableHead>
                        <TableHead>Paid On</TableHead>
                        <TableHead>Priority</TableHead>
                        <TableHead className="text-right">Action</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {sampleQueue.map((request) => (
                        <TableRow key={request.id}>
                          <TableCell>
                            <div>
                              <p className="font-medium">{request.patient.user.name}</p>
                              <p className="text-xs text-muted-foreground font-mono">
                                {request.patient.patientId}
                              </p>
                            </div>
                          </TableCell>
                          <TableCell>
                            <p className="font-medium">{request.testName}</p>
                            <p className="text-xs text-muted-foreground">
                              ₹{request.testPrice.toFixed(2)}
                            </p>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline">
                              {request.billing?.billNumber || 'N/A'}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1 text-sm">
                              <Clock className="h-3 w-3 text-muted-foreground" />
                              {request.billing?.billDate
                                ? format(new Date(request.billing.billDate), "MMM dd, hh:mm a")
                                : format(new Date(request.createdAt), "MMM dd, hh:mm a")}
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant={request.priority === 'URGENT' ? 'destructive' : 'secondary'}
                            >
                              {request.priority}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <CollectSampleButton requestId={request.id} testName={request.testName} />
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Processing Tab */}
        <TabsContent value="processing" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FlaskConical className="h-5 w-5 text-orange-600" />
                Processing - Enter Results
              </CardTitle>
              <CardDescription>
                Samples collected. Enter test results to complete.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {processingQueue.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <FlaskConical className="h-12 w-12 mx-auto mb-4 opacity-20" />
                  <p className="text-lg font-medium">No tests in processing</p>
                  <p className="text-sm mt-1">Collect samples to start processing</p>
                </div>
              ) : (
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-muted/50">
                        <TableHead>Patient</TableHead>
                        <TableHead>Test Name</TableHead>
                        <TableHead>Sample Collected</TableHead>
                        <TableHead>Priority</TableHead>
                        <TableHead className="text-right">Action</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {processingQueue.map((request) => (
                        <TableRow key={request.id}>
                          <TableCell>
                            <div>
                              <p className="font-medium">{request.patient.user.name}</p>
                              <p className="text-xs text-muted-foreground font-mono">
                                {request.patient.patientId}
                              </p>
                            </div>
                          </TableCell>
                          <TableCell>
                            <p className="font-medium">{request.testName}</p>
                            <p className="text-xs text-muted-foreground">
                              ₹{request.testPrice.toFixed(2)}
                            </p>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1 text-sm text-muted-foreground">
                              <CheckCircle2 className="h-3 w-3 text-green-600" />
                              {format(new Date(request.updatedAt), "MMM dd, hh:mm a")}
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant={request.priority === 'URGENT' ? 'destructive' : 'secondary'}
                            >
                              {request.priority}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <EnterResultButton request={request as any} />
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
