"use client"

import { useState, useTransition, useMemo } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import {
  ArrowLeft,
  Microscope,
  Radiation,
  Search,
  User,
  Plus,
  Trash2,
  CheckCircle,
  AlertCircle,
  Printer,
  CreditCard,
  Banknote,
  QrCode,
  Bandage,
  RefreshCw,
  Clock,
  Sparkles,
  Stethoscope,
  Building2,
  Phone,
  FileText,
  Percent,
  Check,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
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
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { toast } from "sonner"
import {
  createDiagnosticBill,
  searchPatientsForDiagnostics,
  getPendingDiagnostics,
  getActiveCasualtyPatientsForDiagnostics,
  getAllPatientsWithPendingDiagnostics,
  type CreateDiagnosticBillInput,
  type DiagnosticItemInput,
} from "@/lib/actions/diagnostics"
import { PAYMENT_METHOD_OPTIONS } from "@/lib/payment-routing"

export interface CatalogTest {
  id: string
  name: string
  code: string | null
  price: number
  category: string | null
  type: "PATHOLOGY" | "RADIOLOGY"
  unit: string | null
  normalRange: string | null
  description: string | null
}

export interface CasualtyPatient {
  casualtyVisitId: string
  patientId: string
  uhid: string
  name: string
  phone: string | null
  gender?: string | null
  age?: number | null
  chiefComplaint: string | null
  doctorName: string
  arrivalTime: string
  procedureCount: number
  pendingTestCount: number
  status: string
}

export interface PendingOrderPatient {
  id: string
  patientId: string
  name: string
  phone: string | null
  gender?: string | null
  pendingTestCount: number
  latestOrderTime: Date
}

export interface SelectedPatientInfo {
  id: string
  patientId: string
  name: string
  phone: string | null
  gender?: string | null
  age?: number | null
  pendingTestCount?: number
  activeCasualtyVisit?: {
    id: string
    status: string
    arrivalTime: string
    chiefComplaint: string | null
  } | null
}

interface DiagnosticsBillingClientProps {
  catalogTests: CatalogTest[]
  initialCasualtyPatients: CasualtyPatient[]
  initialPendingOrderPatients: PendingOrderPatient[]
}

export function DiagnosticsBillingClient({
  catalogTests,
  initialCasualtyPatients,
  initialPendingOrderPatients,
}: DiagnosticsBillingClientProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  // Queues
  const [casualtyPatients, setCasualtyPatients] = useState<CasualtyPatient[]>(
    initialCasualtyPatients
  )
  const [pendingOrderPatients, setPendingOrderPatients] = useState<PendingOrderPatient[]>(
    initialPendingOrderPatients
  )
  const [isRefreshingQueues, setIsRefreshingQueues] = useState(false)

  // Patient Search State
  const [searchTerm, setSearchTerm] = useState("")
  const [searchResults, setSearchResults] = useState<SelectedPatientInfo[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const [selectedPatient, setSelectedPatient] = useState<SelectedPatientInfo | null>(null)

  // Active Tab for patient selection
  const [patientTab, setPatientTab] = useState<string>("search")

  // Selected Tests Line Items
  const [selectedItems, setSelectedItems] = useState<DiagnosticItemInput[]>([])
  const [loadedPendingRequestIds, setLoadedPendingRequestIds] = useState<string[]>([])
  const [loadingPendingOrders, setLoadingPendingOrders] = useState(false)

  // Catalog Filter State
  const [catalogFilterType, setCatalogFilterType] = useState<"ALL" | "PATHOLOGY" | "RADIOLOGY">("ALL")
  const [catalogSearch, setCatalogSearch] = useState("")
  const [selectedCategory, setSelectedCategory] = useState<string>("ALL")

  // Payment State
  const [paymentMethod, setPaymentMethod] = useState<string>("CASH")
  const [transactionId, setTransactionId] = useState("")
  const [discountType, setDiscountType] = useState<"AMOUNT" | "PERCENT">("AMOUNT")
  const [discountValue, setDiscountValue] = useState<number>(0)
  const [cashTendered, setCashTendered] = useState<number | "">("")
  const [splitCash, setSplitCash] = useState<number | "">("")
  const [splitUpi, setSplitUpi] = useState<number | "">("")
  const [splitCard, setSplitCard] = useState<number | "">("")
  const [billingNotes, setBillingNotes] = useState("")

  // Success Bill Result
  const [lastBill, setLastBill] = useState<{
    billNumber: string
    billingId: string
    labRequestId?: string | null
    wasAddedToCasualty?: boolean
  } | null>(null)

  // Custom Item Modal/Inputs
  const [customName, setCustomName] = useState("")
  const [customPrice, setCustomPrice] = useState<number | "">("")
  const [customType, setCustomType] = useState<"PATHOLOGY" | "RADIOLOGY">("PATHOLOGY")
  const [showCustomItemRow, setShowCustomItemRow] = useState(false)

  // Refresh Queues
  const handleRefreshQueues = async () => {
    setIsRefreshingQueues(true)
    try {
      const [casRes, ordRes] = await Promise.all([
        getActiveCasualtyPatientsForDiagnostics(),
        getAllPatientsWithPendingDiagnostics(),
      ])
      if (casRes.success && casRes.data) {
        setCasualtyPatients(casRes.data)
      }
      if (ordRes.success && ordRes.data) {
        setPendingOrderPatients(ordRes.data as any)
      }
      toast.success("Queues refreshed")
    } catch {
      toast.error("Failed to refresh queues")
    } finally {
      setIsRefreshingQueues(false)
    }
  }

  // Handle Search Patients
  const handleSearchPatient = async (term: string) => {
    setSearchTerm(term)
    if (term.trim().length < 2) {
      setSearchResults([])
      return
    }

    setIsSearching(true)
    const result = await searchPatientsForDiagnostics(term.trim())
    if (result.success && result.data) {
      setSearchResults(result.data as SelectedPatientInfo[])
    }
    setIsSearching(false)
  }

  // Select a patient
  const handleSelectPatient = (patient: SelectedPatientInfo) => {
    setSelectedPatient(patient)
    setSearchResults([])
    setSearchTerm("")
    setLastBill(null)

    // Check if patient has pending orders and prompt
    loadPatientPendingOrders(patient.id)
  }

  // Select from casualty queue
  const handleSelectCasualtyPatient = (cas: CasualtyPatient) => {
    setSelectedPatient({
      id: cas.patientId,
      patientId: cas.uhid,
      name: cas.name,
      phone: cas.phone,
      gender: cas.gender,
      age: cas.age,
      activeCasualtyVisit: {
        id: cas.casualtyVisitId,
        status: cas.status,
        arrivalTime: cas.arrivalTime,
        chiefComplaint: cas.chiefComplaint,
      },
    })
    setLastBill(null)
    loadPatientPendingOrders(cas.patientId)
  }

  // Select from pending order queue
  const handleSelectPendingOrderPatient = (ord: PendingOrderPatient) => {
    setSelectedPatient({
      id: ord.id,
      patientId: ord.patientId,
      name: ord.name,
      phone: ord.phone,
      gender: ord.gender,
    })
    setLastBill(null)
    loadPatientPendingOrders(ord.id)
  }

  // Load patient pending orders
  const loadPatientPendingOrders = async (patientId: string) => {
    setLoadingPendingOrders(true)
    const result = await getPendingDiagnostics(patientId)
    if (result.success && result.data && result.data.length > 0) {
      const orders = result.data as any[]
      const itemsToAdd: DiagnosticItemInput[] = orders.map((o) => ({
        catalogId: o.id,
        name: o.testName,
        type: o.testType,
        unitPrice: o.testPrice,
        quantity: 1,
      }))
      const reqIds = orders.map((o) => o.id)
      setSelectedItems(itemsToAdd)
      setLoadedPendingRequestIds(reqIds)
      toast.info(`Loaded ${itemsToAdd.length} doctor-prescribed test(s)`)
    } else {
      setSelectedItems([])
      setLoadedPendingRequestIds([])
    }
    setLoadingPendingOrders(false)
  }

  // Filter Catalog
  const availableCategories = useMemo(() => {
    const set = new Set<string>()
    for (const t of catalogTests) {
      if (catalogFilterType === "ALL" || t.type === catalogFilterType) {
        if (t.category) set.add(t.category)
      }
    }
    return Array.from(set).sort()
  }, [catalogTests, catalogFilterType])

  const filteredTests = useMemo(() => {
    return catalogTests.filter((test) => {
      // Type match
      if (catalogFilterType !== "ALL" && test.type !== catalogFilterType) {
        return false
      }
      // Category match
      if (selectedCategory !== "ALL" && test.category !== selectedCategory) {
        return false
      }
      // Search match
      if (catalogSearch.trim()) {
        const q = catalogSearch.toLowerCase().trim()
        const matchName = test.name.toLowerCase().includes(q)
        const matchCode = test.code?.toLowerCase().includes(q)
        const matchCat = test.category?.toLowerCase().includes(q)
        if (!matchName && !matchCode && !matchCat) return false
      }
      return true
    })
  }, [catalogTests, catalogFilterType, selectedCategory, catalogSearch])

  // Add Item from Catalog
  const handleAddCatalogTest = (test: CatalogTest) => {
    setSelectedItems((prev) => {
      const existingIndex = prev.findIndex((i) => i.name === test.name)
      if (existingIndex >= 0) {
        const next = [...prev]
        next[existingIndex] = {
          ...next[existingIndex],
          quantity: next[existingIndex].quantity + 1,
        }
        return next
      }
      return [
        ...prev,
        {
          catalogId: test.id,
          name: test.name,
          code: test.code || undefined,
          type: test.type,
          category: test.category || undefined,
          unitPrice: test.price,
          quantity: 1,
        },
      ]
    })
  }

  // Add Custom Item
  const handleAddCustomItem = () => {
    if (!customName.trim()) {
      toast.error("Please enter test name")
      return
    }
    const price = typeof customPrice === "number" ? customPrice : 0
    setSelectedItems((prev) => [
      ...prev,
      {
        name: customName.trim(),
        type: customType,
        unitPrice: price,
        quantity: 1,
        category: "CUSTOM",
      },
    ])
    setCustomName("")
    setCustomPrice("")
    setShowCustomItemRow(false)
  }

  // Remove Item
  const handleRemoveItem = (index: number) => {
    setSelectedItems((prev) => prev.filter((_, i) => i !== index))
  }

  // Update Item Quantity
  const handleUpdateQuantity = (index: number, qty: number) => {
    if (qty < 1) return
    setSelectedItems((prev) => {
      const next = [...prev]
      next[index] = { ...next[index], quantity: qty }
      return next
    })
  }

  // Totals Calculation
  const subtotal = selectedItems.reduce(
    (sum, item) => sum + item.quantity * item.unitPrice,
    0
  )

  const discountAmount = useMemo(() => {
    if (discountType === "PERCENT") {
      return (subtotal * (discountValue || 0)) / 100
    }
    return Math.min(subtotal, discountValue || 0)
  }, [subtotal, discountType, discountValue])

  const netAmount = Math.max(0, subtotal - discountAmount)

  // Split calculation
  const totalSplitPaid =
    (typeof splitCash === "number" ? splitCash : 0) +
    (typeof splitUpi === "number" ? splitUpi : 0) +
    (typeof splitCard === "number" ? splitCard : 0)
  const splitBalance = netAmount - totalSplitPaid

  // Cash Change Calculation
  const changeToReturn =
    typeof cashTendered === "number" && cashTendered >= netAmount
      ? cashTendered - netAmount
      : 0

  // Count items by category
  const pathologyCount = selectedItems.filter((i) => i.type === "PATHOLOGY").length
  const radiologyCount = selectedItems.filter((i) => i.type === "RADIOLOGY").length

  // Submit Handler: Collect Payment Now OR Add to Casualty Bill
  const handleSubmitBill = async (addToCasualtyOnly: boolean = false) => {
    if (!selectedPatient) {
      toast.error("Please select a patient first")
      return
    }
    if (selectedItems.length === 0) {
      toast.error("Please add at least one diagnostic test to the bill")
      return
    }

    if (addToCasualtyOnly && !selectedPatient.activeCasualtyVisit?.id) {
      toast.error("Patient does not have an active Casualty visit to defer billing")
      return
    }

    if (!addToCasualtyOnly && paymentMethod === "SPLIT" && splitBalance !== 0) {
      toast.error(
        `Split amounts must equal net total (Difference: ₹${Math.abs(splitBalance).toFixed(2)})`
      )
      return
    }

    const payload: CreateDiagnosticBillInput = {
      patientId: selectedPatient.id,
      casualtyVisitId: selectedPatient.activeCasualtyVisit?.id,
      tests: selectedItems,
      existingLabRequestIds: loadedPendingRequestIds,
      paymentMethod,
      transactionId: transactionId || undefined,
      splitPayment:
        paymentMethod === "SPLIT"
          ? {
              cashAmount: typeof splitCash === "number" ? splitCash : 0,
              upiAmount: typeof splitUpi === "number" ? splitUpi : 0,
              cardAmount: typeof splitCard === "number" ? splitCard : 0,
            }
          : undefined,
      discountAmount: discountType === "AMOUNT" ? discountAmount : undefined,
      discountPercent: discountType === "PERCENT" ? discountValue : undefined,
      notes: billingNotes.trim() || undefined,
      addToCasualtyBillOnly: addToCasualtyOnly,
    }

    startTransition(async () => {
      const res = await createDiagnosticBill(payload)
      if (res.success) {
        toast.success(res.message)
        if (addToCasualtyOnly) {
          setLastBill({
            billNumber: "CASUALTY-DEFERRED",
            billingId: "",
            wasAddedToCasualty: true,
          })
        } else {
          setLastBill({
            billNumber: res.billNumber || "",
            billingId: res.billingId || "",
            labRequestId: res.labRequestId || null,
          })
        }

        // Reset inputs
        setSelectedItems([])
        setLoadedPendingRequestIds([])
        setDiscountValue(0)
        setCashTendered("")
        setSplitCash("")
        setSplitUpi("")
        setSplitCard("")
        setTransactionId("")
        setBillingNotes("")

        // Refresh queues
        handleRefreshQueues()
      } else {
        toast.error(res.message || "Failed to process diagnostic bill")
      }
    })
  }

  return (
    <div className="flex-1 space-y-5 p-4 md:p-8 pt-4">
      {/* Top Navigation & Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b pb-4">
        <div className="flex items-center gap-3">
          <Link href="/dashboard/billing-counter">
            <Button variant="ghost" size="icon" className="h-9 w-9">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-[#0066CC] flex items-center gap-2">
              <Microscope className="h-6 w-6 text-teal-600" />
              Diagnostics Billing Counter
            </h1>
            <p className="text-xs text-muted-foreground mt-0.5">
              Pathology & Radiology investigation billing • Connected to Admin Test Catalog & Casualty
            </p>
          </div>
        </div>

        {/* Quick Stats Pills */}
        <div className="flex items-center gap-2 flex-wrap">
          <Badge variant="outline" className="bg-teal-50 text-teal-700 border-teal-200 text-xs py-1 px-2.5">
            <Microscope className="h-3 w-3 mr-1" />
            {catalogTests.filter((t) => t.type === "PATHOLOGY").length} Pathology Tests
          </Badge>
          <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200 text-xs py-1 px-2.5">
            <Radiation className="h-3 w-3 mr-1" />
            {catalogTests.filter((t) => t.type === "RADIOLOGY").length} Radiology Tests
          </Badge>
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefreshQueues}
            disabled={isRefreshingQueues}
            className="h-8 text-xs font-medium"
          >
            <RefreshCw className={`h-3.5 w-3.5 mr-1.5 ${isRefreshingQueues ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Success Notification Banner */}
      {lastBill && (
        <div className="p-4 rounded-xl bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-200 shadow-sm flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600 flex-shrink-0">
              <CheckCircle className="h-6 w-6" />
            </div>
            <div>
              {lastBill.wasAddedToCasualty ? (
                <>
                  <p className="font-bold text-emerald-950 text-sm">
                    Diagnostic Tests Added to Casualty Patient!
                  </p>
                  <p className="text-xs text-emerald-700 mt-0.5">
                    Tests are linked to the Casualty visit and will appear in the Casualty billing counter for consolidated settlement.
                  </p>
                </>
              ) : (
                <>
                  <p className="font-bold text-emerald-950 text-sm">
                    Bill Generated:{" "}
                    <span className="underline decoration-emerald-400 font-extrabold">
                      {lastBill.billNumber}
                    </span>
                  </p>
                  <p className="text-xs text-emerald-700 mt-0.5">
                    Payment collected and orders dispatched to lab & radiology queues. Print documents individually:
                  </p>
                </>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2">
            {!lastBill.wasAddedToCasualty && lastBill.billingId && (
              <Button
                variant="outline"
                size="sm"
                className="bg-white border-emerald-300 text-emerald-700 hover:bg-emerald-100 font-semibold shadow-xs text-xs"
                onClick={() =>
                  window.open(`/dashboard/finance/billing/${lastBill.billingId}`, "_blank")
                }
              >
                <Printer className="h-3.5 w-3.5 mr-1.5 text-emerald-600" />
                Print Bill / Receipt
              </Button>
            )}
            {!lastBill.wasAddedToCasualty && lastBill.labRequestId && (
              <Button
                variant="outline"
                size="sm"
                className="bg-white border-teal-300 text-teal-700 hover:bg-teal-100 font-semibold shadow-xs text-xs"
                onClick={() =>
                  window.open(`/dashboard/lab/print/${lastBill.labRequestId}`, "_blank")
                }
              >
                <FileText className="h-3.5 w-3.5 mr-1.5 text-teal-600" />
                Print Lab Slip
              </Button>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setLastBill(null)}
              className="text-emerald-700 hover:bg-emerald-100 text-xs"
            >
              ✕ Dismiss
            </Button>
          </div>
        </div>
      )}

      {/* Main Grid: Left Panel (Patient & Test Selection) | Right Panel (Bill Items & Payment) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* LEFT COLUMN: Patient Selection & Test Catalog (7 cols on lg) */}
        <div className="lg:col-span-7 space-y-5">
          {/* 1. Patient Selection Card */}
          <Card className="border-border/60 shadow-xs">
            <CardHeader className="p-4 pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-bold flex items-center gap-2">
                  <User className="h-4 w-4 text-[#0066CC]" />
                  Select Patient
                </CardTitle>
                {selectedPatient && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 text-xs text-muted-foreground hover:text-red-600"
                    onClick={() => {
                      setSelectedPatient(null)
                      setSelectedItems([])
                      setLoadedPendingRequestIds([])
                    }}
                  >
                    ✕ Change Patient
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent className="p-4 pt-2">
              {/* Selected Patient Banner */}
              {selectedPatient ? (
                <div className="space-y-3">
                  <div className="p-3.5 bg-gradient-to-r from-blue-50/80 to-indigo-50/80 border border-blue-200/80 rounded-xl flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="h-10 w-10 rounded-full bg-blue-100 text-[#0066CC] font-bold flex items-center justify-center flex-shrink-0">
                        {selectedPatient.name.charAt(0).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="font-bold text-zinc-900 text-sm truncate">
                            {selectedPatient.name}
                          </p>
                          <Badge variant="outline" className="bg-white text-zinc-700 text-[10px] font-semibold">
                            {selectedPatient.patientId}
                          </Badge>
                          {selectedPatient.gender && (
                            <span className="text-[11px] text-zinc-500 font-medium">
                              {selectedPatient.gender}
                              {selectedPatient.age ? `, ${selectedPatient.age} yrs` : ""}
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-zinc-600 flex items-center gap-1 mt-0.5">
                          <Phone className="h-3 w-3 text-zinc-400" />
                          {selectedPatient.phone || "No phone registered"}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Casualty Status Alert if active */}
                  {selectedPatient.activeCasualtyVisit && (
                    <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl flex items-center justify-between text-xs text-amber-900">
                      <div className="flex items-center gap-2">
                        <Bandage className="h-4 w-4 text-orange-600 flex-shrink-0" />
                        <div>
                          <p className="font-bold text-amber-950">
                            Admitted in Casualty (Visit ID: {selectedPatient.activeCasualtyVisit.id.slice(-6)})
                          </p>
                          <p className="text-[11px] text-amber-700">
                            {selectedPatient.activeCasualtyVisit.chiefComplaint || "Active casualty admission"} • You can bill now or add to casualty account.
                          </p>
                        </div>
                      </div>
                      <Badge className="bg-amber-200 text-amber-900 border-0 text-[10px] uppercase font-bold">
                        {selectedPatient.activeCasualtyVisit.status}
                      </Badge>
                    </div>
                  )}
                </div>
              ) : (
                /* Patient Selection Tabs */
                <Tabs value={patientTab} onValueChange={setPatientTab}>
                  <TabsList className="grid grid-cols-3 h-9 w-full bg-muted/60 p-1 mb-3">
                    <TabsTrigger value="search" className="text-xs">
                      <Search className="h-3.5 w-3.5 mr-1.5" />
                      Search
                    </TabsTrigger>
                    <TabsTrigger value="casualty" className="text-xs">
                      <Bandage className="h-3.5 w-3.5 mr-1.5 text-orange-600" />
                      Casualty ({casualtyPatients.length})
                    </TabsTrigger>
                    <TabsTrigger value="orders" className="text-xs">
                      <Clock className="h-3.5 w-3.5 mr-1.5 text-blue-600" />
                      Doctor Orders ({pendingOrderPatients.length})
                    </TabsTrigger>
                  </TabsList>

                  {/* Tab 1: Live Patient Search */}
                  <TabsContent value="search" className="space-y-3 mt-0">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        placeholder="Search patient by Name, Phone, or UHID / Patient ID..."
                        value={searchTerm}
                        onChange={(e) => handleSearchPatient(e.target.value)}
                        className="pl-9 text-xs h-9"
                      />
                      {isSearching && (
                        <div className="absolute right-3 top-1/2 -translate-y-1/2">
                          <RefreshCw className="h-3.5 w-3.5 animate-spin text-muted-foreground" />
                        </div>
                      )}
                    </div>

                    {/* Search Results Dropdown/List */}
                    {searchResults.length > 0 && (
                      <div className="border rounded-xl divide-y bg-white shadow-sm max-h-56 overflow-y-auto">
                        {searchResults.map((p) => (
                          <div
                            key={p.id}
                            onClick={() => handleSelectPatient(p)}
                            className="p-2.5 hover:bg-blue-50/60 cursor-pointer transition-colors flex items-center justify-between text-xs"
                          >
                            <div className="flex items-center gap-2.5">
                              <div className="h-8 w-8 rounded-full bg-blue-100 text-[#0066CC] font-bold flex items-center justify-center text-xs">
                                {p.name.charAt(0).toUpperCase()}
                              </div>
                              <div>
                                <p className="font-semibold text-zinc-900">{p.name}</p>
                                <p className="text-[11px] text-zinc-500">
                                  {p.patientId} • {p.phone || "No phone"}
                                </p>
                              </div>
                            </div>
                            <div className="flex items-center gap-1.5">
                              {p.activeCasualtyVisit && (
                                <Badge className="bg-orange-100 text-orange-800 border-orange-200 text-[10px]">
                                  🏥 Casualty
                                </Badge>
                              )}
                              {(p.pendingTestCount || 0) > 0 && (
                                <Badge className="bg-blue-100 text-blue-800 border-blue-200 text-[10px]">
                                  {p.pendingTestCount} tests pending
                                </Badge>
                              )}
                              <Button size="sm" variant="outline" className="h-6 text-[10px] px-2 font-semibold">
                                Select
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </TabsContent>

                  {/* Tab 2: Casualty Patients */}
                  <TabsContent value="casualty" className="mt-0">
                    {casualtyPatients.length === 0 ? (
                      <div className="text-center py-6 text-muted-foreground text-xs">
                        <Bandage className="h-8 w-8 mx-auto mb-1.5 text-zinc-300" />
                        No patients currently admitted in Casualty
                      </div>
                    ) : (
                      <div className="border rounded-xl divide-y max-h-56 overflow-y-auto">
                        {casualtyPatients.map((c) => (
                          <div
                            key={c.casualtyVisitId}
                            onClick={() => handleSelectCasualtyPatient(c)}
                            className="p-2.5 hover:bg-amber-50/60 cursor-pointer transition-colors flex items-center justify-between text-xs"
                          >
                            <div className="flex items-center gap-2.5">
                              <div className="h-8 w-8 rounded-full bg-amber-100 text-amber-800 font-bold flex items-center justify-center text-xs">
                                🏥
                              </div>
                              <div>
                                <div className="flex items-center gap-1.5">
                                  <p className="font-bold text-zinc-900">{c.name}</p>
                                  <span className="text-[10px] text-zinc-500 font-medium">({c.uhid})</span>
                                </div>
                                <p className="text-[11px] text-amber-800 font-medium truncate max-w-[240px]">
                                  {c.chiefComplaint || "Casualty Admission"}
                                </p>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <Badge variant="outline" className="text-[10px] border-amber-300 text-amber-800 bg-amber-50">
                                Dr. {c.doctorName}
                              </Badge>
                              <Button size="sm" variant="default" className="h-6 text-[10px] px-2 bg-amber-600 hover:bg-amber-700">
                                Bill Patient
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </TabsContent>

                  {/* Tab 3: Doctor Orders Queue */}
                  <TabsContent value="orders" className="mt-0">
                    {pendingOrderPatients.length === 0 ? (
                      <div className="text-center py-6 text-muted-foreground text-xs">
                        <CheckCircle className="h-8 w-8 mx-auto mb-1.5 text-emerald-400" />
                        No doctor orders awaiting payment
                      </div>
                    ) : (
                      <div className="border rounded-xl divide-y max-h-56 overflow-y-auto">
                        {pendingOrderPatients.map((o) => (
                          <div
                            key={o.id}
                            onClick={() => handleSelectPendingOrderPatient(o)}
                            className="p-2.5 hover:bg-blue-50/60 cursor-pointer transition-colors flex items-center justify-between text-xs"
                          >
                            <div className="flex items-center gap-2.5">
                              <div className="h-8 w-8 rounded-full bg-blue-100 text-blue-700 font-bold flex items-center justify-center text-xs">
                                {o.name.charAt(0).toUpperCase()}
                              </div>
                              <div>
                                <p className="font-semibold text-zinc-900">{o.name}</p>
                                <p className="text-[11px] text-zinc-500">
                                  {o.patientId} • {o.phone || "No phone"}
                                </p>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <Badge className="bg-blue-100 text-blue-800 text-[10px]">
                                {o.pendingTestCount} test(s) ordered
                              </Badge>
                              <Button size="sm" variant="outline" className="h-6 text-[10px] px-2">
                                Load Tests
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </TabsContent>
                </Tabs>
              )}
            </CardContent>
          </Card>

          {/* 2. Admin Test Catalog Picker */}
          <Card className="border-border/60 shadow-xs">
            <CardHeader className="p-4 pb-2">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <CardTitle className="text-sm font-bold flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-teal-600" />
                    Admin Test Catalog
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Live rates & investigations from Admin Pathology & Radiology settings
                  </CardDescription>
                </div>

                {/* Type Filter Buttons */}
                <div className="flex items-center bg-muted/70 p-0.5 rounded-lg">
                  <button
                    type="button"
                    onClick={() => {
                      setCatalogFilterType("ALL")
                      setSelectedCategory("ALL")
                    }}
                    className={`px-2.5 py-1 text-xs rounded-md font-semibold transition-all ${
                      catalogFilterType === "ALL"
                        ? "bg-white text-zinc-900 shadow-xs"
                        : "text-zinc-600 hover:text-zinc-900"
                    }`}
                  >
                    All ({catalogTests.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setCatalogFilterType("PATHOLOGY")
                      setSelectedCategory("ALL")
                    }}
                    className={`px-2.5 py-1 text-xs rounded-md font-semibold flex items-center gap-1 transition-all ${
                      catalogFilterType === "PATHOLOGY"
                        ? "bg-white text-blue-700 shadow-xs"
                        : "text-zinc-600 hover:text-blue-700"
                    }`}
                  >
                    <Microscope className="h-3 w-3" /> Pathology
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setCatalogFilterType("RADIOLOGY")
                      setSelectedCategory("ALL")
                    }}
                    className={`px-2.5 py-1 text-xs rounded-md font-semibold flex items-center gap-1 transition-all ${
                      catalogFilterType === "RADIOLOGY"
                        ? "bg-white text-purple-700 shadow-xs"
                        : "text-zinc-600 hover:text-purple-700"
                    }`}
                  >
                    <Radiation className="h-3 w-3" /> Radiology
                  </button>
                </div>
              </div>

              {/* Search & Category Filter Row */}
              <div className="grid grid-cols-1 sm:grid-cols-12 gap-2 mt-3 pt-2 border-t">
                <div className="sm:col-span-8 relative">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                  <Input
                    placeholder="Search test by name, code, or category..."
                    value={catalogSearch}
                    onChange={(e) => setCatalogSearch(e.target.value)}
                    className="pl-8 h-8 text-xs"
                  />
                </div>
                <div className="sm:col-span-4">
                  <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                    <SelectTrigger className="h-8 text-xs">
                      <SelectValue placeholder="All Categories" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ALL">All Categories</SelectItem>
                      {availableCategories.map((c) => (
                        <SelectItem key={c} value={c}>
                          {c}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardHeader>

            <CardContent className="p-4 pt-2">
              {/* Test Items Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-72 overflow-y-auto pr-1">
                {filteredTests.length === 0 ? (
                  <div className="col-span-2 text-center py-8 text-muted-foreground text-xs">
                    No tests match your filter
                  </div>
                ) : (
                  filteredTests.map((test) => {
                    const isAdded = selectedItems.some((i) => i.name === test.name)
                    const isRadiology = test.type === "RADIOLOGY"

                    return (
                      <div
                        key={test.id}
                        className={`p-2.5 rounded-xl border text-xs flex flex-col justify-between transition-all ${
                          isAdded
                            ? "bg-teal-50/70 border-teal-300 ring-1 ring-teal-200"
                            : "bg-white hover:border-zinc-300 hover:shadow-xs"
                        }`}
                      >
                        <div>
                          <div className="flex items-center justify-between gap-1 mb-1">
                            <Badge
                              variant="outline"
                              className={`text-[9px] px-1.5 py-0 font-bold ${
                                isRadiology
                                  ? "bg-purple-50 text-purple-700 border-purple-200"
                                  : "bg-blue-50 text-blue-700 border-blue-200"
                              }`}
                            >
                              {isRadiology ? "🔬 Radiology" : "🧪 Pathology"}
                            </Badge>
                            {test.category && (
                              <span className="text-[10px] text-zinc-500 font-medium truncate max-w-[110px]">
                                {test.category}
                              </span>
                            )}
                          </div>
                          <p className="font-semibold text-zinc-900 line-clamp-1" title={test.name}>
                            {test.name}
                          </p>
                          {test.code && (
                            <p className="text-[10px] text-zinc-500">{test.code}</p>
                          )}
                        </div>

                        <div className="flex items-center justify-between mt-2 pt-1.5 border-t border-zinc-100">
                          <span className="font-extrabold text-zinc-900 text-sm">
                            ₹{test.price.toLocaleString("en-IN")}
                          </span>
                          <Button
                            type="button"
                            size="sm"
                            variant={isAdded ? "secondary" : "outline"}
                            className={`h-6 text-[10px] px-2 font-semibold ${
                              isAdded
                                ? "bg-teal-600 text-white hover:bg-teal-700 border-0"
                                : "text-teal-700 border-teal-300 hover:bg-teal-50"
                            }`}
                            onClick={() => handleAddCatalogTest(test)}
                          >
                            {isAdded ? (
                              <>
                                <Check className="h-3 w-3 mr-1" /> Add More
                              </>
                            ) : (
                              <>
                                <Plus className="h-3 w-3 mr-1" /> Add
                              </>
                            )}
                          </Button>
                        </div>
                      </div>
                    )
                  })
                )}
              </div>

              {/* Custom Non-Catalog Test Row */}
              <div className="mt-3 pt-3 border-t">
                {!showCustomItemRow ? (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="text-xs text-zinc-600 hover:text-zinc-900 h-7 px-2 font-medium"
                    onClick={() => setShowCustomItemRow(true)}
                  >
                    <Plus className="h-3.5 w-3.5 mr-1 text-teal-600" />
                    + Add Custom / Non-Catalog Investigation
                  </Button>
                ) : (
                  <div className="p-3 bg-zinc-50 border rounded-xl space-y-2 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-zinc-800">Add Custom Test</span>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-6 w-6 p-0 text-zinc-400"
                        onClick={() => setShowCustomItemRow(false)}
                      >
                        ✕
                      </Button>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-12 gap-2">
                      <div className="sm:col-span-6">
                        <Input
                          placeholder="Test Name (e.g. Special Biopsy)"
                          value={customName}
                          onChange={(e) => setCustomName(e.target.value)}
                          className="h-8 text-xs"
                        />
                      </div>
                      <div className="sm:col-span-3">
                        <Input
                          type="number"
                          placeholder="Rate (₹)"
                          value={customPrice}
                          onChange={(e) =>
                            setCustomPrice(e.target.value ? parseFloat(e.target.value) : "")
                          }
                          className="h-8 text-xs"
                        />
                      </div>
                      <div className="sm:col-span-3">
                        <Select
                          value={customType}
                          onValueChange={(v: "PATHOLOGY" | "RADIOLOGY") => setCustomType(v)}
                        >
                          <SelectTrigger className="h-8 text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="PATHOLOGY">🧪 Pathology</SelectItem>
                            <SelectItem value="RADIOLOGY">🔬 Radiology</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <Button
                      type="button"
                      size="sm"
                      onClick={handleAddCustomItem}
                      className="h-7 text-xs bg-teal-600 hover:bg-teal-700 text-white font-semibold"
                    >
                      Add Custom Item
                    </Button>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* RIGHT COLUMN: Bill Line Items & Payment Counter (5 cols on lg) */}
        <div className="lg:col-span-5 space-y-5">
          {/* Bill Table Card */}
          <Card className="border-border/60 shadow-xs">
            <CardHeader className="p-4 pb-2">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-sm font-bold flex items-center gap-2">
                    <CreditCard className="h-4 w-4 text-emerald-600" />
                    Bill Items ({selectedItems.length})
                  </CardTitle>
                  <CardDescription className="text-xs">
                    {pathologyCount > 0 && `${pathologyCount} Pathology`}
                    {pathologyCount > 0 && radiologyCount > 0 && " • "}
                    {radiologyCount > 0 && `${radiologyCount} Radiology`}
                  </CardDescription>
                </div>

                {selectedItems.length > 0 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 text-xs text-red-600 hover:bg-red-50"
                    onClick={() => setSelectedItems([])}
                  >
                    Clear All
                  </Button>
                )}
              </div>
            </CardHeader>

            <CardContent className="p-4 pt-2 space-y-4">
              {/* Selected Items Table */}
              {selectedItems.length === 0 ? (
                <div className="text-center py-10 border border-dashed rounded-xl bg-zinc-50/50 text-muted-foreground text-xs">
                  <Microscope className="h-8 w-8 mx-auto mb-2 text-zinc-300" />
                  <p className="font-semibold text-zinc-600">No tests added yet</p>
                  <p className="text-[11px] text-zinc-400 mt-0.5">
                    Select a patient and click &quot;+ Add&quot; on tests from the catalog
                  </p>
                </div>
              ) : (
                <div className="border rounded-xl overflow-hidden">
                  <Table className="text-xs">
                    <TableHeader className="bg-muted/50">
                      <TableRow>
                        <TableHead className="py-2">Test Name</TableHead>
                        <TableHead className="py-2 text-center w-16">Qty</TableHead>
                        <TableHead className="py-2 text-right">Price</TableHead>
                        <TableHead className="py-2 text-right">Total</TableHead>
                        <TableHead className="py-2 w-8"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {selectedItems.map((item, index) => {
                        const lineTotal = item.quantity * item.unitPrice
                        return (
                          <TableRow key={index} className="hover:bg-muted/30">
                            <TableCell className="py-2 font-medium">
                              <div className="flex items-center gap-1.5">
                                <span>{item.type === "RADIOLOGY" ? "🔬" : "🧪"}</span>
                                <span className="line-clamp-1">{item.name}</span>
                              </div>
                            </TableCell>
                            <TableCell className="py-2 text-center">
                              <div className="flex items-center justify-center gap-1">
                                <button
                                  type="button"
                                  onClick={() => handleUpdateQuantity(index, item.quantity - 1)}
                                  disabled={item.quantity <= 1}
                                  className="h-5 w-5 rounded bg-zinc-100 hover:bg-zinc-200 text-zinc-700 disabled:opacity-30"
                                >
                                  -
                                </button>
                                <span className="w-5 font-bold text-center">{item.quantity}</span>
                                <button
                                  type="button"
                                  onClick={() => handleUpdateQuantity(index, item.quantity + 1)}
                                  className="h-5 w-5 rounded bg-zinc-100 hover:bg-zinc-200 text-zinc-700"
                                >
                                  +
                                </button>
                              </div>
                            </TableCell>
                            <TableCell className="py-2 text-right text-zinc-600">
                              ₹{item.unitPrice.toLocaleString("en-IN")}
                            </TableCell>
                            <TableCell className="py-2 text-right font-bold text-zinc-900">
                              ₹{lineTotal.toLocaleString("en-IN")}
                            </TableCell>
                            <TableCell className="py-2 text-center">
                              <button
                                type="button"
                                onClick={() => handleRemoveItem(index)}
                                className="text-zinc-400 hover:text-red-600 transition-colors"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            </TableCell>
                          </TableRow>
                        )
                      })}
                    </TableBody>
                  </Table>
                </div>
              )}

              {/* Financial Calculation Summary */}
              {selectedItems.length > 0 && (
                <div className="space-y-3 pt-2">
                  <div className="p-3 bg-muted/40 rounded-xl space-y-2 text-xs">
                    <div className="flex justify-between text-zinc-600">
                      <span>Subtotal ({selectedItems.length} items):</span>
                      <span className="font-semibold text-zinc-900">
                        ₹{subtotal.toLocaleString("en-IN")}
                      </span>
                    </div>

                    {/* Discount Input */}
                    <div className="flex items-center justify-between gap-2 pt-1 border-t border-zinc-200/60">
                      <div className="flex items-center gap-1.5">
                        <span className="text-zinc-600">Discount:</span>
                        <div className="flex bg-white rounded border overflow-hidden text-[10px]">
                          <button
                            type="button"
                            onClick={() => setDiscountType("AMOUNT")}
                            className={`px-1.5 py-0.5 font-bold ${
                              discountType === "AMOUNT" ? "bg-zinc-800 text-white" : "text-zinc-600"
                            }`}
                          >
                            ₹
                          </button>
                          <button
                            type="button"
                            onClick={() => setDiscountType("PERCENT")}
                            className={`px-1.5 py-0.5 font-bold ${
                              discountType === "PERCENT" ? "bg-zinc-800 text-white" : "text-zinc-600"
                            }`}
                          >
                            %
                          </button>
                        </div>
                      </div>
                      <div className="w-24">
                        <Input
                          type="number"
                          min="0"
                          max={discountType === "PERCENT" ? 100 : subtotal}
                          value={discountValue || ""}
                          onChange={(e) =>
                            setDiscountValue(e.target.value ? parseFloat(e.target.value) : 0)
                          }
                          className="h-7 text-xs text-right"
                          placeholder="0"
                        />
                      </div>
                    </div>

                    {discountAmount > 0 && (
                      <div className="flex justify-between text-emerald-700 font-medium">
                        <span>Discount applied:</span>
                        <span>- ₹{discountAmount.toLocaleString("en-IN")}</span>
                      </div>
                    )}

                    {/* Net Total Payable */}
                    <div className="flex justify-between text-sm font-extrabold text-zinc-900 pt-2 border-t border-zinc-200">
                      <span>Net Payable:</span>
                      <span className="text-base text-[#0066CC]">
                        ₹{netAmount.toLocaleString("en-IN")}
                      </span>
                    </div>
                  </div>

                  {/* Payment Method Selector */}
                  <div className="space-y-2">
                    <label className="text-xs font-semibold text-zinc-700 flex items-center justify-between">
                      <span>Payment Method</span>
                      {selectedPatient?.activeCasualtyVisit && (
                        <span className="text-[10px] text-orange-600 font-bold">
                          Casualty Patient
                        </span>
                      )}
                    </label>

                    <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                      <SelectTrigger className="h-9 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {PAYMENT_METHOD_OPTIONS.map((opt) => (
                          <SelectItem key={opt.value} value={opt.value}>
                            {opt.label}
                          </SelectItem>
                        ))}
                        <SelectItem value="CREDIT">Patient / Hospital Credit</SelectItem>
                        <SelectItem value="SPLIT">Split Payment (Cash + UPI + Card)</SelectItem>
                      </SelectContent>
                    </Select>

                    {/* Cash Received Tender Calculator */}
                    {paymentMethod === "CASH" && (
                      <div className="p-2.5 bg-blue-50/50 border border-blue-100 rounded-xl space-y-1.5 text-xs">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-zinc-600">Cash Received:</span>
                          <Input
                            type="number"
                            min="0"
                            placeholder={`₹${netAmount}`}
                            value={cashTendered}
                            onChange={(e) =>
                              setCashTendered(e.target.value ? parseFloat(e.target.value) : "")
                            }
                            className="h-7 w-28 text-xs text-right bg-white"
                          />
                        </div>
                        {typeof cashTendered === "number" && cashTendered >= netAmount && (
                          <div className="flex justify-between font-bold text-emerald-700 pt-1 border-t border-blue-100">
                            <span>Change to Return:</span>
                            <span>₹{changeToReturn.toLocaleString("en-IN")}</span>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Split Payment Breakdown */}
                    {paymentMethod === "SPLIT" && (
                      <div className="p-3 bg-muted/50 border rounded-xl space-y-2 text-xs">
                        <p className="font-semibold text-zinc-800">Split Breakdown:</p>
                        <div className="grid grid-cols-3 gap-2">
                          <div>
                            <span className="text-[10px] text-zinc-500">Cash (₹)</span>
                            <Input
                              type="number"
                              min="0"
                              value={splitCash}
                              onChange={(e) =>
                                setSplitCash(e.target.value ? parseFloat(e.target.value) : "")
                              }
                              className="h-7 text-xs bg-white"
                            />
                          </div>
                          <div>
                            <span className="text-[10px] text-zinc-500">UPI (₹)</span>
                            <Input
                              type="number"
                              min="0"
                              value={splitUpi}
                              onChange={(e) =>
                                setSplitUpi(e.target.value ? parseFloat(e.target.value) : "")
                              }
                              className="h-7 text-xs bg-white"
                            />
                          </div>
                          <div>
                            <span className="text-[10px] text-zinc-500">Card (₹)</span>
                            <Input
                              type="number"
                              min="0"
                              value={splitCard}
                              onChange={(e) =>
                                setSplitCard(e.target.value ? parseFloat(e.target.value) : "")
                              }
                              className="h-7 text-xs bg-white"
                            />
                          </div>
                        </div>
                        <div className="flex justify-between font-bold pt-1 text-[11px]">
                          <span>Allocated: ₹{totalSplitPaid.toLocaleString("en-IN")}</span>
                          <span className={splitBalance === 0 ? "text-emerald-600" : "text-red-600"}>
                            {splitBalance === 0 ? "✓ Balanced" : `Remaining: ₹${splitBalance}`}
                          </span>
                        </div>
                      </div>
                    )}

                    {/* Transaction / Reference ID */}
                    {(paymentMethod === "UPI" ||
                      paymentMethod === "CARD" ||
                      paymentMethod === "BANK_TRANSFER") && (
                      <Input
                        placeholder="Transaction / UTR / Reference ID (optional)"
                        value={transactionId}
                        onChange={(e) => setTransactionId(e.target.value)}
                        className="h-8 text-xs"
                      />
                    )}

                    {/* Billing Notes */}
                    <Input
                      placeholder="Billing notes / Advisory (optional)"
                      value={billingNotes}
                      onChange={(e) => setBillingNotes(e.target.value)}
                      className="h-8 text-xs"
                    />
                  </div>

                  {/* Submission Action Buttons */}
                  <div className="space-y-2 pt-2">
                    {/* Primary Button: Collect Payment & Generate Diagnostic Bill */}
                    <Button
                      type="button"
                      disabled={isPending || selectedItems.length === 0 || !selectedPatient}
                      onClick={() => handleSubmitBill(false)}
                      className="w-full h-10 bg-[#0066CC] hover:bg-[#0052a3] text-white font-bold text-xs shadow-sm flex items-center justify-center gap-2"
                    >
                      {isPending ? (
                        <RefreshCw className="h-4 w-4 animate-spin" />
                      ) : (
                        <CreditCard className="h-4 w-4" />
                      )}
                      Collect & Generate Bill (₹{netAmount.toLocaleString("en-IN")})
                    </Button>

                    {/* Secondary Option: If patient is in Casualty, allow adding to Casualty Bill directly */}
                    {selectedPatient?.activeCasualtyVisit && (
                      <Button
                        type="button"
                        variant="outline"
                        disabled={isPending || selectedItems.length === 0}
                        onClick={() => handleSubmitBill(true)}
                        className="w-full h-9 border-orange-300 text-orange-700 bg-orange-50/60 hover:bg-orange-100 font-semibold text-xs shadow-xs flex items-center justify-center gap-1.5"
                      >
                        <Bandage className="h-3.5 w-3.5 text-orange-600" />
                        Add to Casualty Bill (Pay at Discharge / Counter)
                      </Button>
                    )}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
