"use client"

import { useState, useTransition, useMemo } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { ArrowLeft, Trash2, Plus, Loader2, Save } from "lucide-react"
import { toast } from "sonner"
import { createPurchaseReturn, type PurchaseReturnItemInput } from "@/app/actions/purchase"

// ============================================
// NEOMORPHIC STYLE TOKENS
// ============================================

const neo = {
  card: "rounded-2xl bg-[#e0e5ec] border-none shadow-[6px_6px_12px_#bec3c9,-6px_-6px_12px_#ffffff]",
  inset: "rounded-xl bg-[#e0e5ec] shadow-[inset_4px_4px_8px_#bec3c9,inset_-4px_-4px_8px_#ffffff]",
  input: "bg-transparent border-none shadow-none focus-visible:ring-0 focus-visible:ring-offset-0 text-slate-700 h-10 px-4",
  button: "rounded-xl shadow-[4px_4px_8px_#bec3c9,-4px_-4px_8px_#ffffff] transition-all hover:shadow-[inset_2px_2px_5px_#bec3c9,inset_-2px_-2px_5px_#ffffff]",
  buttonPrimary: "bg-indigo-600 hover:bg-indigo-700 text-white shadow-[4px_4px_8px_#bec3c9,-4px_-4px_8px_#ffffff]",
  buttonDestructive: "bg-red-50 hover:bg-red-100 text-red-600 shadow-[4px_4px_8px_#bec3c9,-4px_-4px_8px_#ffffff]",
}

function generateKey() {
  return Math.random().toString(36).slice(2, 10)
}

interface ReturnLine {
  key: string
  batchId: string
  quantity: number
  rate: number
}

interface Props {
  medicines: any[]
  suppliers: any[]
  batches: any[]
}

export function PurchaseReturnForm({ medicines, suppliers, batches }: Props) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  const [supplierId, setSupplierId] = useState("")
  const [invoiceId, setInvoiceId] = useState("")
  const [reason, setReason] = useState("Expired")
  const [lines, setLines] = useState<ReturnLine[]>([
    { key: generateKey(), batchId: "", quantity: 1, rate: 0 }
  ])

  const addLine = () => {
    setLines([...lines, { key: generateKey(), batchId: "", quantity: 1, rate: 0 }])
  }

  const removeLine = (index: number) => {
    if (lines.length > 1) {
      setLines(lines.filter((_, i) => i !== index))
    }
  }

  const updateLine = (index: number, field: keyof ReturnLine, value: any) => {
    const newLines = [...lines]
    newLines[index] = { ...newLines[index], [field]: value }

    // If batchId changed, auto-fill the rate
    if (field === "batchId") {
      const b = batches.find(x => x.id === value)
      // Return rate must use the purchase price! Fallback to unitPrice if undefined.
      if (b) {
        const m = medicines.find(x => x.id === b.medicineId)
        if (m) {
          // Fix: Use b.purchasePrice (actual cost) instead of m.unitPrice (selling price)
          newLines[index].rate = b.purchasePrice ?? m.unitPrice ?? 0
        }
      }
    }

    setLines(newLines)
  }

  const totalAmount = lines.reduce((sum, l) => sum + (l.quantity * l.rate), 0)

  const handleSubmit = async () => {
    if (!supplierId) {
      toast.error("Please select a supplier")
      return
    }

    const items: PurchaseReturnItemInput[] = []
    for (const l of lines) {
      if (!l.batchId) continue
      const b = batches.find(x => x.id === l.batchId)
      if (!b) continue
      if (l.quantity <= 0) {
        toast.error("Quantity must be greater than zero")
        return
      }
      if (l.quantity > b.quantity) {
        toast.error(`Cannot return more than available stock for batch ${b.batchNumber}`)
        return
      }
      items.push({
        medicineId: b.medicineId,
        batchNumber: b.batchNumber,
        quantity: l.quantity,
        rate: l.rate
      })
    }

    if (items.length === 0) {
      toast.error("Please add at least one valid item to return")
      return
    }

    startTransition(async () => {
      const res = await createPurchaseReturn({
        supplierId,
        invoiceId: invoiceId || null,
        reason,
        items
      })

      if (res.success) {
        toast.success(res.message)
        router.push("/dashboard/pharmacy/purchase-returns")
      } else {
        toast.error(res.message)
      }
    })
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4 mb-8">
        <Link href="/dashboard/pharmacy/purchase-returns">
          <Button variant="ghost" className="h-10 w-10 p-0 rounded-xl hover:bg-slate-200">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-slate-800">New Purchase Return</h1>
          <p className="text-sm text-slate-500">Return expired or damaged items to supplier</p>
        </div>
      </div>

      <div className={`${neo.card} p-6 space-y-6`}>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Supplier */}
          <div className="space-y-2">
            <Label className="text-slate-600 font-semibold ml-1">Supplier <span className="text-red-500">*</span></Label>
            <div className={neo.inset}>
              <Select value={supplierId} onValueChange={setSupplierId}>
                <SelectTrigger className={neo.input}>
                  <SelectValue placeholder="Select Supplier" />
                </SelectTrigger>
                <SelectContent>
                  {suppliers.map(s => (
                    <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Reason */}
          <div className="space-y-2">
            <Label className="text-slate-600 font-semibold ml-1">Reason <span className="text-red-500">*</span></Label>
            <div className={neo.inset}>
              <Select value={reason} onValueChange={setReason}>
                <SelectTrigger className={neo.input}>
                  <SelectValue placeholder="Select Reason" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Expired">Expired</SelectItem>
                  <SelectItem value="Damaged">Damaged</SelectItem>
                  <SelectItem value="Wrong Item">Wrong Item</SelectItem>
                  <SelectItem value="Excess Quantity">Excess Quantity</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Original Invoice (Optional) */}
          <div className="space-y-2">
            <Label className="text-slate-600 font-semibold ml-1">Original Invoice No. (Optional)</Label>
            <div className={neo.inset}>
              <Input 
                value={invoiceId}
                onChange={e => setInvoiceId(e.target.value)}
                placeholder="e.g. INV-12345"
                className={neo.input}
              />
            </div>
          </div>
        </div>

        <Separator className="bg-[#bec3c9]/50" />

        {/* Line Items */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-bold text-slate-800">Return Items</h3>
          </div>

          {/* Desktop Table Headers */}
          <div className="hidden md:grid grid-cols-12 gap-4 px-4 text-sm font-bold text-slate-500 uppercase tracking-wider">
            <div className="col-span-4">Medicine & Batch (Stock)</div>
            <div className="col-span-2">Qty to Return</div>
            <div className="col-span-2">Return Rate (₹)</div>
            <div className="col-span-3">Total (₹)</div>
            <div className="col-span-1 text-center">Act</div>
          </div>

          {lines.map((line, idx) => (
            <div key={line.key} className="grid grid-cols-1 md:grid-cols-12 gap-4 items-center bg-white/20 p-4 rounded-xl border border-white/40">
              {/* Batch Select */}
              <div className="col-span-1 md:col-span-4 space-y-1">
                <Label className="md:hidden text-xs text-slate-500">Medicine & Batch</Label>
                <div className={neo.inset}>
                  <Select value={line.batchId} onValueChange={v => updateLine(idx, "batchId", v)}>
                    <SelectTrigger className={neo.input}>
                      <SelectValue placeholder="Select Medicine Batch" />
                    </SelectTrigger>
                    <SelectContent>
                      {batches.filter(b => b.quantity > 0).map(b => {
                        const m = medicines.find(x => x.id === b.medicineId)
                        return (
                          <SelectItem key={b.id} value={b.id}>
                            {m?.name} - {b.batchNumber} ({b.quantity} in stock)
                          </SelectItem>
                        )
                      })}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Quantity */}
              <div className="col-span-1 md:col-span-2 space-y-1">
                <Label className="md:hidden text-xs text-slate-500">Return Qty</Label>
                <div className={neo.inset}>
                  <Input 
                    type="number"
                    min={1}
                    value={line.quantity || ""}
                    onChange={e => updateLine(idx, "quantity", parseInt(e.target.value) || 0)}
                    className={neo.input}
                  />
                </div>
              </div>

              {/* Rate */}
              <div className="col-span-1 md:col-span-2 space-y-1">
                <Label className="md:hidden text-xs text-slate-500">Return Rate</Label>
                <div className={neo.inset}>
                  <Input 
                    type="number"
                    min={0}
                    step="0.01"
                    value={line.rate || ""}
                    onChange={e => updateLine(idx, "rate", parseFloat(e.target.value) || 0)}
                    className={neo.input}
                  />
                </div>
              </div>

              {/* Total Amount */}
              <div className="col-span-1 md:col-span-3 space-y-1">
                <Label className="md:hidden text-xs text-slate-500">Total (₹)</Label>
                <div className="h-10 px-4 flex items-center bg-slate-100/50 rounded-xl font-bold text-slate-700">
                  ₹{(line.quantity * line.rate).toFixed(2)}
                </div>
              </div>

              {/* Action */}
              <div className="col-span-1 md:col-span-1 flex justify-center mt-2 md:mt-0">
                <Button 
                  variant="ghost" 
                  onClick={() => removeLine(idx)}
                  disabled={lines.length === 1}
                  className="h-10 w-10 p-0 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-xl"
                >
                  <Trash2 className="h-5 w-5" />
                </Button>
              </div>
            </div>
          ))}

          <Button 
            variant="outline" 
            onClick={addLine}
            className={`mt-4 w-full md:w-auto ${neo.button} border-slate-300 text-slate-700`}
          >
            <Plus className="h-4 w-4 mr-2" /> Add Item
          </Button>
        </div>

        <Separator className="bg-[#bec3c9]/50" />

        {/* Summary Footer */}
        <div className="flex flex-col sm:flex-row justify-between items-center gap-6 pt-4">
          <div className="text-center sm:text-left">
            <p className="text-sm text-slate-500 uppercase tracking-widest font-bold">Total Return Value</p>
            <p className="text-3xl font-black text-indigo-700">₹{totalAmount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</p>
          </div>

          <Button 
            size="lg" 
            onClick={handleSubmit}
            disabled={isPending}
            className={`w-full sm:w-auto px-10 ${neo.buttonPrimary}`}
          >
            {isPending ? <Loader2 className="h-5 w-5 mr-2 animate-spin" /> : <Save className="h-5 w-5 mr-2" />}
            {isPending ? "Processing..." : "Confirm Return"}
          </Button>
        </div>

      </div>
    </div>
  )
}
