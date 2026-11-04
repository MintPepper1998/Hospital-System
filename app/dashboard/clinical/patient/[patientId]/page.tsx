import { notFound } from "next/navigation"
import { getPatientHistory } from "@/lib/actions"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import {
  ArrowLeft,
  Calendar,
  Users,
  Activity,
  Stethoscope,
  Pill,
  FlaskConical,
  User,
  Phone,
  MapPin,
  Droplet,
  Clock,
  CheckCircle2,
  XCircle,
  AlertCircle,
  CalendarPlus,
} from "lucide-react"
import Link from "next/link"
import { format, differenceInYears } from "date-fns"

interface PatientHistoryPageProps {
  params: Promise<{
    patientId: string
  }>
}

export default async function PatientHistoryPage({ params }: PatientHistoryPageProps) {
  const { patientId } = await params

  // Fetch comprehensive patient history
  const result = await getPatientHistory(patientId)

  if (!result.success || !result.data) {
    notFound()
  }

  const { patient, stats, appointments, prescriptionHistory, labRequests } = result.data

  // Calculate patient age
  const age = patient.dateOfBirth
    ? differenceInYears(new Date(), new Date(patient.dateOfBirth))
    : null

  // Get patient name (handle both direct field and user relation)
  const patientName = (patient as any).name || (patient as any).user?.name || 'Patient'
  const patientEmail = (patient as any).email || (patient as any).user?.email || ''

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="icon" asChild>
            <Link href="/dashboard/clinical/opd">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div>
            <h2 className="text-3xl font-bold tracking-tight text-[#0066CC]">
              Patient History
            </h2>
            <p className="text-muted-foreground mt-1">
              Complete medical history and records
            </p>
          </div>
        </div>
        <Button className="bg-green-600 hover:bg-green-700" asChild>
          <Link href={`/dashboard/clinical/opd?bookPatient=${patientId}`}>
            <CalendarPlus className="mr-2 h-4 w-4" />
            Book Follow-up
          </Link>
        </Button>
      </div>

      {/* Patient Info Card */}
      <Card className="border-[#0066CC]/20">
        <CardHeader className="bg-gradient-to-r from-[#0066CC]/5 to-transparent">
          <div className="flex items-start justify-between">
            <div className="space-y-2">
              <CardTitle className="text-2xl flex items-center gap-3">
                <User className="h-6 w-6 text-[#0066CC]" />
                {patientName}
                {patient.gender && (
                  <Badge variant="outline" className="ml-2">
                    {patient.gender}
                  </Badge>
                )}
              </CardTitle>
              <CardDescription className="flex items-center gap-6 text-base">
                <span className="flex items-center gap-2">
                  <strong>PID:</strong> {patient.patientId}
                </span>
                {age && (
                  <span className="flex items-center gap-2">
                    <strong>Age:</strong> {age} years
                  </span>
                )}
                {patient.bloodGroup && (
                  <span className="flex items-center gap-2">
                    <Droplet className="h-4 w-4 text-red-500" />
                    <strong>{patient.bloodGroup}</strong>
                  </span>
                )}
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {patient.phone && (
              <div className="flex items-center gap-2 text-sm">
                <Phone className="h-4 w-4 text-muted-foreground" />
                <span>{patient.phone}</span>
              </div>
            )}
            {patient.address && (
              <div className="flex items-center gap-2 text-sm col-span-2">
                <MapPin className="h-4 w-4 text-muted-foreground" />
                <span>
                  {patient.address}
                  {patient.city && `, ${patient.city}`}
                  {patient.state && `, ${patient.state}`}
                  {patient.pincode && ` - ${patient.pincode}`}
                </span>
              </div>
            )}
          </div>
          {patient.allergies && (
            <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-md">
              <p className="text-sm font-medium text-red-800">
                <AlertCircle className="inline h-4 w-4 mr-2" />
                Allergies: {patient.allergies}
              </p>
            </div>
          )}
          {patient.medicalHistory && (
            <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-md">
              <p className="text-sm">
                <strong>Medical History:</strong> {patient.medicalHistory}
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Visits</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-[#0066CC]">{stats.totalVisits}</div>
            <p className="text-xs text-muted-foreground mt-1">
              All appointments
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Doctors Seen</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-[#0066CC]">{stats.uniqueDoctors}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Different physicians
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Last Visit</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-lg font-bold text-[#0066CC]">
              {stats.lastVisit ? format(new Date(stats.lastVisit), "MMM dd, yyyy") : "Never"}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Most recent
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Lab Tests</CardTitle>
            <FlaskConical className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-[#0066CC]">{stats.totalLabTests}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {stats.completedLabTests} completed
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs for Timeline, Prescriptions, Labs */}
      <Tabs defaultValue="timeline" className="space-y-4">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="timeline">
            <Activity className="mr-2 h-4 w-4" />
            Visit Timeline
          </TabsTrigger>
          <TabsTrigger value="prescriptions">
            <Pill className="mr-2 h-4 w-4" />
            Prescription History
          </TabsTrigger>
          <TabsTrigger value="labs">
            <FlaskConical className="mr-2 h-4 w-4" />
            Lab History
          </TabsTrigger>
        </TabsList>

        {/* Timeline Tab */}
        <TabsContent value="timeline" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Visit Timeline</CardTitle>
              <CardDescription>
                Chronological history of all consultations and treatments
              </CardDescription>
            </CardHeader>
            <CardContent>
              {appointments.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">
                  No visit history available
                </p>
              ) : (
                <div className="space-y-6">
                  {appointments.map((apt, index) => (
                    <div
                      key={apt.id}
                      className={`relative pl-8 pb-6 ${
                        index !== appointments.length - 1 ? 'border-l-2 border-muted' : ''
                      }`}
                    >
                      {/* Timeline dot */}
                      <div className="absolute left-0 top-0 -ml-[9px] h-4 w-4 rounded-full bg-[#0066CC] border-4 border-background" />

                      <Card className="hover:shadow-md transition-shadow">
                        <CardHeader className="pb-3">
                          <div className="flex items-start justify-between">
                            <div className="space-y-1">
                              <CardTitle className="text-lg flex items-center gap-2">
                                <Calendar className="h-4 w-4 text-[#0066CC]" />
                                {format(new Date(apt.appointmentDate), "MMMM dd, yyyy")}
                                <Badge
                                  variant={
                                    apt.status === 'COMPLETED'
                                      ? 'default'
                                      : apt.status === 'CANCELLED'
                                      ? 'destructive'
                                      : 'secondary'
                                  }
                                  className="ml-2"
                                >
                                  {apt.status}
                                </Badge>
                              </CardTitle>
                              <CardDescription className="flex items-center gap-2">
                                <Stethoscope className="h-3 w-3" />
                                Dr. {(apt.doctor as any)?.user?.name || (apt.doctor as any)?.name || 'Doctor'}
                              </CardDescription>
                            </div>
                            {apt.billings && apt.billings.length > 0 && (
                              <Badge variant="outline" className="text-green-600">
                                ₹{apt.billings.reduce((sum: number, b: any) => sum + (b.netAmount || 0), 0).toFixed(2)}
                              </Badge>
                            )}
                          </div>
                        </CardHeader>
                        <CardContent className="space-y-3">
                          {/* Vitals */}
                          {(apt.pulse || apt.temperature || apt.bloodPressure || apt.weight) && (
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 p-3 bg-muted/50 rounded-md">
                              {apt.pulse && (
                                <div className="text-sm">
                                  <span className="text-muted-foreground">Pulse:</span>{' '}
                                  <strong>{apt.pulse}</strong>
                                </div>
                              )}
                              {apt.temperature && (
                                <div className="text-sm">
                                  <span className="text-muted-foreground">Temp:</span>{' '}
                                  <strong>{apt.temperature}</strong>
                                </div>
                              )}
                              {apt.bloodPressure && (
                                <div className="text-sm">
                                  <span className="text-muted-foreground">BP:</span>{' '}
                                  <strong>{apt.bloodPressure}</strong>
                                </div>
                              )}
                              {apt.weight && (
                                <div className="text-sm">
                                  <span className="text-muted-foreground">Weight:</span>{' '}
                                  <strong>{apt.weight}</strong>
                                </div>
                              )}
                            </div>
                          )}

                          {/* Diagnosis */}
                          {apt.diagnosis && (
                            <div className="p-3 bg-orange-50 border border-orange-200 rounded-md">
                              <p className="text-sm font-semibold text-orange-900 mb-1">
                                Diagnosis:
                              </p>
                              <p className="text-sm text-orange-800">{apt.diagnosis}</p>
                            </div>
                          )}

                          {/* Prescription */}
                          {apt.prescription && (
                            <div className="p-3 bg-blue-50 border border-blue-200 rounded-md">
                              <p className="text-sm font-semibold text-blue-900 mb-1 flex items-center gap-2">
                                <Pill className="h-4 w-4" />
                                Prescription:
                              </p>
                              <p className="text-sm text-blue-800 whitespace-pre-wrap">
                                {apt.prescription}
                              </p>
                            </div>
                          )}

                          {/* Lab Tests */}
                          {apt.labRequests && apt.labRequests.length > 0 && (
                            <div className="p-3 bg-purple-50 border border-purple-200 rounded-md">
                              <p className="text-sm font-semibold text-purple-900 mb-2 flex items-center gap-2">
                                <FlaskConical className="h-4 w-4" />
                                Lab Tests Ordered ({apt.labRequests.length}):
                              </p>
                              <div className="space-y-1">
                                {apt.labRequests.map((lab) => (
                                  <div
                                    key={lab.id}
                                    className="flex items-center justify-between text-sm"
                                  >
                                    <span className="text-purple-800">
                                      • {lab.testName}
                                    </span>
                                    <Badge
                                      variant={
                                        lab.status === 'COMPLETED'
                                          ? 'default'
                                          : lab.status === 'PENDING_PAYMENT'
                                          ? 'destructive'
                                          : 'secondary'
                                      }
                                      className="text-xs"
                                    >
                                      {lab.status.replace(/_/g, ' ')}
                                    </Badge>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Notes */}
                          {apt.notes && (
                            <div className="text-sm text-muted-foreground italic">
                              <strong>Notes:</strong> {apt.notes}
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Prescription History Tab */}
        <TabsContent value="prescriptions">
          <Card>
            <CardHeader>
              <CardTitle>Prescription History</CardTitle>
              <CardDescription>
                All medicines prescribed across all consultations
              </CardDescription>
            </CardHeader>
            <CardContent>
              {prescriptionHistory.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">
                  No prescription history available
                </p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Doctor</TableHead>
                      <TableHead>Diagnosis</TableHead>
                      <TableHead>Medicines</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {prescriptionHistory.map((record) => (
                      <TableRow key={record.appointmentId}>
                        <TableCell className="font-medium">
                          {format(new Date(record.date), "MMM dd, yyyy")}
                        </TableCell>
                        <TableCell>Dr. {record.doctorName}</TableCell>
                        <TableCell>
                          {record.diagnosis ? (
                            <span className="text-orange-600 font-medium">
                              {record.diagnosis}
                            </span>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <p className="text-sm whitespace-pre-wrap max-w-md">
                            {record.medicines}
                          </p>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Lab History Tab */}
        <TabsContent value="labs">
          <Card>
            <CardHeader>
              <CardTitle>Laboratory Test History</CardTitle>
              <CardDescription>
                All lab investigations and their results
              </CardDescription>
            </CardHeader>
            <CardContent>
              {labRequests.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">
                  No lab test history available
                </p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Test Name</TableHead>
                      <TableHead>Price</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Result</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {labRequests.map((lab) => (
                      <TableRow key={lab.id}>
                        <TableCell className="font-medium">
                          {lab.appointment?.appointmentDate
                            ? format(new Date(lab.appointment.appointmentDate), "MMM dd, yyyy")
                            : format(new Date(lab.createdAt), "MMM dd, yyyy")}
                        </TableCell>
                        <TableCell>{lab.testName}</TableCell>
                        <TableCell>
                          <span className="text-muted-foreground text-sm">
                            ₹{lab.testPrice?.toFixed(2) || '-'}
                          </span>
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={
                              lab.status === 'COMPLETED'
                                ? 'default'
                                : lab.status === 'PENDING_PAYMENT'
                                ? 'destructive'
                                : 'secondary'
                            }
                          >
                            {lab.status === 'COMPLETED' && (
                              <CheckCircle2 className="mr-1 h-3 w-3" />
                            )}
                            {lab.status === 'PENDING_PAYMENT' && (
                              <XCircle className="mr-1 h-3 w-3" />
                            )}
                            {lab.status.replace(/_/g, ' ')}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {lab.results && lab.results.length > 0 ? (
                            <div className="space-y-1">
                              {lab.results.map((result) => (
                                <div key={result.id} className="text-sm">
                                  <strong>{result.resultValue}</strong>
                                  {result.unit && ` ${result.unit}`}
                                  {result.normalRange && (
                                    <span className="text-muted-foreground ml-2">
                                      (Normal: {result.normalRange})
                                    </span>
                                  )}
                                </div>
                              ))}
                            </div>
                          ) : (
                            <span className="text-muted-foreground">Pending</span>
                          )}
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
