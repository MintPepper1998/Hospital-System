"use client"

import { useState } from "react"
import Link from "next/link"
import { format } from "date-fns"
import {
  Scissors,
  Pill,
  Search,
  Filter,
  Calendar,
  Clock,
  User,
  Building,
  ChevronDown,
  ChevronUp,
  Package,
  DollarSign,
  Activity,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  Plus,
  RefreshCw,
  Sparkles,
  RotateCcw,
  Loader2,
  Syringe,
  FileText,
  X,
} from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"
import { toast } from "sonner"
import { OTSurgeryItem, OTMedicineSummary, OTSurgeryMedicine } from "@/app/actions/ot-medicine"
import { returnMedicineFromSurgery } from "@/app/actions/ot-operation-management"
import { SurgeryOperationManagerModal } from "@/components/ot/surgery-operation-manager-modal"
import { useRouter } from "next/navigation"

interface OTMedicineClientProps {
  initialSummary: OTMedicineSummary
  initialSurgeries: OTSurgeryItem[]
}

export function OTMedicineClient({ initialSummary, initialSurgeries }: OTMedicineClientProps) {
  const router = useRouter()
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState("ALL")
  const [expandedSurgeryId, setExpandedSurgeryId] = useState<string | null>(null)

  // Full Manager Modal (for Adding / Dispensing / Searching inventory)
  const [managerSurgeryId, setManagerSurgeryId] = useState<string | null>(null)
  const [managerModalOpen, setManagerModalOpen] = useState(false)
  const [managerDefaultTab, setManagerDefaultTab] = useState("medicines")

  // Quick Return Sub-Modal
  const [returnModalOpen, setReturnModalOpen] = useState(false)
  const [returnSurgeryId, setReturnSurgeryId] = useState<string | null>(null)
  const [returnItem, setReturnItem] = useState<OTSurgeryMedicine | null>(null)
  const [returnQty, setReturnQty] = useState<number>(1)
  const [returnReason, setReturnReason] = useState("Unused in surgery")
  const [isReturning, setIsReturning] = useState(false)

  const filteredSurgeries = initialSurgeries.filter((s) => {
    const matchesStatus = statusFilter === "ALL" || s.status === statusFilter
    const matchesSearch =
      searchTerm.trim() === "" ||
      s.procedureName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.patientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.patientId.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.leadSurgeonName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.theaterName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.medicines.some((m) => m.name.toLowerCase().includes(searchTerm.toLowerCase()))
    return matchesStatus && matchesSearch
  })

  const toggleExpand = (id: string) => {
    setExpandedSurgeryId(expandedSurgeryId === id ? null : id)
  }

  const handleOpenManager = (surgeryId: string, tab: string = "medicines") => {
    setManagerSurgeryId(surgeryId)
    setManagerDefaultTab(tab)
    setManagerModalOpen(true)
  }

  const handleOpenReturnModal = (surgeryId: string, item: OTSurgeryMedicine) => {
    setReturnSurgeryId(surgeryId)
    setReturnItem(item)
    setReturnQty(Math.min(1, item.quantity))
    setReturnReason("Unused in surgery")
    setReturnModalOpen(true)
  }

  const handleConfirmReturn = async () => {
    if (!returnSurgeryId || !returnItem) return
    if (returnQty <= 0 || returnQty > returnItem.quantity) {
      toast.error(`Return quantity must be between 1 and ${returnItem.quantity}`)
      return
    }

    setIsReturning(true)
    try {
      const res = await returnMedicineFromSurgery(returnSurgeryId, {
        itemId: returnItem.id,
        quantity: returnQty,
        reason: returnReason.trim() || "Unused in surgery",
      })

      if (res.success) {
        toast.success(res.message || "Medicine returned to inventory successfully")
        setReturnModalOpen(false)
        setReturnItem(null)
        router.refresh()
      } else {
        toast.error(res.message || "Failed to return medicine")
      }
    } catch (err: any) {
      toast.error(err.message || "Error returning medicine")
    } finally {
      setIsReturning(false)
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "SCHEDULED":
        return <Badge className="bg-blue-100 text-blue-700 hover:bg-blue-200 border-none font-semibold">Scheduled</Badge>
      case "IN_PROGRESS":
      case "ONGOING":
        return (
          <Badge className="bg-amber-100 text-amber-800 hover:bg-amber-200 border border-amber-300 font-bold flex items-center gap-1 animate-pulse">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
            In Progress
          </Badge>
        )
      case "COMPLETED":
        return <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-200 border-none font-semibold">Completed</Badge>
      case "CANCELLED":
        return <Badge className="bg-rose-100 text-rose-700 hover:bg-rose-200 border-none font-semibold">Cancelled</Badge>
      default:
        return <Badge variant="outline">{status}</Badge>
    }
  }

  return (
    <div className="space-y-6">
      {/* Informational Welcome Card */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 p-6 md:p-8 text-white shadow-lg">
        <div className="absolute -right-8 -top-8 h-48 w-48 rounded-full bg-blue-500/10 blur-3xl" />
        <div className="absolute -bottom-8 -left-8 h-48 w-48 rounded-full bg-indigo-500/10 blur-3xl" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2 max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 backdrop-blur-md border border-white/10 text-xs font-semibold text-blue-200">
              <Sparkles className="w-3.5 h-3.5" />
              Pharmacy OT Consumables & Medication Center
            </div>
            <h1 className="text-2xl md:text-3xl font-black tracking-tight">
              Operation Theatre (OT) Medicine
            </h1>
            <p className="text-sm text-blue-100/80 leading-relaxed">
              Dedicated tracking for Operation Theatre medicine requisitions, surgical consumables, intra-operative medication, and unused medicine returns with live stock restoration.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Button
              onClick={() => router.refresh()}
              variant="outline"
              className="bg-white/10 border-white/20 text-white hover:bg-white/20 backdrop-blur-md text-xs font-semibold"
            >
              <RefreshCw className="w-3.5 h-3.5 mr-1.5" />
              Refresh
            </Button>
            <Link href="/dashboard/ot/schedule">
              <Button className="bg-white text-blue-950 hover:bg-blue-50 text-xs font-bold shadow-md">
                <Scissors className="w-3.5 h-3.5 mr-1.5" />
                View OT Schedule
              </Button>
            </Link>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="border border-slate-100 shadow-sm rounded-xl">
          <CardHeader className="p-4 pb-2">
            <CardDescription className="text-xs font-medium text-slate-500">Total Procedures</CardDescription>
            <CardTitle className="text-2xl font-black text-slate-900 mt-1">
              {initialSummary.totalSurgeries}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <div className="flex items-center gap-1.5 text-xs text-slate-500 mt-1">
              <Scissors className="w-3.5 h-3.5 text-blue-600" />
              <span>Recorded OT Cases</span>
            </div>
          </CardContent>
        </Card>

        <Card className="border border-slate-100 shadow-sm rounded-xl">
          <CardHeader className="p-4 pb-2">
            <CardDescription className="text-xs font-medium text-slate-500">Scheduled / Upcoming</CardDescription>
            <CardTitle className="text-2xl font-black text-blue-600 mt-1">
              {initialSummary.scheduledSurgeries}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <div className="flex items-center gap-1.5 text-xs text-blue-600 mt-1">
              <Calendar className="w-3.5 h-3.5" />
              <span>Pending Surgery</span>
            </div>
          </CardContent>
        </Card>

        <Card className="border border-slate-100 shadow-sm rounded-xl">
          <CardHeader className="p-4 pb-2">
            <CardDescription className="text-xs font-medium text-slate-500">OT Medicines Used</CardDescription>
            <CardTitle className="text-2xl font-black text-indigo-600 mt-1">
              {initialSummary.totalMedicinesUsed}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <div className="flex items-center gap-1.5 text-xs text-indigo-600 mt-1">
              <Pill className="w-3.5 h-3.5" />
              <span>Total Items Dispensed</span>
            </div>
          </CardContent>
        </Card>

        <Card className="border border-slate-100 shadow-sm rounded-xl">
          <CardHeader className="p-4 pb-2">
            <CardDescription className="text-xs font-medium text-slate-500">Total OT Medicine Cost</CardDescription>
            <CardTitle className="text-2xl font-black text-emerald-600 mt-1">
              ₹{initialSummary.totalMedicineCost.toLocaleString("en-IN", { maximumFractionDigits: 0 })}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <div className="flex items-center gap-1.5 text-xs text-emerald-600 mt-1">
              <DollarSign className="w-3.5 h-3.5" />
              <span>Net Pharmacy OT Cost</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 p-4 bg-white rounded-xl border border-slate-100 shadow-sm">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input
            placeholder="Search procedure, patient, doctor, theater, medicine..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9 text-xs h-9 bg-slate-50/50 border-slate-200 rounded-lg"
          />
        </div>

        <div className="flex items-center gap-2">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-36 text-xs h-9 border-slate-200">
              <SelectValue placeholder="Status Filter" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All Statuses</SelectItem>
              <SelectItem value="SCHEDULED">Scheduled</SelectItem>
              <SelectItem value="IN_PROGRESS">In Progress</SelectItem>
              <SelectItem value="COMPLETED">Completed</SelectItem>
              <SelectItem value="CANCELLED">Cancelled</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Surgeries and OT Medicines List */}
      <div className="space-y-3">
        {filteredSurgeries.length === 0 ? (
          <div className="p-12 text-center bg-white rounded-2xl border border-slate-100 shadow-sm">
            <div className="w-12 h-12 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center mx-auto mb-3">
              <Scissors className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-slate-800">No OT Medicine records found</h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1">
              There are no surgery records matching your search or filter. Surgeries with prescribed or dispensed OT medicines will be listed here.
            </p>
          </div>
        ) : (
          filteredSurgeries.map((surgery) => {
            const isExpanded = expandedSurgeryId === surgery.id
            const isInProgress = surgery.status === "IN_PROGRESS" || surgery.status === "ONGOING"

            return (
              <div
                key={surgery.id}
                className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden transition-all duration-200 hover:shadow-md"
              >
                {/* Main Card Header / Summary Row */}
                <div
                  onClick={() => toggleExpand(surgery.id)}
                  className="p-4 sm:p-5 cursor-pointer flex flex-col md:flex-row md:items-center justify-between gap-4 select-none hover:bg-slate-50/50 transition-colors"
                >
                  <div className="flex items-start gap-3.5">
                    <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <Scissors className="w-5 h-5" />
                    </div>

                    <div className="space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h4 className="font-bold text-slate-900 text-sm sm:text-base">
                          {surgery.procedureName}
                        </h4>
                        {surgery.category && (
                          <Badge variant="outline" className="text-[10px] uppercase font-semibold text-slate-500">
                            {surgery.category}
                          </Badge>
                        )}
                        {getStatusBadge(surgery.status)}
                      </div>

                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500">
                        <span className="flex items-center gap-1 font-medium text-slate-700">
                          <User className="w-3.5 h-3.5 text-slate-400" />
                          {surgery.patientName} ({surgery.patientId})
                        </span>
                        <span className="flex items-center gap-1">
                          <Building className="w-3.5 h-3.5 text-slate-400" />
                          {surgery.theaterName}
                        </span>
                        <span>Surgeon: {surgery.leadSurgeonName}</span>
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3.5 h-3.5 text-slate-400" />
                          {format(new Date(surgery.scheduledDate), "dd MMM yyyy, hh:mm a")}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between md:justify-end gap-3.5 border-t md:border-t-0 pt-3 md:pt-0">
                    <div className="text-right">
                      <div className="text-xs text-slate-400 font-medium">
                        OT Medicines ({surgery.medicinesCount})
                      </div>
                      <div className="text-base font-bold text-slate-900 font-mono">
                        ₹{surgery.medicineTotalCost.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      {/* Add / Give Medicine Button */}
                      {isInProgress ? (
                        <Button
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation()
                            handleOpenManager(surgery.id, "medicines")
                          }}
                          className="text-xs font-bold h-8.5 bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-700 hover:to-orange-700 text-white shadow-sm flex items-center gap-1.5"
                        >
                          <Syringe className="w-3.5 h-3.5" />
                          + Give Medicine (In-Progress)
                        </Button>
                      ) : (
                        <Button
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation()
                            handleOpenManager(surgery.id, "medicines")
                          }}
                          className="text-xs font-semibold h-8.5 bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm flex items-center gap-1.5"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          + Add / Dispense Medicine
                        </Button>
                      )}

                      <button
                        type="button"
                        className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
                      >
                        {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                </div>

                {/* Expanded OT Medicine Items View */}
                {isExpanded && (
                  <div className="border-t border-slate-100 bg-slate-50/50 p-4 sm:p-5 space-y-3">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-slate-600 uppercase tracking-wider">
                          Itemized OT Medicine & Consumables ({surgery.medicines.length})
                        </span>
                        {isInProgress && (
                          <span className="text-[10px] font-bold text-amber-700 bg-amber-50 border border-amber-200 px-2.5 py-0.5 rounded-full flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-ping" />
                            Live Intra-Op Dispensing Active
                          </span>
                        )}
                      </div>
                    </div>

                    {surgery.medicines.length === 0 ? (
                      <div className="p-8 text-center text-xs text-slate-500 bg-white rounded-xl border border-dashed border-slate-200">
                        <Package className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                        <p className="font-semibold text-slate-700">No medicines recorded for this procedure yet</p>
                        <p className="text-[11px] text-slate-400 mt-1">Use the "+ Add / Dispense Medicine" button above to issue medicines from pharmacy stock.</p>
                      </div>
                    ) : (
                      <div className="border rounded-xl bg-white overflow-hidden shadow-xs">
                        <table className="w-full text-xs">
                          <thead className="bg-slate-50 text-slate-600 border-b">
                            <tr>
                              <th className="py-2.5 px-4 text-left font-semibold">Medicine & Details</th>
                              <th className="py-2.5 px-3 text-center font-semibold">Batch</th>
                              <th className="py-2.5 px-3 text-center font-semibold">Status</th>
                              <th className="py-2.5 px-3 text-center font-semibold">Issued</th>
                              <th className="py-2.5 px-3 text-center font-semibold">Returned</th>
                              <th className="py-2.5 px-3 text-center font-semibold">Net Used</th>
                              <th className="py-2.5 px-3 text-right font-semibold">Unit Price</th>
                              <th className="py-2.5 px-4 text-right font-semibold">Net Total</th>
                              <th className="py-2.5 px-3 text-center w-28">Action</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                            {surgery.medicines.map((med) => {
                              const isReturned = med.status === "RETURNED" || (med.quantityIssued > 0 && med.quantity === 0)
                              const isPending = med.status === "PENDING"

                              return (
                                <tr key={med.id} className="hover:bg-slate-50/60 transition-colors">
                                  <td className="py-2.5 px-4">
                                    <div className="font-bold text-slate-800">{med.name}</div>
                                    <div className="text-[11px] text-slate-400">
                                      {med.strength && `${med.strength} · `}
                                      {med.type || "Drug"}
                                      {med.notes && ` · ${med.notes}`}
                                    </div>
                                  </td>
                                  <td className="py-2.5 px-3 text-center font-mono text-[11px] text-slate-600">
                                    {med.batchNumber || "—"}
                                  </td>
                                  <td className="py-2.5 px-3 text-center">
                                    {isReturned ? (
                                      <Badge variant="secondary" className="text-[10px] bg-slate-100 text-slate-600 border-slate-200">
                                        Returned
                                      </Badge>
                                    ) : med.quantityReturned > 0 ? (
                                      <Badge className="text-[10px] bg-amber-50 text-amber-700 border-amber-200">
                                        Dispensed ({med.quantityReturned} ret)
                                      </Badge>
                                    ) : isPending ? (
                                      <Badge className="text-[10px] bg-blue-50 text-blue-700 border-blue-200 font-semibold">
                                        Pending Dispense
                                      </Badge>
                                    ) : (
                                      <Badge className="text-[10px] bg-emerald-50 text-emerald-700 border-emerald-200 font-semibold gap-1">
                                        <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                                        Dispensed
                                      </Badge>
                                    )}
                                  </td>
                                  <td className="py-2.5 px-3 text-center font-semibold text-slate-700">
                                    {med.quantityIssued}
                                  </td>
                                  <td className="py-2.5 px-3 text-center font-semibold text-rose-600">
                                    {med.quantityReturned > 0 ? `-${med.quantityReturned}` : "0"}
                                  </td>
                                  <td className="py-2.5 px-3 text-center font-bold text-indigo-700 bg-indigo-50/40">
                                    {med.quantity}
                                  </td>
                                  <td className="py-2.5 px-3 text-right font-mono text-slate-600">
                                    ₹{med.unitPrice}
                                  </td>
                                  <td className="py-2.5 px-4 text-right font-mono font-bold text-slate-900">
                                    ₹{med.total.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                                  </td>
                                  <td className="py-2.5 px-3 text-center">
                                    {isPending ? (
                                      <Button
                                        size="sm"
                                        onClick={() => handleOpenManager(surgery.id, "medicines")}
                                        className="h-7 px-2 text-[11px] font-semibold bg-emerald-600 hover:bg-emerald-700 text-white gap-1"
                                      >
                                        <CheckCircle2 className="w-3 h-3" />
                                        Dispense
                                      </Button>
                                    ) : med.quantity > 0 ? (
                                      <Button
                                        size="sm"
                                        variant="outline"
                                        onClick={() => handleOpenReturnModal(surgery.id, med)}
                                        className="h-7 px-2 text-[11px] font-semibold text-rose-600 border-rose-200 hover:bg-rose-50 hover:text-rose-700 gap-1"
                                        title="Take back unused medicine and restock inventory"
                                      >
                                        <RotateCcw className="w-3 h-3" />
                                        Take Back
                                      </Button>
                                    ) : (
                                      <span className="text-[10px] text-slate-400 font-medium">
                                        Restocked
                                      </span>
                                    )}
                                  </td>
                                </tr>
                              )
                            })}
                          </tbody>
                          <tfoot className="bg-slate-50/80 border-t">
                            <tr>
                              <td colSpan={7} className="py-2.5 px-4 font-bold text-slate-800 text-right">
                                Net OT Pharmacy Total Charge:
                              </td>
                              <td className="py-2.5 px-4 text-right font-mono font-bold text-emerald-700 text-sm">
                                ₹{surgery.medicineTotalCost.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                              </td>
                              <td></td>
                            </tr>
                          </tfoot>
                        </table>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )
          })
        )}
      </div>

      {/* Quick Return Modal */}
      {returnItem && (
        <Dialog open={returnModalOpen} onOpenChange={setReturnModalOpen}>
          <DialogContent className="max-w-md p-6 rounded-2xl">
            <DialogHeader>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-rose-50 border border-rose-200 flex items-center justify-center text-rose-600 shrink-0">
                  <RotateCcw className="w-5 h-5" />
                </div>
                <div>
                  <DialogTitle className="text-base font-bold text-slate-900">
                    Take Back Unused OT Medicine
                  </DialogTitle>
                  <DialogDescription className="text-xs text-slate-500">
                    Restores stock in pharmacy batch and deducts charges from surgery bill.
                  </DialogDescription>
                </div>
              </div>
            </DialogHeader>

            <div className="space-y-4 py-3">
              <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-1.5 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">Medicine:</span>
                  <span className="font-bold text-slate-800">{returnItem.name}</span>
                </div>
                {returnItem.batchNumber && (
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500">Batch Number:</span>
                    <span className="font-mono text-slate-700 font-semibold">{returnItem.batchNumber}</span>
                  </div>
                )}
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">Total Issued:</span>
                  <span className="font-semibold text-slate-700">{returnItem.quantityIssued}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">Already Returned:</span>
                  <span className="text-rose-600 font-semibold">{returnItem.quantityReturned}</span>
                </div>
                <div className="flex items-center justify-between border-t pt-1.5 font-bold">
                  <span className="text-indigo-900">Maximum Returnable:</span>
                  <span className="text-indigo-700 text-sm font-bold">{returnItem.quantity} units</span>
                </div>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-slate-700">
                  Quantity Unused (to return)
                </Label>
                <Input
                  type="number"
                  min="1"
                  max={returnItem.quantity}
                  value={returnQty}
                  onChange={(e) => setReturnQty(parseInt(e.target.value) || 1)}
                  className="h-9 text-sm font-bold text-center"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-slate-700">
                  Reason for Return
                </Label>
                <Input
                  value={returnReason}
                  onChange={(e) => setReturnReason(e.target.value)}
                  placeholder="e.g. Unused in surgery, Extra ampoules returned"
                  className="h-9 text-xs"
                />
              </div>

              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800 flex items-center justify-between">
                <span>Deduction from Surgery Bill:</span>
                <span className="font-mono font-bold text-sm">
                  -₹{(returnQty * returnItem.unitPrice).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                </span>
              </div>
            </div>

            <DialogFooter className="gap-2 sm:gap-0">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setReturnModalOpen(false)}
                disabled={isReturning}
                className="text-xs font-semibold"
              >
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={handleConfirmReturn}
                disabled={isReturning}
                className="bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold gap-1.5"
              >
                {isReturning ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RotateCcw className="w-3.5 h-3.5" />}
                Confirm Return & Restock
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* Surgery Operation Management Modal (Restricted to Medicines Only for Pharmacy) */}
      <SurgeryOperationManagerModal
        surgeryId={managerSurgeryId}
        open={managerModalOpen}
        onOpenChange={setManagerModalOpen}
        defaultTab="medicines"
        medicinesOnly={true}
        onSuccess={() => router.refresh()}
      />
    </div>
  )
}
