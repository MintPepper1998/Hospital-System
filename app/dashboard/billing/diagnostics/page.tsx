"use client"

import { useState, useTransition, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
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
import {
  Search,
  User,
  CreditCard,
  Loader2,
  CheckCircle,
  Microscope,
  Radiation,
  Receipt,
  AlertCircle,
  Users,
  RefreshCw,
} from "lucide-react"
import { toast } from "sonner"
import { useRouter } from "next/navigation"
import {
  searchPatientsForDiagnostics,
  getPendingDiagnostics,
  confirmDiagnosticPayment,
  getAllPatientsWithPendingDiagnostics,
} from "@/lib/actions/diagnostics"
import { format } from "date-fns"

interface Patient {
  id: string
  patientId: string
  name: string
  phone: string | null
  pendingTestCount: number
}

interface LabRequest {
  id: string
  testName: string
  testPrice: number
  testType: "PATHOLOGY" | "RADIOLOGY"
  priority: string
  createdAt: string
  appointment?: {
    doctor?: {
      user?: {
        name: string
      }
    }
  }
}

export default function DiagnosticBillingPage() {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  // Queue of all patients with pending tests
  const [pendingQueue, setPendingQueue] = useState<Patient[]>([])
  const [loadingQueue, setLoadingQueue] = useState(true)

  // Search state
  const [searchTerm, setSearchTerm] = useState("")
  const [searchResults, setSearchResults] = useState<Patient[]>([])
  const [isSearching, setIsSearching] = useState(false)

  // Selected patient state
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null)
  const [pendingTests, setPendingTests] = useState<LabRequest[]>([])
  const [loadingTests, setLoadingTests] = useState(false)

  // Payment state
  const [paymentMethod, setPaymentMethod] = useState("CASH")
  const [transactionId, setTransactionId] = useState("")
  const [discount, setDiscount] = useState(0)

  // Load queue on mount
  useEffect(() => {
    loadPendingQueue()
  }, [])

  const loadPendingQueue = async () => {
    setLoadingQueue(true)
    const result = await getAllPatientsWithPendingDiagnostics()
    if (result.success && result.data) {
      setPendingQueue(result.data)
    }
    setLoadingQueue(false)
  }

  // Search patients
  const handleSearch = async (term: string) => {
    setSearchTerm(term)
    if (term.length < 2) {
      setSearchResults([])
      return
    }

    setIsSearching(true)
    const result = await searchPatientsForDiagnostics(term)
    if (result.success && result.data) {
      setSearchResults(result.data as any)
    }
    setIsSearching(false)
  }

  // Select patient
  const handleSelectPatient = async (patient: Patient) => {
    setSelectedPatient(patient)
    setSearchResults([])
    setSearchTerm("")
    setLoadingTests(true)

    const result = await getPendingDiagnostics(patient.id)
    if (result.success && result.data) {
      setPendingTests(result.data as unknown as LabRequest[])
    }
    setLoadingTests(false)
  }

  // Calculate totals
  const pathologyTests = pendingTests.filter((t) => t.testType === "PATHOLOGY")
  const radiologyTests = pendingTests.filter((t) => t.testType === "RADIOLOGY")
  const subtotal = pendingTests.reduce((sum, t) => sum + t.testPrice, 0)
  const netAmount = subtotal - discount

  // Confirm payment
  const handleConfirmPayment = async () => {
    if (!selectedPatient || pendingTests.length === 0) {
      toast.error("No tests selected for payment")
      return
    }

    startTransition(async () => {
      const result = await confirmDiagnosticPayment({
        patientId: selectedPatient.id,
        labRequestIds: pendingTests.map((t) => t.id),
        paymentMethod,
        transactionId: transactionId || undefined,
        discount,
      })

      if (result.success) {
        toast.success(result.message)
        // Reset state
        setSelectedPatient(null)
        setPendingTests([])
        setDiscount(0)
        setTransactionId("")
        // Refresh queue
        loadPendingQueue()
        // Optionally navigate to invoice
        if (result.billingId) {
          router.push(`/dashboard/finance/billing/${result.billingId}`)
        }
      } else {
        toast.error(result.message)
      }
    })
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-[#0066CC] flex items-center gap-2">
            <Receipt className="h-8 w-8" />
            Diagnostic Billing
          </h2>
          <p className="text-muted-foreground mt-1">
            Collect payment for Pathology and Radiology tests
          </p>
        </div>
        <Button variant="outline" onClick={loadPendingQueue} disabled={loadingQueue}>
          <RefreshCw className={`h-4 w-4 mr-2 ${loadingQueue ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Patient Search & Queue */}
        <div className="lg:col-span-2 space-y-6">
          {/* Search Card */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Search className="h-5 w-5" />
                Search Patient
              </CardTitle>
              <CardDescription>
                Search by patient name, phone number, or patient ID
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="relative">
                <Input
                  placeholder="Enter patient name, phone, or ID..."
                  value={searchTerm}
                  onChange={(e) => handleSearch(e.target.value)}
                  className="pl-10"
                />
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                
                {/* Search Results Dropdown */}
                {searchResults.length > 0 && (
                  <div className="absolute z-50 w-full mt-1 bg-white border rounded-md shadow-lg max-h-64 overflow-y-auto">
                    {searchResults.map((patient) => (
                      <button
                        key={patient.id}
                        type="button"
                        className="w-full px-4 py-3 text-left hover:bg-muted/50 flex items-center justify-between"
                        onClick={() => handleSelectPatient(patient)}
                      >
                        <div className="flex items-center gap-3">
                          <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
                            <User className="h-5 w-5 text-blue-600" />
                          </div>
                          <div>
                            <p className="font-medium">{patient.name}</p>
                            <p className="text-xs text-muted-foreground">
                              {patient.patientId} | {patient.phone || "No phone"}
                            </p>
                          </div>
                        </div>
                        {patient.pendingTestCount > 0 ? (
                          <Badge className="bg-yellow-100 text-yellow-800">
                            {patient.pendingTestCount} pending test(s)
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-muted-foreground">
                            No pending tests
                          </Badge>
                        )}
                      </button>
                    ))}
                  </div>
                )}

                {isSearching && (
                  <div className="absolute z-50 w-full mt-1 bg-white border rounded-md shadow-lg p-4 text-center">
                    <Loader2 className="h-5 w-5 animate-spin mx-auto" />
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Pending Queue - Always visible */}
          {!selectedPatient && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5 text-yellow-600" />
                  Patients Awaiting Payment
                  {pendingQueue.length > 0 && (
                    <Badge className="bg-yellow-100 text-yellow-800 ml-2">
                      {pendingQueue.length}
                    </Badge>
                  )}
                </CardTitle>
                <CardDescription>
                  Click on a patient to collect diagnostic test payment
                </CardDescription>
              </CardHeader>
              <CardContent>
                {loadingQueue ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                  </div>
                ) : pendingQueue.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <CheckCircle className="h-12 w-12 mx-auto mb-2 text-green-500" />
                    <p className="font-medium text-green-600">All Clear!</p>
                    <p className="text-sm">No patients waiting for diagnostic payment</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {pendingQueue.map((patient, index) => (
                      <button
                        key={patient.id}
                        type="button"
                        className="w-full px-4 py-3 text-left hover:bg-muted/50 rounded-lg border flex items-center justify-between transition-colors"
                        onClick={() => handleSelectPatient(patient)}
                      >
                        <div className="flex items-center gap-3">
                          <div className="h-10 w-10 rounded-full bg-yellow-100 flex items-center justify-center text-yellow-800 font-bold">
                            {index + 1}
                          </div>
                          <div>
                            <p className="font-medium">{patient.name}</p>
                            <p className="text-xs text-muted-foreground">
                              {patient.patientId} | {patient.phone || "No phone"}
                            </p>
                          </div>
                        </div>
                        <Badge className="bg-yellow-100 text-yellow-800">
                          {patient.pendingTestCount} test(s) pending
                        </Badge>
                      </button>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Selected Patient & Tests */}
          {selectedPatient && (
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <User className="h-5 w-5 text-blue-600" />
                    {selectedPatient.name}
                  </CardTitle>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setSelectedPatient(null)
                      setPendingTests([])
                    }}
                  >
                    Change Patient
                  </Button>
                </div>
                <CardDescription>
                  Patient ID: {selectedPatient.patientId} | Phone: {selectedPatient.phone || "N/A"}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {loadingTests ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                  </div>
                ) : pendingTests.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <AlertCircle className="h-12 w-12 mx-auto mb-2 opacity-50" />
                    <p>No pending diagnostic tests found</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {/* Test Summary */}
                    <div className="flex gap-4">
                      {pathologyTests.length > 0 && (
                        <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                          <Microscope className="h-3 w-3 mr-1" />
                          {pathologyTests.length} Pathology
                        </Badge>
                      )}
                      {radiologyTests.length > 0 && (
                        <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200">
                          <Radiation className="h-3 w-3 mr-1" />
                          {radiologyTests.length} Radiology
                        </Badge>
                      )}
                    </div>

                    {/* Tests Table */}
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Type</TableHead>
                          <TableHead>Test Name</TableHead>
                          <TableHead>Ordered By</TableHead>
                          <TableHead>Priority</TableHead>
                          <TableHead className="text-right">Price</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {pendingTests.map((test) => (
                          <TableRow key={test.id}>
                            <TableCell>
                              {test.testType === "RADIOLOGY" ? (
                                <Badge className="bg-purple-100 text-purple-800">
                                  <Radiation className="h-3 w-3 mr-1" />
                                  Radiology
                                </Badge>
                              ) : (
                                <Badge className="bg-blue-100 text-blue-800">
                                  <Microscope className="h-3 w-3 mr-1" />
                                  Pathology
                                </Badge>
                              )}
                            </TableCell>
                            <TableCell className="font-medium">{test.testName}</TableCell>
                            <TableCell className="text-sm text-muted-foreground">
                              {test.appointment?.doctor?.user?.name
                                ? `Dr. ${test.appointment.doctor.user.name}`
                                : "Direct Order"}
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline">{test.priority}</Badge>
                            </TableCell>
                            <TableCell className="text-right font-semibold">
                              ₹{test.testPrice.toFixed(2)}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>

        {/* Right: Payment Panel */}
        <div className="lg:col-span-1">
          <Card className="sticky top-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CreditCard className="h-5 w-5 text-green-600" />
                Payment
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {pendingTests.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <CreditCard className="h-12 w-12 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">Select a patient to view pending tests</p>
                </div>
              ) : (
                <>
                  {/* Summary */}
                  <div className="space-y-2 text-sm">
                    {pathologyTests.length > 0 && (
                      <div className="flex justify-between">
                        <span className="flex items-center gap-1 text-blue-700">
                          <Microscope className="h-4 w-4" />
                          Pathology ({pathologyTests.length})
                        </span>
                        <span>₹{pathologyTests.reduce((s, t) => s + t.testPrice, 0).toFixed(2)}</span>
                      </div>
                    )}
                    {radiologyTests.length > 0 && (
                      <div className="flex justify-between">
                        <span className="flex items-center gap-1 text-purple-700">
                          <Radiation className="h-4 w-4" />
                          Radiology ({radiologyTests.length})
                        </span>
                        <span>₹{radiologyTests.reduce((s, t) => s + t.testPrice, 0).toFixed(2)}</span>
                      </div>
                    )}
                    <Separator />
                    <div className="flex justify-between font-medium">
                      <span>Subtotal</span>
                      <span>₹{subtotal.toFixed(2)}</span>
                    </div>
                  </div>

                  {/* Discount */}
                  <div className="space-y-2">
                    <Label htmlFor="discount">Discount (₹)</Label>
                    <Input
                      id="discount"
                      type="number"
                      min="0"
                      max={subtotal}
                      value={discount}
                      onChange={(e) => setDiscount(Math.min(parseFloat(e.target.value) || 0, subtotal))}
                    />
                  </div>

                  {discount > 0 && (
                    <div className="flex justify-between text-sm text-green-600">
                      <span>Discount</span>
                      <span>-₹{discount.toFixed(2)}</span>
                    </div>
                  )}

                  <Separator />

                  {/* Grand Total */}
                  <div className="flex justify-between text-lg font-bold">
                    <span>Total Due</span>
                    <span className="text-green-600">₹{netAmount.toFixed(2)}</span>
                  </div>

                  {/* Payment Method */}
                  <div className="space-y-2">
                    <Label>Payment Method</Label>
                    <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="CASH">💵 Cash</SelectItem>
                        <SelectItem value="UPI">📱 UPI</SelectItem>
                        <SelectItem value="CARD">💳 Card</SelectItem>
                        <SelectItem value="BANK_TRANSFER">🏦 Bank Transfer</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Transaction ID (for non-cash) */}
                  {paymentMethod !== "CASH" && (
                    <div className="space-y-2">
                      <Label htmlFor="transactionId">Transaction ID</Label>
                      <Input
                        id="transactionId"
                        placeholder="Enter transaction reference..."
                        value={transactionId}
                        onChange={(e) => setTransactionId(e.target.value)}
                      />
                    </div>
                  )}

                  {/* Confirm Button */}
                  <Button
                    className="w-full bg-green-600 hover:bg-green-700"
                    size="lg"
                    onClick={handleConfirmPayment}
                    disabled={isPending || pendingTests.length === 0}
                  >
                    {isPending ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Processing...
                      </>
                    ) : (
                      <>
                        <CheckCircle className="mr-2 h-4 w-4" />
                        Confirm Payment (₹{netAmount.toFixed(2)})
                      </>
                    )}
                  </Button>

                  <p className="text-xs text-muted-foreground text-center">
                    Tests will appear in lab queues after payment
                  </p>
                </>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
