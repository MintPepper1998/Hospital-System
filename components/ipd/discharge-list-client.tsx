"use client"

import { useState, useTransition } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { format } from "date-fns"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Separator } from "@/components/ui/separator"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  AlertTriangle,
  Bed,
  Calendar,
  CheckCircle2,
  IndianRupee,
  Loader2,
  LogOut,
  Search,
  ShieldCheck,
  User,
  FileText,
  Stethoscope,
} from "lucide-react"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { processDischarge } from "@/app/actions/discharge"
import { toast } from "sonner"
import { useDebouncedValue } from "@/hooks/use-debounced-value"

// ── Types ──

interface PatientRow {
  id: string
  patientId: string
  patientName: string
  patientCode: string
  bedNumber: string
  wardName: string
  doctorName: string
  admissionDate: Date | string
  daysAdmitted: number
  reason: string | null
  diagnosis: string | null
  totalBedCharges: number
  totalLabCharges: number
  totalPharmacyCharges: number
  totalBillAmount: number
  amountPaid: number
  balanceDue: number
  hasApprovedClaim: boolean
  hasActiveClaim: boolean
  billStatus: "CLEAR" | "INSURANCE_PENDING" | "PENDING" | "BSKY_CASHLESS"
}

interface Props {
  patients: PatientRow[]
}

// ── Bill Status Badge ──

function BillStatusBadge({ status }: { status: PatientRow["billStatus"] }) {
  switch (status) {
    case "CLEAR":
      return (
        <Badge className="bg-green-100 text-green-800 hover:bg-green-200 border-green-300">
          <CheckCircle2 className="h-3 w-3 mr-1" />
          Bill Clear
        </Badge>
      )
    case "INSURANCE_PENDING":
      return (
        <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-200 border-blue-300">
          <ShieldCheck className="h-3 w-3 mr-1" />
          Insurance Covered
        </Badge>
      )
    case "PENDING":
      return (
        <Badge className="bg-red-100 text-red-800 hover:bg-red-200 border-red-300">
          <AlertTriangle className="h-3 w-3 mr-1" />
          Dues Pending
        </Badge>
      )
    case "BSKY_CASHLESS":
      return (
        <Badge className="bg-teal-100 text-teal-800 hover:bg-teal-200 border-teal-300">
          <ShieldCheck className="h-3 w-3 mr-1" />
          BSKY Cashless
        </Badge>
      )
  }
}

// ── Main Component ──

export function DischargeListClient({ patients }: Props) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [search, setSearch] = useState("")
  const debouncedSearch = useDebouncedValue(search, 300)
  const [filterStatus, setFilterStatus] = useState<string>("ALL")
  const [selectedPatient, setSelectedPatient] = useState<PatientRow | null>(null)
  const [showDialog, setShowDialog] = useState(false)
  const [dischargeSuccess, setDischargeSuccess] = useState(false)

  // ── Filter patients ──
  const filtered = patients.filter((p) => {
    const matchesSearch =
      debouncedSearch === "" ||
      p.patientName.toLowerCase().includes(debouncedSearch.toLowerCase()) ||
      p.patientCode.toLowerCase().includes(debouncedSearch.toLowerCase()) ||
      p.bedNumber.toLowerCase().includes(debouncedSearch.toLowerCase())

    const matchesStatus =
      filterStatus === "ALL" || p.billStatus === filterStatus

    return matchesSearch && matchesStatus
  })

  // ── Handle discharge click ──
  function handleDischargeClick(patient: PatientRow) {
    setSelectedPatient(patient)
    setDischargeSuccess(false)
    setShowDialog(true)
  }

  // ── Execute discharge ──
  function handleConfirmDischarge() {
    if (!selectedPatient) return

    startTransition(async () => {
      const result = await processDischarge(selectedPatient.id, {
        dischargeType: "NORMAL",
        summary: `Discharged from ${selectedPatient.wardName} - ${selectedPatient.bedNumber}`,
      })

      if (result.success) {
        toast.success(result.message)
        setDischargeSuccess(true)
        // Refresh the page data after a short delay
        setTimeout(() => {
          setShowDialog(false)
          setSelectedPatient(null)
          router.refresh()
        }, 2000)
      } else {
        toast.error(result.message)
      }
    })
  }

  return (
    <>
      {/* Search & Filter Bar */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by patient name, ID, or bed number..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-full sm:w-[200px]">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All Patients</SelectItem>
                <SelectItem value="CLEAR">Bill Clear</SelectItem>
                <SelectItem value="INSURANCE_PENDING">Insurance Pending</SelectItem>
                <SelectItem value="PENDING">Dues Pending</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Patients List */}
      <div className="space-y-4">
        {filtered.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground">
              No patients match your search criteria.
            </CardContent>
          </Card>
        ) : (
          filtered.map((patient) => (
            <Card
              key={patient.id}
              className={`border-l-4 transition-all hover:shadow-md ${patient.billStatus === "CLEAR"
                  ? "border-l-green-500"
                  : patient.billStatus === "INSURANCE_PENDING"
                    ? "border-l-blue-500"
                    : "border-l-red-500"
                }`}
            >
              <CardContent className="pt-6">
                <div className="flex flex-col lg:flex-row lg:items-center gap-4">
                  {/* Patient Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                        <User className="h-5 w-5 text-blue-600" />
                      </div>
                      <div className="min-w-0">
                        <h3 className="font-semibold text-lg truncate">
                          {patient.patientName}
                        </h3>
                        <p className="text-sm text-muted-foreground">
                          {patient.patientCode}
                        </p>
                      </div>
                      <BillStatusBadge status={patient.billStatus} />
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-3">
                      <div className="flex items-center gap-2 text-sm">
                        <Bed className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                        <span className="truncate">
                          {patient.bedNumber} / {patient.wardName}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-sm">
                        <Stethoscope className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                        <span className="truncate">Dr. {patient.doctorName}</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm">
                        <Calendar className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                        <span>
                          {format(new Date(patient.admissionDate), "dd MMM yyyy")}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-sm">
                        <span className="text-muted-foreground">Stay:</span>
                        <Badge variant="outline">
                          {patient.daysAdmitted}{" "}
                          {patient.daysAdmitted === 1 ? "day" : "days"}
                        </Badge>
                      </div>
                    </div>
                  </div>

                  {/* Financial Summary */}
                  <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 lg:gap-6">
                    <div className="text-right">
                      <p className="text-xs text-muted-foreground">Total Bill</p>
                      <p className="font-semibold text-lg">
                        ₹{patient.totalBillAmount.toFixed(0)}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-muted-foreground">Balance</p>
                      <p
                        className={`font-bold text-lg ${patient.balanceDue <= 0
                            ? "text-green-600"
                            : "text-red-600"
                          }`}
                      >
                        ₹{Math.max(0, patient.balanceDue).toFixed(0)}
                      </p>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex gap-2">
                      <Link href={`/dashboard/ipd/discharge/${patient.id}`}>
                        <Button variant="outline" size="sm">
                          <FileText className="h-4 w-4 mr-1" />
                          Full Form
                        </Button>
                      </Link>
                      <Button
                        size="sm"
                        onClick={() => handleDischargeClick(patient)}
                        className={
                          patient.billStatus === "PENDING"
                            ? "bg-red-600 hover:bg-red-700"
                            : "bg-green-600 hover:bg-green-700"
                        }
                      >
                        <LogOut className="h-4 w-4 mr-1" />
                        Discharge
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* ── Discharge Confirmation Dialog ── */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="sm:max-w-lg">
          {dischargeSuccess ? (
            /* Success State */
            <div className="text-center py-6">
              <div className="rounded-full bg-green-100 p-4 inline-flex mb-4">
                <CheckCircle2 className="h-12 w-12 text-green-600" />
              </div>
              <DialogTitle className="text-2xl mb-2">
                Discharge Successful!
              </DialogTitle>
              <DialogDescription>
                Patient has been discharged and the bed has been released.
              </DialogDescription>
            </div>
          ) : selectedPatient ? (
            <>
              <DialogHeader>
                <DialogTitle className="text-xl">
                  Discharge Patient
                </DialogTitle>
                <DialogDescription>
                  Review the bill summary before discharging{" "}
                  <strong>{selectedPatient.patientName}</strong>
                </DialogDescription>
              </DialogHeader>

              {/* Bill Summary */}
              <div className="space-y-4 my-2">
                {/* Patient Info */}
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <span className="text-muted-foreground">Patient:</span>
                    <p className="font-medium">{selectedPatient.patientName}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Bed / Ward:</span>
                    <p className="font-medium">
                      {selectedPatient.bedNumber} / {selectedPatient.wardName}
                    </p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Doctor:</span>
                    <p className="font-medium">
                      Dr. {selectedPatient.doctorName}
                    </p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Duration:</span>
                    <p className="font-medium">
                      {selectedPatient.daysAdmitted} day
                      {selectedPatient.daysAdmitted !== 1 ? "s" : ""}
                    </p>
                  </div>
                </div>

                <Separator />

                {/* Bill Breakdown */}
                <div className="space-y-2 bg-gray-50 p-4 rounded-lg">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Bed Charges:</span>
                    <span>₹{selectedPatient.totalBedCharges.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Lab Charges:</span>
                    <span>₹{selectedPatient.totalLabCharges.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">
                      Pharmacy Charges:
                    </span>
                    <span>
                      ₹{selectedPatient.totalPharmacyCharges.toFixed(2)}
                    </span>
                  </div>
                  <Separator />
                  <div className="flex justify-between font-semibold">
                    <span>Total Bill:</span>
                    <span>₹{selectedPatient.totalBillAmount.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-green-600 text-sm">
                    <span>Advance Paid:</span>
                    <span>-₹{selectedPatient.amountPaid.toFixed(2)}</span>
                  </div>
                  <Separator />
                  <div className="flex justify-between font-bold text-lg">
                    <span>Balance Due:</span>
                    <span
                      className={
                        selectedPatient.balanceDue <= 0
                          ? "text-green-600"
                          : "text-red-600"
                      }
                    >
                      ₹{Math.max(0, selectedPatient.balanceDue).toFixed(2)}
                    </span>
                  </div>
                </div>

                {/* Status-specific alerts */}
                {selectedPatient.billStatus === "PENDING" && (
                  <Alert variant="destructive">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertTitle>Clear Dues First</AlertTitle>
                    <AlertDescription>
                      This patient has an outstanding balance of{" "}
                      <strong>
                        ₹{selectedPatient.balanceDue.toFixed(2)}
                      </strong>
                      . Please collect payment or submit an insurance claim
                      before discharging.
                    </AlertDescription>
                  </Alert>
                )}

                {selectedPatient.billStatus === "INSURANCE_PENDING" && (
                  <Alert className="border-blue-300 bg-blue-50">
                    <ShieldCheck className="h-4 w-4 text-blue-600" />
                    <AlertTitle className="text-blue-800">
                      Insurance Claim Active
                    </AlertTitle>
                    <AlertDescription className="text-blue-700">
                      {selectedPatient.hasApprovedClaim
                        ? "An insurance claim has been APPROVED. The remaining balance will be settled by the insurer."
                        : "An insurance claim is currently being processed. Discharge is allowed — the insurer will pay later."}
                    </AlertDescription>
                  </Alert>
                )}

                {selectedPatient.billStatus === "CLEAR" && (
                  <Alert className="border-green-300 bg-green-50">
                    <CheckCircle2 className="h-4 w-4 text-green-600" />
                    <AlertTitle className="text-green-800">
                      All Dues Cleared
                    </AlertTitle>
                    <AlertDescription className="text-green-700">
                      No outstanding balance. Patient is ready for discharge.
                    </AlertDescription>
                  </Alert>
                )}
              </div>

              <DialogFooter className="gap-2 sm:gap-0">
                <Button
                  variant="outline"
                  onClick={() => setShowDialog(false)}
                  disabled={isPending}
                >
                  Cancel
                </Button>

                {selectedPatient.billStatus === "PENDING" ? (
                  <Button variant="destructive" disabled>
                    <AlertTriangle className="h-4 w-4 mr-2" />
                    Clear Dues First
                  </Button>
                ) : (
                  <Button
                    onClick={handleConfirmDischarge}
                    disabled={isPending}
                    className="bg-green-600 hover:bg-green-700"
                  >
                    {isPending ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <CheckCircle2 className="h-4 w-4 mr-2" />
                    )}
                    Confirm Discharge
                  </Button>
                )}
              </DialogFooter>
            </>
          ) : null}
        </DialogContent>
      </Dialog>
    </>
  )
}
