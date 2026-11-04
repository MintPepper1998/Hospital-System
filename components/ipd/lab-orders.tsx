"use client"

import { useState, useTransition, useRef, useEffect, useCallback } from "react"
import { format } from "date-fns"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  FlaskConical,
  Scan,
  Plus,
  Loader2,
  XCircle,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Ban,
  Search,
} from "lucide-react"
import Link from "next/link"
import { createIPDLabRequest, cancelIPDLabRequest } from "@/app/actions/lab"
import { searchTests } from "@/app/actions/search"
import { toast } from "sonner"

// ============================================
// TYPES
// ============================================

export interface SerializedIPDLabRequest {
  id: string
  admissionId?: string
  emergencyVisitId?: string
  testCatalogId?: string | null
  reportId?: string | null
  orderedById: string
  orderedByName: string | null
  type: string
  testName: string
  status: string
  isUrgent: boolean
  notes: string | null
  result: string | null
  completedAt: string | null
  cancelledAt: string | null
  cancelledBy: string | null
  createdAt: string
  updatedAt: string
}

interface LabOrdersProps {
  admissionId?: string
  emergencyVisitId?: string
  admissionStatus: string
  doctorName: string
  labRequests: SerializedIPDLabRequest[]
  activeUserRole?: string
}

// Common test name suggestions
const PATHOLOGY_TESTS = [
  "Complete Blood Count (CBC)",
  "Blood Sugar (Fasting)",
  "Blood Sugar (PP)",
  "HbA1c",
  "Liver Function Test (LFT)",
  "Kidney Function Test (KFT)",
  "Lipid Profile",
  "Thyroid Profile (T3, T4, TSH)",
  "Urine Routine",
  "Electrolytes (Na, K, Cl)",
  "PT/INR",
  "CRP",
  "Blood Culture",
  "Dengue NS1 / IgM / IgG",
  "Malaria (MP) Smear",
  "Widal Test",
  "HIV / HBsAg / HCV",
  "D-Dimer",
  "Troponin I",
  "ABG (Arterial Blood Gas)",
]

const RADIOLOGY_TESTS = [
  "X-Ray Chest PA",
  "X-Ray Abdomen",
  "USG Abdomen & Pelvis",
  "CT Scan Brain (Plain)",
  "CT Scan Brain (Contrast)",
  "CT Scan Chest (HRCT)",
  "CT Scan Abdomen",
  "MRI Brain",
  "MRI Spine",
  "MRI Knee",
  "2D Echocardiography",
  "ECG (12 Lead)",
  "Doppler (Venous/Arterial)",
]

// ============================================
// STATUS HELPERS
// ============================================

function StatusBadge({ status, isUrgent }: { status: string; isUrgent: boolean }) {
  const config: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline"; icon: React.ReactNode }> = {
    PENDING: {
      label: "Pending",
      variant: "outline",
      icon: <Clock className="h-3 w-3" />,
    },
    IN_PROGRESS: {
      label: "In Progress",
      variant: "default",
      icon: <Loader2 className="h-3 w-3 animate-spin" />,
    },
    COMPLETED: {
      label: "Completed",
      variant: "secondary",
      icon: <CheckCircle2 className="h-3 w-3 text-green-600" />,
    },
    CANCELLED: {
      label: "Cancelled",
      variant: "destructive",
      icon: <Ban className="h-3 w-3" />,
    },
  }

  const s = config[status] || config.PENDING

  return (
    <div className="flex items-center gap-1.5">
      <Badge variant={s.variant} className="text-xs flex items-center gap-1">
        {s.icon}
        {s.label}
      </Badge>
      {isUrgent && (
        <Badge variant="destructive" className="text-xs flex items-center gap-1">
          <AlertTriangle className="h-3 w-3" />
          Urgent
        </Badge>
      )}
    </div>
  )
}

function TypeBadge({ type }: { type: string }) {
  if (type === "PATHOLOGY") {
    return (
      <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-100 text-xs flex items-center gap-1">
        <FlaskConical className="h-3 w-3" />
        Pathology
      </Badge>
    )
  }
  return (
    <Badge className="bg-orange-100 text-orange-800 hover:bg-orange-100 text-xs flex items-center gap-1">
      <Scan className="h-3 w-3" />
      Radiology
    </Badge>
  )
}

// ============================================
// MAIN COMPONENT
// ============================================

export function LabOrders({
  admissionId,
  emergencyVisitId,
  admissionStatus,
  doctorName,
  labRequests: initialRequests,
  activeUserRole,
}: LabOrdersProps) {
  const [requests, setRequests] = useState(initialRequests)
  const [isPending, startTransition] = useTransition()
  const [isCancellingId, setIsCancellingId] = useState<string | null>(null)

  // Form state
  const [type, setType] = useState<"PATHOLOGY" | "RADIOLOGY">("PATHOLOGY")
  const [testName, setTestName] = useState("")
  const [selectedTestCatalogId, setSelectedTestCatalogId] = useState<string | null>(null)
  const [isUrgent, setIsUrgent] = useState(false)
  const [notes, setNotes] = useState("")

  // Autocomplete state
  const [testSuggestions, setTestSuggestions] = useState<
    { id: string; name: string; code: string; category: string | null; price: number; label: string }[]
  >([])
  const [showTestDropdown, setShowTestDropdown] = useState(false)
  const [isSearchingTests, setIsSearchingTests] = useState(false)
  const testInputRef = useRef<HTMLInputElement>(null)
  const testDropdownRef = useRef<HTMLDivElement>(null)
  const testSearchTimerRef = useRef<NodeJS.Timeout | null>(null)

  // Debounced test search
  const handleTestSearch = useCallback(
    (query: string) => {
      setTestName(query)
      setSelectedTestCatalogId(null)
      if (testSearchTimerRef.current) clearTimeout(testSearchTimerRef.current)

      if (query.trim().length < 1) {
        setTestSuggestions([])
        setShowTestDropdown(false)
        return
      }

      testSearchTimerRef.current = setTimeout(async () => {
        setIsSearchingTests(true)
        try {
          const results = await searchTests(query, type)
          setTestSuggestions(results)
          setShowTestDropdown(results.length > 0)
        } catch {
          setTestSuggestions([])
        } finally {
          setIsSearchingTests(false)
        }
      }, 300)
    },
    [type]
  )

  const selectTest = (item: typeof testSuggestions[0]) => {
    setTestName(item.name)
    setSelectedTestCatalogId(item.id)
    setShowTestDropdown(false)
    setTestSuggestions([])
  }

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        testDropdownRef.current &&
        !testDropdownRef.current.contains(e.target as Node) &&
        testInputRef.current &&
        !testInputRef.current.contains(e.target as Node)
      ) {
        setShowTestDropdown(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  const suggestions = type === "PATHOLOGY" ? PATHOLOGY_TESTS : RADIOLOGY_TESTS

  // Counts by status
  const pendingCount = requests.filter((r) => r.status === "PENDING").length
  const completedCount = requests.filter((r) => r.status === "COMPLETED").length

  const handleOrder = () => {
    if (!testName.trim()) {
      toast.error("Please enter a test name")
      return
    }

    startTransition(async () => {
      try {
        const result = await createIPDLabRequest({
          admissionId,
        emergencyVisitId,
          orderedById: "current-user", // TODO: Replace with actual auth user
          orderedByName: doctorName,
          type,
          testName,
          testCatalogId: selectedTestCatalogId || undefined,
          isUrgent,
          notes: notes || undefined,
        })

        if (result.success) {
          toast.success(`${testName} ordered successfully`)

          // Optimistic update
          const newReq: SerializedIPDLabRequest = {
            id: result.requestId,
            admissionId,
        emergencyVisitId,
            testCatalogId: selectedTestCatalogId,
            orderedById: "current-user",
            orderedByName: doctorName,
            type,
            testName,
            status: "PENDING",
            isUrgent,
            notes: notes || null,
            result: null,
            completedAt: null,
            cancelledAt: null,
            cancelledBy: null,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          }
          setRequests((prev) => [newReq, ...prev])

          // Reset form
          setTestName("")
          setSelectedTestCatalogId(null)
          setIsUrgent(false)
          setNotes("")
        }
      } catch (error: any) {
        toast.error(error.message || "Failed to order test")
      }
    })
  }

  const handleCancel = (requestId: string) => {
    setIsCancellingId(requestId)
    startTransition(async () => {
      try {
        const result = await cancelIPDLabRequest({
          requestId,
          cancelledBy: doctorName,
        })

        if (result.success) {
          toast.success("Investigation cancelled")
          setRequests((prev) =>
            prev.map((r) =>
              r.id === requestId
                ? { ...r, status: "CANCELLED", cancelledAt: new Date().toISOString(), cancelledBy: doctorName }
                : r
            )
          )
        }
      } catch (error: any) {
        toast.error(error.message || "Failed to cancel")
      } finally {
        setIsCancellingId(null)
      }
    })
  }

  return (
    <div className="space-y-6">
      {/* Order Form */}
      {(admissionStatus === "ADMITTED" || admissionStatus === "ACTIVE" || admissionStatus === "TRIAGE" || admissionStatus === "OBSERVATION" || activeUserRole === "DOCTOR" || activeUserRole === "SUPER_ADMIN" || activeUserRole === "ADMIN") && admissionStatus !== "DISCHARGED" && (
        <Card className="border-indigo-200 bg-indigo-50/30">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Plus className="h-4 w-4 text-indigo-600" />
              Order Investigation
            </CardTitle>
            <CardDescription>Request a lab test or radiology investigation</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Type Toggle */}
            <div className="space-y-2">
              <Label className="text-xs">Investigation Type *</Label>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant={type === "PATHOLOGY" ? "default" : "outline"}
                  size="sm"
                  onClick={() => { setType("PATHOLOGY"); setTestName(""); setSelectedTestCatalogId(null) }}
                  className={type === "PATHOLOGY" ? "bg-blue-600 hover:bg-blue-700" : ""}
                >
                  <FlaskConical className="h-4 w-4 mr-2" />
                  Pathology
                </Button>
                <Button
                  type="button"
                  variant={type === "RADIOLOGY" ? "default" : "outline"}
                  size="sm"
                  onClick={() => { setType("RADIOLOGY"); setTestName(""); setSelectedTestCatalogId(null) }}
                  className={type === "RADIOLOGY" ? "bg-orange-600 hover:bg-orange-700" : ""}
                >
                  <Scan className="h-4 w-4 mr-2" />
                  Radiology
                </Button>
              </div>
            </div>

            {/* Test Name with autocomplete */}
            <div className="space-y-2 relative">
              <Label htmlFor="testName" className="text-xs">Test Name *</Label>
              <div className="relative">
                <Input
                  ref={testInputRef}
                  id="testName"
                  placeholder={type === "PATHOLOGY" ? "Type 1+ chars to search, e.g., CBC..." : "Type 1+ chars to search, e.g., X-Ray..."}
                  value={testName}
                  onChange={(e) => handleTestSearch(e.target.value)}
                  onFocus={() => {
                    if (testSuggestions.length > 0) setShowTestDropdown(true)
                  }}
                  className="bg-white pr-8"
                  autoComplete="off"
                />
                {isSearchingTests && (
                  <Loader2 className="absolute right-2.5 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
                )}
                {!isSearchingTests && testName.length >= 1 && (
                  <Search className="absolute right-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                )}
              </div>
              {/* Autocomplete Dropdown */}
              {showTestDropdown && testSuggestions.length > 0 && (
                <div
                  ref={testDropdownRef}
                  className="absolute z-50 top-full left-0 right-0 mt-1 bg-white border rounded-lg shadow-lg max-h-60 overflow-y-auto"
                >
                  {testSuggestions.map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      className="w-full text-left px-3 py-2 hover:bg-indigo-50 transition-colors border-b last:border-b-0 text-sm"
                      onClick={() => selectTest(item)}
                    >
                      <span className="font-medium">{item.name}</span>
                      {item.category && (
                        <span className="text-muted-foreground ml-1 text-xs">
                          ({item.category})
                        </span>
                      )}
                      {item.price > 0 && (
                        <Badge variant="outline" className="ml-2 text-xs">
                          ₹{item.price}
                        </Badge>
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Urgent + Notes row */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex items-center gap-2">
                <Checkbox
                  id="urgent"
                  checked={isUrgent}
                  onCheckedChange={(checked) => setIsUrgent(checked === true)}
                />
                <Label htmlFor="urgent" className="text-sm flex items-center gap-1 cursor-pointer">
                  <AlertTriangle className="h-3.5 w-3.5 text-red-500" />
                  Mark as Urgent
                </Label>
              </div>
              <div className="space-y-1">
                <Label htmlFor="labNotes" className="text-xs">Notes (Optional)</Label>
                <Input
                  id="labNotes"
                  placeholder="e.g., Fasting required, Contrast allergy check"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="bg-white"
                />
              </div>
            </div>

            <Button
              onClick={handleOrder}
              disabled={isPending && !isCancellingId || !testName.trim()}
              className="bg-indigo-600 hover:bg-indigo-700"
            >
              {isPending && !isCancellingId ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Ordering...
                </>
              ) : (
                <>
                  <Plus className="h-4 w-4 mr-2" />
                  Order {type === "PATHOLOGY" ? "Lab Test" : "Radiology"}
                </>
              )}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Investigation Orders Table */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <FlaskConical className="h-4 w-4 text-indigo-500" />
            Investigation Orders
            <div className="flex gap-2 ml-auto">
              {pendingCount > 0 && (
                <Badge variant="outline" className="text-xs">
                  {pendingCount} pending
                </Badge>
              )}
              <Badge variant="secondary" className="text-xs">
                {completedCount} completed
              </Badge>
              <Badge variant="secondary" className="text-xs">
                {requests.length} total
              </Badge>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {requests.length === 0 ? (
            <div className="text-center py-10 text-muted-foreground">
              <FlaskConical className="h-10 w-10 mx-auto mb-3 opacity-20" />
              <p className="font-medium">No investigations ordered</p>
              <p className="text-sm">Order a lab test or radiology scan using the form above.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Test Name</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Ordered By</TableHead>
                    <TableHead className="text-right">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {requests.map((req) => (
                    <TableRow
                      key={req.id}
                      className={req.status === "CANCELLED" ? "opacity-50" : ""}
                    >
                      <TableCell className="text-xs whitespace-nowrap">
                        {format(new Date(req.createdAt), "dd MMM, HH:mm")}
                      </TableCell>
                      <TableCell>
                        <TypeBadge type={req.type} />
                      </TableCell>
                      <TableCell>
                        <div>
                          <p className={`font-medium text-sm ${req.status === "CANCELLED" ? "line-through" : ""}`}>
                            {req.testName}
                          </p>
                          {req.notes && (
                            <p className="text-xs text-muted-foreground">{req.notes}</p>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <StatusBadge status={req.status} isUrgent={req.isUrgent} />
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {req.orderedByName || "—"}
                      </TableCell>
                      <TableCell className="text-right">
                        {req.status === "PENDING" && admissionStatus === "ADMITTED" && (
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-7 text-xs text-red-600 hover:text-red-700 hover:bg-red-50"
                            onClick={() => handleCancel(req.id)}
                            disabled={isPending && isCancellingId === req.id}
                          >
                            {isPending && isCancellingId === req.id ? (
                              <Loader2 className="h-3 w-3 animate-spin" />
                            ) : (
                              <>
                                <XCircle className="h-3 w-3 mr-1" />
                                Cancel
                              </>
                            )}
                          </Button>
                        )}
                        {req.status === "COMPLETED" && req.result && (
                          <Link
                            href={
                              req.type === "RADIOLOGY"
                                ? `/dashboard/radiology/print/${req.reportId || req.id}`
                                : `/dashboard/lab/print/${req.reportId || req.id}`
                            }
                          >
                            <Badge
                              variant="outline"
                              className="text-xs text-green-600 hover:bg-green-50 cursor-pointer"
                            >
                              <CheckCircle2 className="h-3 w-3 mr-1" />
                              Result Available
                            </Badge>
                          </Link>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
