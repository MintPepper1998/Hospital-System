"use client"

import { useState, useEffect, useTransition } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import { Badge } from "@/components/ui/badge"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog"
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
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import {
  Plus,
  Pencil,
  Trash2,
  IndianRupee,
  Loader2,
  Stethoscope,
  Bed,
  Scissors,
  ShieldCheck,
  Settings,
  ToggleLeft,
  CheckCircle2,
  XCircle,
  Repeat,
} from "lucide-react"
import {
  getHospitalFees,
  createHospitalFee,
  updateHospitalFee,
  toggleFeeModule,
  deleteHospitalFee,
} from "@/lib/actions/hospital-fees"

interface HospitalFee {
  id: string
  name: string
  amount: number
  description: string | null
  feeType: string
  isActive: boolean
  applyToOPD: boolean
  applyToIPD: boolean
  applyToSurgery: boolean
  applyToInsurance: boolean
  chargeOnce: boolean
  sortOrder: number
  createdAt: string
  updatedAt: string
}

export default function HospitalFeesPage() {
  const [fees, setFees] = useState<HospitalFee[]>([])
  const [loading, setLoading] = useState(true)
  const [createOpen, setCreateOpen] = useState(false)
  const [editFee, setEditFee] = useState<HospitalFee | null>(null)
  const [isPending, startTransition] = useTransition()
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null)

  // Form state
  const [formData, setFormData] = useState({
    name: "",
    amount: "",
    description: "",
    feeType: "FIXED",
    applyToOPD: false,
    applyToIPD: false,
    applyToSurgery: false,
    applyToInsurance: false,
    chargeOnce: false,
  })

  const loadFees = async () => {
    setLoading(true)
    const result = await getHospitalFees()
    if (result.success) {
      setFees(result.data as HospitalFee[])
    }
    setLoading(false)
  }

  useEffect(() => {
    loadFees()
  }, [])

  const resetForm = () => {
    setFormData({
      name: "",
      amount: "",
      description: "",
      feeType: "FIXED",
      applyToOPD: false,
      applyToIPD: false,
      applyToSurgery: false,
      applyToInsurance: false,
      chargeOnce: false,
    })
  }

  const handleCreate = () => {
    startTransition(async () => {
      const fd = new FormData()
      fd.set("name", formData.name)
      fd.set("amount", formData.amount)
      fd.set("description", formData.description)
      fd.set("feeType", formData.feeType)
      fd.set("applyToOPD", String(formData.applyToOPD))
      fd.set("applyToIPD", String(formData.applyToIPD))
      fd.set("applyToSurgery", String(formData.applyToSurgery))
      fd.set("applyToInsurance", String(formData.applyToInsurance))
      fd.set("chargeOnce", String(formData.chargeOnce))

      const result = await createHospitalFee(fd)
      setMessage({ type: result.success ? "success" : "error", text: result.message })
      if (result.success) {
        setCreateOpen(false)
        resetForm()
        loadFees()
      }
      setTimeout(() => setMessage(null), 4000)
    })
  }

  const handleUpdate = () => {
    if (!editFee) return
    startTransition(async () => {
      const fd = new FormData()
      fd.set("id", editFee.id)
      fd.set("name", formData.name)
      fd.set("amount", formData.amount)
      fd.set("description", formData.description)
      fd.set("feeType", formData.feeType)
      fd.set("isActive", String(editFee.isActive))
      fd.set("applyToOPD", String(formData.applyToOPD))
      fd.set("applyToIPD", String(formData.applyToIPD))
      fd.set("applyToSurgery", String(formData.applyToSurgery))
      fd.set("applyToInsurance", String(formData.applyToInsurance))
      fd.set("chargeOnce", String(formData.chargeOnce))

      const result = await updateHospitalFee(fd)
      setMessage({ type: result.success ? "success" : "error", text: result.message })
      if (result.success) {
        setEditFee(null)
        resetForm()
        loadFees()
      }
      setTimeout(() => setMessage(null), 4000)
    })
  }

  const handleToggle = (feeId: string, field: string, value: boolean) => {
    startTransition(async () => {
      const result = await toggleFeeModule(feeId, field, value)
      if (result.success) {
        loadFees()
      }
    })
  }

  const handleDelete = (feeId: string) => {
    startTransition(async () => {
      const result = await deleteHospitalFee(feeId)
      setMessage({ type: result.success ? "success" : "error", text: result.message })
      if (result.success) loadFees()
      setTimeout(() => setMessage(null), 4000)
    })
  }

  const openEditDialog = (fee: HospitalFee) => {
    setEditFee(fee)
    setFormData({
      name: fee.name,
      amount: String(fee.amount),
      description: fee.description || "",
      feeType: fee.feeType,
      applyToOPD: fee.applyToOPD,
      applyToIPD: fee.applyToIPD,
      applyToSurgery: fee.applyToSurgery,
      applyToInsurance: fee.applyToInsurance,
      chargeOnce: fee.chargeOnce,
    })
  }

  // Summary stats
  const activeFees = fees.filter((f) => f.isActive)
  const totalOPDFees = activeFees.filter((f) => f.applyToOPD).reduce((s, f) => s + f.amount, 0)
  const totalIPDFees = activeFees.filter((f) => f.applyToIPD).reduce((s, f) => s + f.amount, 0)
  const totalSurgeryFees = activeFees.filter((f) => f.applyToSurgery).reduce((s, f) => s + f.amount, 0)

  // Form fields rendered inline (not as a nested component to prevent focus loss)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-[#0066CC]">
            Hospital Fee Configuration
          </h2>
          <p className="text-muted-foreground mt-1">
            Set admission fees, registration charges, and custom fees. Control which modules they apply to.
          </p>
        </div>
        <Dialog open={createOpen} onOpenChange={(open) => { setCreateOpen(open); if (!open) resetForm() }}>
          <DialogTrigger asChild>
            <Button className="bg-[#0066CC] hover:bg-[#0052A3]">
              <Plus className="mr-2 h-4 w-4" />
              Add New Fee
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>Create Hospital Fee</DialogTitle>
              <DialogDescription>Add a new fee that will be charged during patient registration or admission.</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="createFeeName">Fee Name <span className="text-red-500">*</span></Label>
                  <Input
                    id="createFeeName"
                    placeholder="e.g., Admission Fee"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="createFeeAmount">Amount (₹) <span className="text-red-500">*</span></Label>
                  <div className="relative">
                    <IndianRupee className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="createFeeAmount"
                      type="number"
                      placeholder="500"
                      className="pl-9"
                      value={formData.amount}
                      onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                    />
                  </div>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="createFeeDesc">Description</Label>
                <Textarea
                  id="createFeeDesc"
                  placeholder="Optional description of this fee..."
                  rows={2}
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Fee Type</Label>
                <Select value={formData.feeType} onValueChange={(v) => setFormData({ ...formData, feeType: v })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="FIXED">Fixed Amount</SelectItem>
                    <SelectItem value="PERCENTAGE">Percentage (%)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-3 pt-2">
                <Label className="text-sm font-semibold">Apply this fee to:</Label>
                <div className="grid grid-cols-2 gap-3">
                  <div className="flex items-center justify-between rounded-lg border p-3 bg-blue-50/50">
                    <div className="flex items-center gap-2">
                      <Stethoscope className="h-4 w-4 text-blue-600" />
                      <span className="text-sm font-medium">OPD</span>
                    </div>
                    <Switch checked={formData.applyToOPD} onCheckedChange={(v) => setFormData({ ...formData, applyToOPD: v })} />
                  </div>
                  <div className="flex items-center justify-between rounded-lg border p-3 bg-green-50/50">
                    <div className="flex items-center gap-2">
                      <Bed className="h-4 w-4 text-green-600" />
                      <span className="text-sm font-medium">IPD</span>
                    </div>
                    <Switch checked={formData.applyToIPD} onCheckedChange={(v) => setFormData({ ...formData, applyToIPD: v })} />
                  </div>
                  <div className="flex items-center justify-between rounded-lg border p-3 bg-orange-50/50">
                    <div className="flex items-center gap-2">
                      <Scissors className="h-4 w-4 text-orange-600" />
                      <span className="text-sm font-medium">Surgery</span>
                    </div>
                    <Switch checked={formData.applyToSurgery} onCheckedChange={(v) => setFormData({ ...formData, applyToSurgery: v })} />
                  </div>
                  <div className="flex items-center justify-between rounded-lg border p-3 bg-purple-50/50">
                    <div className="flex items-center gap-2">
                      <ShieldCheck className="h-4 w-4 text-purple-600" />
                      <span className="text-sm font-medium">Insurance</span>
                    </div>
                    <Switch checked={formData.applyToInsurance} onCheckedChange={(v) => setFormData({ ...formData, applyToInsurance: v })} />
                  </div>
                </div>
              </div>
              {/* Charge Once Toggle */}
              <div className="flex items-center justify-between rounded-lg border p-3 bg-teal-50/50 mt-3">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <Repeat className="h-4 w-4 text-teal-600" />
                    <span className="text-sm font-medium">Charge Once Per Patient</span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1 ml-6">
                    If ON, returning patients with an existing Patient ID are not charged again.
                  </p>
                </div>
                <Switch checked={formData.chargeOnce} onCheckedChange={(v) => setFormData({ ...formData, chargeOnce: v })} />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setCreateOpen(false)}>Cancel</Button>
              <Button onClick={handleCreate} disabled={isPending} className="bg-[#0066CC] hover:bg-[#0052A3]">
                {isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Plus className="mr-2 h-4 w-4" />}
                Create Fee
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Status Message */}
      {message && (
        <div className={`px-4 py-3 rounded-md border ${
          message.type === "success" 
            ? "bg-green-50 border-green-200 text-green-800" 
            : "bg-red-50 border-red-200 text-red-800"
        }`}>
          {message.text}
        </div>
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="border-t-4 border-t-blue-500">
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-2">
              <Stethoscope className="h-4 w-4" />
              OPD Fees Total
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">₹{totalOPDFees.toLocaleString("en-IN")}</p>
            <p className="text-xs text-muted-foreground">{activeFees.filter(f => f.applyToOPD).length} active fee(s)</p>
          </CardContent>
        </Card>
        <Card className="border-t-4 border-t-green-500">
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-2">
              <Bed className="h-4 w-4" />
              IPD Fees Total
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">₹{totalIPDFees.toLocaleString("en-IN")}</p>
            <p className="text-xs text-muted-foreground">{activeFees.filter(f => f.applyToIPD).length} active fee(s)</p>
          </CardContent>
        </Card>
        <Card className="border-t-4 border-t-orange-500">
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-2">
              <Scissors className="h-4 w-4" />
              Surgery Fees Total
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">₹{totalSurgeryFees.toLocaleString("en-IN")}</p>
            <p className="text-xs text-muted-foreground">{activeFees.filter(f => f.applyToSurgery).length} active fee(s)</p>
          </CardContent>
        </Card>
        <Card className="border-t-4 border-t-gray-400">
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-2">
              <Settings className="h-4 w-4" />
              Total Fees Configured
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{fees.length}</p>
            <p className="text-xs text-muted-foreground">{activeFees.length} active, {fees.length - activeFees.length} disabled</p>
          </CardContent>
        </Card>
      </div>

      {/* Fees Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <IndianRupee className="h-4 w-4 text-[#0066CC]" />
            All Configured Fees
          </CardTitle>
          <CardDescription>Toggle switches to control which modules each fee applies to. Changes are saved instantly.</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : fees.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <IndianRupee className="h-12 w-12 mx-auto mb-3 opacity-30" />
              <p className="font-medium">No fees configured yet</p>
              <p className="text-sm">Click &quot;Add New Fee&quot; to create your first hospital fee.</p>
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow className="bg-gray-50">
                    <TableHead className="font-semibold">Fee Name</TableHead>
                    <TableHead className="font-semibold text-right">Amount</TableHead>
                    <TableHead className="font-semibold text-center">Status</TableHead>
                    <TableHead className="font-semibold text-center">
                      <div className="flex items-center justify-center gap-1">
                        <Stethoscope className="h-3.5 w-3.5 text-blue-600" />
                        OPD
                      </div>
                    </TableHead>
                    <TableHead className="font-semibold text-center">
                      <div className="flex items-center justify-center gap-1">
                        <Bed className="h-3.5 w-3.5 text-green-600" />
                        IPD
                      </div>
                    </TableHead>
                    <TableHead className="font-semibold text-center">
                      <div className="flex items-center justify-center gap-1">
                        <Scissors className="h-3.5 w-3.5 text-orange-600" />
                        Surgery
                      </div>
                    </TableHead>
                    <TableHead className="font-semibold text-center">
                      <div className="flex items-center justify-center gap-1">
                        <ShieldCheck className="h-3.5 w-3.5 text-purple-600" />
                        Insurance
                      </div>
                    </TableHead>
                    <TableHead className="font-semibold text-center">
                      <div className="flex items-center justify-center gap-1">
                        <Repeat className="h-3.5 w-3.5 text-teal-600" />
                        Once
                      </div>
                    </TableHead>
                    <TableHead className="font-semibold text-center">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {fees.map((fee) => (
                    <TableRow key={fee.id} className={!fee.isActive ? "opacity-50 bg-gray-50/50" : ""}>
                      <TableCell>
                        <div>
                          <p className="font-medium">{fee.name}</p>
                          {fee.description && (
                            <p className="text-xs text-muted-foreground mt-0.5">{fee.description}</p>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <span className="font-semibold text-green-700">
                          ₹{fee.amount.toLocaleString("en-IN")}
                        </span>
                        {fee.feeType === "PERCENTAGE" && (
                          <Badge variant="outline" className="ml-2 text-xs">%</Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-center">
                        <Switch
                          checked={fee.isActive}
                          onCheckedChange={(v) => handleToggle(fee.id, "isActive", v)}
                        />
                      </TableCell>
                      <TableCell className="text-center">
                        <Switch
                          checked={fee.applyToOPD}
                          onCheckedChange={(v) => handleToggle(fee.id, "applyToOPD", v)}
                          disabled={!fee.isActive}
                        />
                      </TableCell>
                      <TableCell className="text-center">
                        <Switch
                          checked={fee.applyToIPD}
                          onCheckedChange={(v) => handleToggle(fee.id, "applyToIPD", v)}
                          disabled={!fee.isActive}
                        />
                      </TableCell>
                      <TableCell className="text-center">
                        <Switch
                          checked={fee.applyToSurgery}
                          onCheckedChange={(v) => handleToggle(fee.id, "applyToSurgery", v)}
                          disabled={!fee.isActive}
                        />
                      </TableCell>
                      <TableCell className="text-center">
                        <Switch
                          checked={fee.applyToInsurance}
                          onCheckedChange={(v) => handleToggle(fee.id, "applyToInsurance", v)}
                          disabled={!fee.isActive}
                        />
                      </TableCell>
                      <TableCell className="text-center">
                        <Switch
                          checked={fee.chargeOnce}
                          onCheckedChange={(v) => handleToggle(fee.id, "chargeOnce", v)}
                          disabled={!fee.isActive}
                        />
                      </TableCell>
                      <TableCell className="text-center">
                        <div className="flex items-center justify-center gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => openEditDialog(fee)}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-8 w-8 text-red-500 hover:text-red-700 hover:bg-red-50">
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Delete &quot;{fee.name}&quot;?</AlertDialogTitle>
                                <AlertDialogDescription>
                                  This fee will be permanently removed. This action cannot be undone.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => handleDelete(fee.id)}
                                  className="bg-red-600 hover:bg-red-700"
                                >
                                  Delete
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Edit Dialog */}
      <Dialog open={!!editFee} onOpenChange={(open) => { if (!open) { setEditFee(null); resetForm() } }}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Edit Fee: {editFee?.name}</DialogTitle>
            <DialogDescription>Update fee details and module applicability.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="editFeeName">Fee Name <span className="text-red-500">*</span></Label>
                <Input
                  id="editFeeName"
                  placeholder="e.g., Admission Fee"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="editFeeAmount">Amount (₹) <span className="text-red-500">*</span></Label>
                <div className="relative">
                  <IndianRupee className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="editFeeAmount"
                    type="number"
                    placeholder="500"
                    className="pl-9"
                    value={formData.amount}
                    onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                  />
                </div>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="editFeeDesc">Description</Label>
              <Textarea
                id="editFeeDesc"
                placeholder="Optional description of this fee..."
                rows={2}
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Fee Type</Label>
              <Select value={formData.feeType} onValueChange={(v) => setFormData({ ...formData, feeType: v })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="FIXED">Fixed Amount</SelectItem>
                  <SelectItem value="PERCENTAGE">Percentage (%)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-3 pt-2">
              <Label className="text-sm font-semibold">Apply this fee to:</Label>
              <div className="grid grid-cols-2 gap-3">
                <div className="flex items-center justify-between rounded-lg border p-3 bg-blue-50/50">
                  <div className="flex items-center gap-2">
                    <Stethoscope className="h-4 w-4 text-blue-600" />
                    <span className="text-sm font-medium">OPD</span>
                  </div>
                  <Switch checked={formData.applyToOPD} onCheckedChange={(v) => setFormData({ ...formData, applyToOPD: v })} />
                </div>
                <div className="flex items-center justify-between rounded-lg border p-3 bg-green-50/50">
                  <div className="flex items-center gap-2">
                    <Bed className="h-4 w-4 text-green-600" />
                    <span className="text-sm font-medium">IPD</span>
                  </div>
                  <Switch checked={formData.applyToIPD} onCheckedChange={(v) => setFormData({ ...formData, applyToIPD: v })} />
                </div>
                <div className="flex items-center justify-between rounded-lg border p-3 bg-orange-50/50">
                  <div className="flex items-center gap-2">
                    <Scissors className="h-4 w-4 text-orange-600" />
                    <span className="text-sm font-medium">Surgery</span>
                  </div>
                  <Switch checked={formData.applyToSurgery} onCheckedChange={(v) => setFormData({ ...formData, applyToSurgery: v })} />
                </div>
                <div className="flex items-center justify-between rounded-lg border p-3 bg-purple-50/50">
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="h-4 w-4 text-purple-600" />
                    <span className="text-sm font-medium">Insurance</span>
                  </div>
                  <Switch checked={formData.applyToInsurance} onCheckedChange={(v) => setFormData({ ...formData, applyToInsurance: v })} />
                </div>
              </div>
              {/* Charge Once Toggle */}
              <div className="flex items-center justify-between rounded-lg border p-3 bg-teal-50/50 mt-3">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <Repeat className="h-4 w-4 text-teal-600" />
                    <span className="text-sm font-medium">Charge Once Per Patient</span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1 ml-6">
                    If ON, returning patients with an existing Patient ID are not charged again.
                  </p>
                </div>
                <Switch checked={formData.chargeOnce} onCheckedChange={(v) => setFormData({ ...formData, chargeOnce: v })} />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setEditFee(null); resetForm() }}>Cancel</Button>
            <Button onClick={handleUpdate} disabled={isPending} className="bg-[#0066CC] hover:bg-[#0052A3]">
              {isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Pencil className="mr-2 h-4 w-4" />}
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
