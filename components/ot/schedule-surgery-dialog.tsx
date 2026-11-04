"use client"

import { useState, useTransition, useEffect } from "react"
import { Button } from "@/components/ui/button"
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { ArrowLeft, ArrowRight, CreditCard, Plus, ShieldCheck, Check, ChevronsUpDown, Trash2, ChevronDown } from "lucide-react"
import { toast } from "sonner"
import { scheduleSurgery } from "@/lib/actions"
import { Checkbox } from "@/components/ui/checkbox"
import { PAYMENT_METHOD_OPTIONS } from "@/lib/payment-routing"
import { cn } from "@/lib/utils"
import {
  Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList,
} from "@/components/ui/command"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { useRouter } from "next/navigation"

type SearchPatient = {
  id: string; patientId: string; user?: { name?: string | null }
}
type SearchDoctor = {
  id: string; employeeId?: string; specialization?: string | null; user?: { name?: string | null }
}
type TheaterOption = { id: string; name: string; type?: string }

type ChargeItem = {
  chargeLabel: string; chargeType: string; amount: number; isOptional: boolean
}
type ProcedureTemplate = {
  id: string; name: string; code: string | null; category: string | null
  estimatedDuration: number | null; theaterType: string | null; totalCharge: number
  chargeComponents: ChargeItem[]
}

export function ScheduleSurgeryDialog({ procedures }: { procedures?: ProcedureTemplate[] }) {
  const [open, setOpen] = useState(false)
  const [isPending, startTransition] = useTransition()
  const [step, setStep] = useState<1 | 2>(1)
  const router = useRouter()

  const [patientOpen, setPatientOpen] = useState(false)
  const [doctorOpen, setDoctorOpen] = useState(false)

  const [patientSearch, setPatientSearch] = useState("")
  const [selectedPatient, setSelectedPatient] = useState<SearchPatient | null>(null)
  const [doctorSearch, setDoctorSearch] = useState("")
  const [selectedDoctor, setSelectedDoctor] = useState<SearchDoctor | null>(null)
  const [selectedTheater, setSelectedTheater] = useState<TheaterOption | null>(null)

  const [patients, setPatients] = useState<SearchPatient[]>([])
  const [doctors, setDoctors] = useState<SearchDoctor[]>([])
  const [theaters, setTheaters] = useState<TheaterOption[]>([])

  const [searchingPatients, setSearchingPatients] = useState(false)
  const [searchingDoctors, setSearchingDoctors] = useState(false)
  const [loadingTheaters, setLoadingTheaters] = useState(false)

  // Step 1 fields
  const [selectedProcedureId, setSelectedProcedureId] = useState("")
  const [procedureName, setProcedureName] = useState("")
  const [scheduledDate, setScheduledDate] = useState("")
  const [durationMinutes, setDurationMinutes] = useState("60")
  const [diagnosis, setDiagnosis] = useState("")
  const [estimatedCost, setEstimatedCost] = useState("")
  const [isEmergency, setIsEmergency] = useState(false)

  // Step 2: charge breakdown
  const [chargeBreakdown, setChargeBreakdown] = useState<ChargeItem[]>([])
  const [paymentMethod, setPaymentMethod] = useState("")

  // BSKY state
  const [isBskyPatient, setIsBskyPatient] = useState(false)
  const [checkingBsky, setCheckingBsky] = useState(false)

  const totalCharge = chargeBreakdown.reduce((s, c) => s + (c.amount || 0), 0)

  useEffect(() => {
    if (typeof window === "undefined") return
    try {
      const raw = window.localStorage.getItem("recentInsuranceRegistration")
      if (!raw) return
      const recent = JSON.parse(raw) as {
        patientId?: string; diagnosis?: string; estimatedCost?: string; schemeType?: string
      }
      if (!recent?.patientId) return

      const prefilledPatient = patients.find((p) => p.id === recent.patientId)
      if (prefilledPatient) {
        setSelectedPatient(prefilledPatient)
        setDiagnosis((prev) => prev || recent.diagnosis || "")
        setEstimatedCost((prev) => prev || recent.estimatedCost || "")
        if (recent.schemeType === "BSKY") setPaymentMethod("BSKY")
        else if (recent.schemeType === "PRIVATE") setPaymentMethod((prev) => prev || "INSURANCE")
      }
    } catch { /* ignore */ }
  }, [patients])

  useEffect(() => {
    if (selectedPatient?.id) checkBskyStatus(selectedPatient.id)
    else setIsBskyPatient(false)
  }, [selectedPatient?.id])

  // When moving to step 2, populate charge breakdown
  useEffect(() => {
    if (step === 2 && chargeBreakdown.length === 0) {
      if (estimatedCost && !selectedProcedureId) {
        // No procedure selected — use single line item
        setChargeBreakdown([{
          chargeLabel: "Surgery Charge", chargeType: "SURGERY_TOTAL",
          amount: parseFloat(estimatedCost) || 0, isOptional: false,
        }])
      }
    }
  }, [step])

  const checkBskyStatus = async (patientId: string) => {
    setCheckingBsky(true)
    try {
      const res = await fetch(`/api/patients/${patientId}/bsky-status`)
      if (res.ok) {
        const data = await res.json()
        setIsBskyPatient(data.isBsky || false)
        if (data.isBsky) setPaymentMethod("BSKY")
      }
    } catch { /* Non-critical */ }
    finally { setCheckingBsky(false) }
  }

  useEffect(() => {
    if (!patientOpen) return
    const t = setTimeout(() => handlePatientSearch(patientSearch), 300)
    return () => clearTimeout(t)
  }, [patientSearch, patientOpen])

  useEffect(() => {
    if (!doctorOpen) return
    const t = setTimeout(() => handleDoctorSearch(doctorSearch), 300)
    return () => clearTimeout(t)
  }, [doctorSearch, doctorOpen])

  const handlePatientSearch = async (query?: string) => {
    const q = typeof query === "string" ? query : patientSearch
    setSearchingPatients(true)
    try {
      const r = await fetch(`/api/patients/search?query=${encodeURIComponent(q)}`)
      const d = await r.json()
      setPatients(d.patients || [])
    } catch { toast.error("Failed to search patients") }
    finally { setSearchingPatients(false) }
  }

  const handleDoctorSearch = async (query?: string) => {
    const q = typeof query === "string" ? query : doctorSearch
    setSearchingDoctors(true)
    try {
      const r = await fetch(`/api/staff/doctors?query=${encodeURIComponent(q)}`)
      const d = await r.json()
      setDoctors(d.doctors || [])
    } catch { toast.error("Failed to search doctors") }
    finally { setSearchingDoctors(false) }
  }

  const loadTheaters = async () => {
    setLoadingTheaters(true)
    try {
      const r = await fetch("/api/ot/theaters")
      const d = await r.json()
      setTheaters(d.theaters || [])
    } catch { toast.error("Failed to load theaters") }
    finally { setLoadingTheaters(false) }
  }

  const handleProcedureSelect = (procId: string) => {
    setSelectedProcedureId(procId)
    if (!procedures) return
    const p = procedures.find(pr => pr.id === procId)
    if (p) {
      setProcedureName(p.name)
      setEstimatedCost(String(p.totalCharge))
      if (p.estimatedDuration) setDurationMinutes(String(p.estimatedDuration))
      setChargeBreakdown(p.chargeComponents.map(c => ({ ...c })))
    }
  }

  const isBskyCashless = isBskyPatient || paymentMethod === "BSKY"

  const validateStep1 = (): boolean => {
    if (!selectedPatient) { toast.error("Please select a patient"); return false }
    if (!selectedDoctor) { toast.error("Please select a surgeon"); return false }
    if (!selectedTheater) { toast.error("Please select a theater"); return false }
    if (!procedureName.trim()) { toast.error("Procedure name is required"); return false }
    if (!scheduledDate) { toast.error("Scheduled date/time is required"); return false }
    if (!durationMinutes || parseInt(durationMinutes) < 15) { toast.error("Duration must be at least 15 minutes"); return false }
    return true
  }

  const handleNext = () => {
    if (validateStep1()) {
      // If no procedure template selected and no breakdown yet, create single-line
      if (chargeBreakdown.length === 0 && estimatedCost) {
        setChargeBreakdown([{
          chargeLabel: "Surgery Charge", chargeType: "SURGERY_TOTAL",
          amount: parseFloat(estimatedCost) || 0, isOptional: false,
        }])
      }
      setStep(2)
    }
  }

  const updateChargeAmount = (i: number, amount: number) => {
    const updated = [...chargeBreakdown]
    updated[i] = { ...updated[i], amount }
    setChargeBreakdown(updated)
  }

  const removeCharge = (i: number) => {
    setChargeBreakdown(chargeBreakdown.filter((_, idx) => idx !== i))
  }

  const addCustomCharge = () => {
    setChargeBreakdown([...chargeBreakdown, {
      chargeLabel: "Custom Charge", chargeType: "CUSTOM",
      amount: 0, isOptional: true,
    }])
  }

  const handleSubmit = () => {
    if (!isBskyCashless && totalCharge <= 0) {
      toast.error("Total charge must be greater than ₹0"); return
    }
    if (!isBskyCashless && !paymentMethod) {
      toast.error("Please select a payment method"); return
    }

    const formData = new FormData()
    formData.set("patientId", selectedPatient!.id)
    formData.set("leadSurgeonId", selectedDoctor!.id)
    formData.set("theaterId", selectedTheater!.id)
    formData.set("procedureName", procedureName)
    formData.set("scheduledDate", scheduledDate)
    formData.set("durationMinutes", durationMinutes)
    formData.set("isEmergency", isEmergency ? "true" : "false")
    formData.set("diagnosis", diagnosis)
    formData.set("estimatedCost", String(totalCharge))
    formData.set("surgeryCharge", String(totalCharge))
    formData.set("paymentMethod", isBskyCashless ? "BSKY" : paymentMethod)
    if (selectedProcedureId) formData.set("procedureTemplateId", selectedProcedureId)
    formData.set("chargeBreakdown", JSON.stringify(chargeBreakdown))

    startTransition(async () => {
      try {
        const result = await scheduleSurgery(formData)
        if (result.success) {
          toast.success(result.message || "Surgery scheduled successfully")
          resetAndClose()
          if (result.data?.billingId) router.push(`/dashboard/finance/billing/${result.data.billingId}`)
        } else {
          toast.error(result.message || "Failed to schedule surgery")
        }
      } catch (error: unknown) {
        toast.error(error instanceof Error ? error.message : "An error occurred")
      }
    })
  }

  const resetAndClose = () => {
    setOpen(false); setStep(1)
    setSelectedPatient(null); setSelectedDoctor(null); setSelectedTheater(null)
    setPatientSearch(""); setDoctorSearch(""); setPatients([]); setDoctors([])
    setProcedureName(""); setScheduledDate(""); setDurationMinutes("60"); setDiagnosis("")
    setEstimatedCost(""); setIsEmergency(false); setChargeBreakdown([])
    setPaymentMethod(""); setIsBskyPatient(false); setSelectedProcedureId("")
  }

  return (
    <Dialog open={open} onOpenChange={(isOpen) => { if (isOpen) { loadTheaters(); setStep(1) }; setOpen(isOpen) }}>
      <DialogTrigger asChild>
        <Button><Plus className="h-4 w-4 mr-2" />Schedule Surgery</Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {step === 1 ? "Step 1: Clinical & Scheduling Details" : "Step 2: Charge Breakdown & Payment"}
          </DialogTitle>
          <DialogDescription>
            {step === 1
              ? "Select the patient, surgeon, theater, and procedure details."
              : "Review the itemized charges and collect payment."}
          </DialogDescription>
        </DialogHeader>

        {/* ── STEP 1 ─────────────── */}
        {step === 1 && (
          <div className="space-y-4">
            {/* Patient */}
            <div className="space-y-2">
              <Label>Patient *</Label>
              <Popover open={patientOpen} onOpenChange={setPatientOpen} modal={true}>
                <PopoverTrigger asChild>
                  <Button variant="outline" role="combobox" aria-expanded={patientOpen}
                    className="w-full justify-between font-normal bg-background h-auto py-2.5">
                    <span className="truncate">
                      {selectedPatient ? `${selectedPatient.user?.name || selectedPatient.patientId} - ${selectedPatient.patientId}` : "Select patient..."}
                    </span>
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[400px] p-0" align="start">
                  <Command shouldFilter={false}>
                    <CommandInput placeholder="Search patient by name or ID..." value={patientSearch} onValueChange={setPatientSearch} />
                    <CommandList>
                      <CommandEmpty>{searchingPatients ? "Searching..." : "No patients found."}</CommandEmpty>
                      <CommandGroup>
                        {patients.map(p => (
                          <CommandItem key={p.id} value={`${p.id} ${p.user?.name || ''} ${p.patientId}`}
                            onSelect={() => { setSelectedPatient(p); setPatientSearch(""); setPatientOpen(false) }}>
                            <Check className={cn("mr-2 h-4 w-4", selectedPatient?.id === p.id ? "opacity-100" : "opacity-0")} />
                            {p.user?.name || p.patientId} - {p.patientId}
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
              {isBskyPatient && (
                <Alert className="border-green-300 bg-green-50 dark:bg-green-900/20 mt-2">
                  <ShieldCheck className="h-4 w-4 text-green-600" />
                  <AlertDescription className="text-green-800 dark:text-green-200 text-sm">
                    BSKY Beneficiary detected — surgery will be scheduled as <strong>Cashless</strong>.
                  </AlertDescription>
                </Alert>
              )}
            </div>

            {/* Surgeon */}
            <div className="space-y-2">
              <Label>Lead Surgeon *</Label>
              <Popover open={doctorOpen} onOpenChange={setDoctorOpen} modal={true}>
                <PopoverTrigger asChild>
                  <Button variant="outline" role="combobox" aria-expanded={doctorOpen}
                    className="w-full justify-between font-normal bg-background h-auto py-2.5">
                    <span className="truncate">
                      {selectedDoctor ? `Dr. ${selectedDoctor.user?.name || selectedDoctor.employeeId} - ${selectedDoctor.specialization || "General"}` : "Select surgeon..."}
                    </span>
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[400px] p-0" align="start">
                  <Command shouldFilter={false}>
                    <CommandInput placeholder="Search for surgeon..." value={doctorSearch} onValueChange={setDoctorSearch} />
                    <CommandList>
                      <CommandEmpty>{searchingDoctors ? "Searching..." : "No doctors found."}</CommandEmpty>
                      <CommandGroup>
                        {doctors.map(d => (
                          <CommandItem key={d.id} value={`${d.id} ${d.user?.name || ''} ${d.specialization || ''}`}
                            onSelect={() => { setSelectedDoctor(d); setDoctorSearch(""); setDoctorOpen(false) }}>
                            <Check className={cn("mr-2 h-4 w-4", selectedDoctor?.id === d.id ? "opacity-100" : "opacity-0")} />
                            Dr. {d.user?.name} - {d.specialization || "General"}
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
            </div>

            {/* Theater */}
            <div className="space-y-2">
              <Label>Operation Theater *</Label>
              <Select value={selectedTheater?.id || ""}
                onValueChange={(v) => setSelectedTheater(theaters.find(t => t.id === v) || null)}>
                <SelectTrigger><SelectValue placeholder="Select a theater" /></SelectTrigger>
                <SelectContent>
                  {theaters.map(t => <SelectItem key={t.id} value={t.id}>{t.name} ({t.type})</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            {/* Procedure Template (NEW) */}
            {procedures && procedures.length > 0 && (
              <div className="space-y-2">
                <Label>Select Procedure Template</Label>
                <Select value={selectedProcedureId} onValueChange={handleProcedureSelect}>
                  <SelectTrigger><SelectValue placeholder="Choose from saved procedures (optional)" /></SelectTrigger>
                  <SelectContent>
                    {procedures.map(p => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.name} — ₹{p.totalCharge.toLocaleString("en-IN")}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">Selecting a template auto-fills charges. You can still edit them.</p>
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2 col-span-2">
                <Label htmlFor="procedureName">Procedure Name *</Label>
                <Input id="procedureName" placeholder="e.g., Appendectomy, CABG"
                  value={procedureName} onChange={(e) => setProcedureName(e.target.value)} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="scheduledDate">Scheduled Date & Time *</Label>
                <Input id="scheduledDate" type="datetime-local" value={scheduledDate}
                  onChange={(e) => setScheduledDate(e.target.value)} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="durationMinutes">Duration (minutes) *</Label>
                <Input id="durationMinutes" type="number" min="15" step="15" value={durationMinutes}
                  onChange={(e) => setDurationMinutes(e.target.value)} required />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="diagnosis">Pre-operative Diagnosis</Label>
              <Textarea id="diagnosis" placeholder="Brief diagnosis..." rows={2} value={diagnosis}
                onChange={(e) => setDiagnosis(e.target.value)} />
            </div>

            {!selectedProcedureId && (
              <div className="space-y-2">
                <Label htmlFor="estimatedCost">Estimated Cost (₹)</Label>
                <Input id="estimatedCost" type="number" step="0.01" placeholder="0.00"
                  value={estimatedCost} onChange={(e) => setEstimatedCost(e.target.value)} />
              </div>
            )}

            <div className="flex items-center space-x-2">
              <Checkbox id="isEmergency" checked={isEmergency} onCheckedChange={(c) => setIsEmergency(c === true)} />
              <Label htmlFor="isEmergency" className="font-normal cursor-pointer">This is an emergency surgery</Label>
            </div>

            <div className="flex justify-end gap-2 pt-4">
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
              <Button type="button" onClick={handleNext}>Next: Payment<ArrowRight className="h-4 w-4 ml-2" /></Button>
            </div>
          </div>
        )}

        {/* ── STEP 2: Charge Breakdown & Payment ─────────────── */}
        {step === 2 && (
          <div className="space-y-5">
            {/* Summary */}
            <div className="rounded-lg border bg-muted/40 p-4 space-y-2 text-sm">
              <h4 className="font-semibold text-base">Surgery Summary</h4>
              <div className="grid grid-cols-2 gap-x-6 gap-y-1">
                <span className="text-muted-foreground">Patient:</span>
                <span className="font-medium">{selectedPatient?.user?.name || selectedPatient?.patientId}</span>
                <span className="text-muted-foreground">Surgeon:</span>
                <span className="font-medium">Dr. {selectedDoctor?.user?.name}</span>
                <span className="text-muted-foreground">Procedure:</span>
                <span className="font-medium">{procedureName}</span>
                <span className="text-muted-foreground">Theater:</span>
                <span className="font-medium">{selectedTheater?.name}</span>
              </div>
            </div>

            {isBskyCashless && (
              <Alert className="border-green-300 bg-green-50 dark:bg-green-900/20">
                <ShieldCheck className="h-4 w-4 text-green-600" />
                <AlertDescription className="text-green-800 dark:text-green-200 text-sm">
                  <strong>BSKY Cashless Surgery</strong> — No payment collection required.
                </AlertDescription>
              </Alert>
            )}

            {/* Charge Breakdown Table */}
            <div className="space-y-2">
              <Label className="text-base font-semibold">Charge Breakdown</Label>
              <div className="border rounded-lg divide-y">
                {chargeBreakdown.map((c, i) => (
                  <div key={i} className="flex items-center gap-3 px-4 py-2.5 hover:bg-muted/30">
                    <span className="text-xs text-muted-foreground w-5">{i + 1}.</span>
                    <span className="flex-1 text-sm font-medium">{c.chargeLabel}</span>
                    <div className="w-32">
                      <div className="relative">
                        <span className="absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground text-xs">₹</span>
                        <Input type="number" min={0} step={100}
                          value={c.amount || ""} className="h-8 text-sm pl-5 text-right font-mono"
                          onChange={(e) => updateChargeAmount(i, parseFloat(e.target.value) || 0)} />
                      </div>
                    </div>
                    {chargeBreakdown.length > 1 && (
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-red-400 hover:text-red-600"
                        onClick={() => removeCharge(i)}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    )}
                  </div>
                ))}
              </div>
              <Button variant="outline" size="sm" className="text-xs mt-1" onClick={addCustomCharge}>
                <Plus className="h-3 w-3 mr-1" />Add Charge
              </Button>
            </div>

            {/* Total */}
            <div className="rounded-lg border p-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CreditCard className="h-5 w-5 text-muted-foreground" />
                <span className="font-medium">{isBskyCashless ? "Government Claim Amount" : "Total Amount"}</span>
              </div>
              <span className="text-2xl font-bold">
                ₹{totalCharge.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
              </span>
            </div>

            {/* Payment Method */}
            {!isBskyCashless && (
              <div className="space-y-2">
                <Label>Payment Method *</Label>
                <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                  <SelectTrigger><SelectValue placeholder="Select payment method" /></SelectTrigger>
                  <SelectContent>
                    {PAYMENT_METHOD_OPTIONS.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="flex justify-between gap-2 pt-4">
              <Button type="button" variant="outline" onClick={() => setStep(1)}>
                <ArrowLeft className="h-4 w-4 mr-2" />Back
              </Button>
              <Button type="button" onClick={handleSubmit}
                disabled={isPending || (!isBskyCashless && (!paymentMethod || totalCharge <= 0))}
                className={isBskyCashless ? "bg-green-600 hover:bg-green-700" : ""}>
                {isPending ? "Processing..." : isBskyCashless ? "Confirm Cashless Surgery" : "Collect Payment & Confirm"}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
