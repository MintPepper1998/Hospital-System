"use client"

import { useState, useTransition, useCallback, useRef } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
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
  Popover,
  PopoverContent,
  PopoverAnchor,
} from "@/components/ui/popover"
import {
  ArrowLeft,
  Plus,
  Trash2,
  Loader2,
  CheckCircle2,
  Search,
  ClipboardList,
  Gift,
} from "lucide-react"
import { toast } from "sonner"
import { createChallan, updateChallan, type ChallanDetailData } from "@/app/actions/challan"

// ============================================
// TYPES
// ============================================

interface Medicine {
  id: string
  name: string
  strength: string | null
  type: string
  hsnCode: string
  unitPrice: number
}

interface Supplier {
  id: string
  name: string
}

interface ChallanLineItem {
  key: string
  medicineId: string
  medicineName: string
  medicineStrength: string
  batchNumber: string
  expiryDate: string
  hsnCode: string
  quantity: number
  freeQuantity: number
  packSize: number
  sellPrice: number // MRP per strip
  isFreeGood: boolean // Entire item is a supplier free good
}

interface Props {
  suppliers: Supplier[]
  medicines: Medicine[]
  existingChallan?: ChallanDetailData
}

// ============================================
// HELPERS
// ============================================

function generateKey(): string {
  return Math.random().toString(36).slice(2, 10)
}

function emptyLine(): ChallanLineItem {
  return {
    key: generateKey(),
    medicineId: "",
    medicineName: "",
    medicineStrength: "",
    batchNumber: "",
    expiryDate: "",
    hsnCode: "",
    quantity: 1,
    freeQuantity: 0,
    packSize: 1,
    sellPrice: 0,
    isFreeGood: false,
  }
}

// ============================================
// NEO TOKENS
// ============================================

const neo = {
  card: "rounded-2xl bg-[#e0e5ec] border-none",
  shadow: "shadow-[6px_6px_12px_#bec3c9,-6px_-6px_12px_#ffffff]",
  shadowSm: "shadow-[3px_3px_6px_#bec3c9,-3px_-3px_6px_#ffffff]",
  inset: "shadow-[inset_3px_3px_6px_#bec3c9,inset_-3px_-3px_6px_#ffffff]",
}

// ============================================
// MAIN COMPONENT
// ============================================

export function CreateChallanClient({ suppliers, medicines, existingChallan }: Props) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const isEdit = !!existingChallan

  // Header fields (pre-fill from existingChallan if editing)
  const [challanNumber, setChallanNumber] = useState(existingChallan?.challanNumber || "")
  const [supplierId, setSupplierId] = useState(existingChallan?.supplierId || "")
  const [challanDate, setChallanDate] = useState(
    existingChallan?.date ? new Date(existingChallan.date).toISOString().split("T")[0] : new Date().toISOString().split("T")[0]
  )
  const [notes, setNotes] = useState(existingChallan?.notes || "")

  // Line items (pre-fill from existingChallan if editing)
  const [items, setItems] = useState<ChallanLineItem[]>(
    existingChallan?.items?.length
      ? existingChallan.items.map((item) => ({
          key: generateKey(),
          medicineId: item.medicineId || "",
          medicineName: item.itemName,
          medicineStrength: "",
          batchNumber: item.batchNumber || "",
          expiryDate: item.expiryDate ? new Date(item.expiryDate).toISOString().split("T")[0] : "",
          hsnCode: item.hsnCode || "",
          quantity: item.quantity,
          freeQuantity: item.freeQuantity || 0,
          packSize: item.packSize,
          sellPrice: item.sellPrice,
          isFreeGood: item.isFreeGood || false,
        }))
      : [emptyLine()]
  )

  // Medicine search
  const [searchQuery, setSearchQuery] = useState<Record<string, string>>({})
  const [searchResults, setSearchResults] = useState<Record<string, Medicine[]>>({})
  const [activeSearch, setActiveSearch] = useState<string | null>(null)
  const searchTimers = useRef<Record<string, NodeJS.Timeout>>({})

  // ── Medicine search logic ──
  const handleMedicineSearch = useCallback(
    (key: string, query: string) => {
      setSearchQuery((p) => ({ ...p, [key]: query }))

      if (searchTimers.current[key]) clearTimeout(searchTimers.current[key])
      if (query.length < 2) {
        setSearchResults((p) => ({ ...p, [key]: [] }))
        setActiveSearch(null)
        return
      }

      searchTimers.current[key] = setTimeout(() => {
        const q = query.toLowerCase()
        const results = medicines.filter(
          (m) =>
            m.name.toLowerCase().includes(q) ||
            (m.strength && m.strength.toLowerCase().includes(q))
        ).slice(0, 8)
        setSearchResults((p) => ({ ...p, [key]: results }))
        setActiveSearch(key)
      }, 200)
    },
    [medicines]
  )

  const selectMedicine = useCallback((key: string, med: Medicine) => {
    setItems((prev) =>
      prev.map((item) =>
        item.key === key
          ? {
              ...item,
              medicineId: med.id,
              medicineName: med.name + (med.strength ? ` (${med.strength})` : ""),
              medicineStrength: med.strength || "",
              hsnCode: med.hsnCode || "",
              sellPrice: med.unitPrice || 0,
            }
          : item
      )
    )
    setSearchQuery((p) => ({ ...p, [key]: "" }))
    setSearchResults((p) => ({ ...p, [key]: [] }))
    setActiveSearch(null)
  }, [])

  // ── Item field updaters ──
  const updateItem = useCallback((key: string, field: keyof ChallanLineItem, value: string | number) => {
    setItems((prev) =>
      prev.map((item) => (item.key === key ? { ...item, [field]: value } : item))
    )
  }, [])

  const updateItemMulti = useCallback((key: string, patch: Partial<ChallanLineItem>) => {
    setItems((prev) =>
      prev.map((item) => (item.key === key ? { ...item, ...patch } : item))
    )
  }, [])

  const addLine = useCallback(() => {
    setItems((prev) => [...prev, emptyLine()])
  }, [])

  const removeLine = useCallback(
    (key: string) => {
      setItems((prev) => {
        const remaining = prev.filter((i) => i.key !== key)
        return remaining.length === 0 ? [emptyLine()] : remaining
      })
    },
    []
  )

  // ── Submit ──
  function handleSubmit() {
    if (!challanNumber.trim()) return toast.error("Enter challan number")
    if (!supplierId) return toast.error("Select a supplier")

    const validItems = items.filter((i) => i.medicineId && i.quantity > 0)
    if (validItems.length === 0) return toast.error("Add at least one medicine")

    const hasInvalidMRP = validItems.some((i) => i.sellPrice <= 0)
    if (hasInvalidMRP) return toast.error("All items must have an MRP/Sell Price")

    const payload = {
      challanNumber: challanNumber.trim(),
      date: challanDate,
      supplierId,
      notes: notes.trim() || undefined,
      items: validItems.map((item) => ({
        itemName: item.medicineName,
        medicineId: item.medicineId || null,
        batchNumber: item.batchNumber || undefined,
        expiryDate: item.expiryDate || undefined,
        quantity: item.quantity,
        freeQuantity: item.isFreeGood ? 0 : (item.freeQuantity || 0),
        packSize: item.packSize,
        sellPrice: item.sellPrice,
        hsnCode: item.hsnCode || undefined,
        isFreeGood: item.isFreeGood,
      })),
    }

    startTransition(async () => {
      const result = isEdit
        ? await updateChallan({ id: existingChallan!.id, ...payload })
        : await createChallan(payload)

      if (result.success) {
        toast.success(result.message)
        router.push("/dashboard/pharmacy/challans")
      } else {
        toast.error(result.message)
      }
    })
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/dashboard/pharmacy/challans">
          <Button variant="ghost" size="icon" className={`${neo.shadowSm} rounded-xl`}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center">
            <ClipboardList className="h-5 w-5 text-amber-600" />
          </div>
          <div>
            <h1 className="text-xl font-extrabold text-slate-800">{isEdit ? "Edit Delivery Challan" : "New Delivery Challan"}</h1>
            <p className="text-xs text-slate-400">{isEdit ? "Update challan items — inventory will be adjusted" : "Receive stock without purchase prices"}</p>
          </div>
        </div>
      </div>

      {/* Challan Header Form */}
      <div className={`${neo.card} ${neo.shadow} p-6`}>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <Label className="text-xs font-semibold text-slate-500 mb-1.5 block">Challan Number *</Label>
            <Input
              value={challanNumber}
              onChange={(e) => setChallanNumber(e.target.value)}
              placeholder="Supplier's challan #"
              className={`${neo.inset} border-none h-10`}
            />
          </div>
          <div>
            <Label className="text-xs font-semibold text-slate-500 mb-1.5 block">Supplier *</Label>
            <Select value={supplierId} onValueChange={setSupplierId}>
              <SelectTrigger className={`${neo.inset} border-none h-10`}>
                <SelectValue placeholder="Select supplier" />
              </SelectTrigger>
              <SelectContent>
                {suppliers.map((s) => (
                  <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs font-semibold text-slate-500 mb-1.5 block">Date *</Label>
            <Input
              type="date"
              value={challanDate}
              onChange={(e) => setChallanDate(e.target.value)}
              className={`${neo.inset} border-none h-10`}
            />
          </div>
          <div>
            <Label className="text-xs font-semibold text-slate-500 mb-1.5 block">Notes</Label>
            <Input
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Optional notes"
              className={`${neo.inset} border-none h-10`}
            />
          </div>
        </div>
      </div>

      {/* Items Table */}
      <div className={`${neo.card} ${neo.shadow} overflow-hidden`}>
        <div className="p-4 border-b border-slate-200/50 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h2 className="font-bold text-slate-700">Items</h2>
            {items.some(i => i.freeQuantity > 0) && (
              <span className="inline-flex items-center gap-1 text-[10px] bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-full px-2 py-0.5">
                <Gift className="h-3 w-3" /> {items.filter(i => i.freeQuantity > 0).length} with free qty
              </span>
            )}
            {items.some(i => i.isFreeGood) && (
              <span className="inline-flex items-center gap-1 text-[10px] bg-violet-50 text-violet-700 border border-violet-200 rounded-full px-2 py-0.5">
                <Gift className="h-3 w-3" /> {items.filter(i => i.isFreeGood).length} free good{items.filter(i => i.isFreeGood).length > 1 ? 's' : ''}
              </span>
            )}
          </div>
          <Button onClick={addLine} variant="outline" size="sm" className={`${neo.shadowSm} border-none rounded-xl`}>
            <Plus className="h-4 w-4 mr-1.5" />
            Add Item
          </Button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-100/50">
              <tr>
                <th className="text-left px-3 py-2.5 font-semibold text-slate-500 text-xs w-[28%]">Medicine *</th>
                <th className="text-left px-3 py-2.5 font-semibold text-slate-500 text-xs">Batch</th>
                <th className="text-left px-3 py-2.5 font-semibold text-slate-500 text-xs">Expiry</th>
                <th className="text-center px-3 py-2.5 font-semibold text-slate-500 text-xs">Qty (Strips)</th>
                <th className="text-center px-3 py-2.5 font-semibold text-slate-500 text-xs">
                  <span className="flex items-center justify-center gap-1">
                    <Gift className="h-3 w-3 text-emerald-600" /> Free
                  </span>
                </th>
                <th className="text-center px-3 py-2.5 font-semibold text-slate-500 text-xs">Pack Size</th>
                <th className="text-right px-3 py-2.5 font-semibold text-slate-500 text-xs">MRP/Strip *</th>
                <th className="text-center px-3 py-2.5 font-semibold text-slate-500 text-xs w-10" title="Supplier Free Good">
                  <Gift className="h-3 w-3 text-violet-500 mx-auto" />
                </th>
                <th className="text-center px-3 py-2.5 font-semibold text-slate-500 text-xs w-10"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {items.map((item) => (
                <tr key={item.key} className={`hover:bg-slate-50/50 group ${item.isFreeGood ? 'bg-violet-50/50' : ''}`}>
                  {/* Medicine Search */}
                  <td className="px-3 py-2">
                    {item.medicineId ? (
                      <div className="flex items-center gap-2">
                        <span className="text-slate-800 font-medium truncate">{item.medicineName}</span>
                        <button
                          onClick={() => updateItem(item.key, "medicineId", "")}
                          className="text-slate-400 hover:text-red-500 shrink-0"
                        >
                          <Trash2 className="h-3 w-3" />
                        </button>
                      </div>
                    ) : (
                      <Popover open={activeSearch === item.key}>
                        <PopoverAnchor asChild>
                          <div className="relative">
                            <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                            <Input
                              value={searchQuery[item.key] || ""}
                              onChange={(e) => handleMedicineSearch(item.key, e.target.value)}
                              onFocus={() => {
                                if ((searchResults[item.key] || []).length > 0) setActiveSearch(item.key)
                              }}
                              placeholder="Search medicine..."
                              className="pl-8 h-8 text-xs border-slate-200"
                            />
                          </div>
                        </PopoverAnchor>
                        <PopoverContent
                          className="w-[340px] p-0 max-h-56 overflow-y-auto"
                          align="start"
                          onOpenAutoFocus={(e) => e.preventDefault()}
                        >
                          {(searchResults[item.key] || []).map((med) => (
                            <button
                              key={med.id}
                              className="w-full text-left px-3 py-2 hover:bg-slate-50 text-sm flex items-center justify-between"
                              onClick={() => selectMedicine(item.key, med)}
                            >
                              <span className="font-medium text-slate-800">
                                {med.name}
                                {med.strength && <span className="text-slate-400 ml-1">({med.strength})</span>}
                              </span>
                              <span className="text-xs text-slate-400">{med.type}</span>
                            </button>
                          ))}
                        </PopoverContent>
                      </Popover>
                    )}
                  </td>

                  {/* Batch */}
                  <td className="px-3 py-2">
                    <Input
                      value={item.batchNumber}
                      onChange={(e) => updateItem(item.key, "batchNumber", e.target.value)}
                      placeholder="Batch #"
                      className="h-8 text-xs border-slate-200"
                    />
                  </td>

                  {/* Expiry */}
                  <td className="px-3 py-2">
                    <Input
                      type="date"
                      value={item.expiryDate}
                      onChange={(e) => updateItem(item.key, "expiryDate", e.target.value)}
                      className="h-8 text-xs border-slate-200"
                    />
                  </td>

                  {/* Quantity */}
                  <td className="px-3 py-2">
                    <Input
                      type="number"
                      min={1}
                      value={item.quantity}
                      onChange={(e) => updateItem(item.key, "quantity", parseInt(e.target.value) || 1)}
                      className="h-8 text-xs border-slate-200 text-center w-20 mx-auto"
                    />
                  </td>

                  {/* Free Quantity */}
                  <td className="px-3 py-2">
                    {item.isFreeGood ? (
                      <div className="h-8 flex items-center justify-center text-xs text-muted-foreground">—</div>
                    ) : (
                      <Input
                        type="number"
                        min={0}
                        value={item.freeQuantity || ""}
                        onChange={(e) => updateItem(item.key, "freeQuantity", parseInt(e.target.value) || 0)}
                        placeholder="0"
                        className="h-8 text-xs border-slate-200 text-center w-20 mx-auto"
                      />
                    )}
                  </td>

                  {/* Pack Size */}
                  <td className="px-3 py-2">
                    <Input
                      type="number"
                      min={1}
                      value={item.packSize}
                      onChange={(e) => updateItem(item.key, "packSize", parseInt(e.target.value) || 1)}
                      className="h-8 text-xs border-slate-200 text-center w-20 mx-auto"
                    />
                  </td>

                  {/* Sell Price (MRP) */}
                  <td className="px-3 py-2">
                    <Input
                      type="number"
                      min={0}
                      step={0.01}
                      value={item.sellPrice || ""}
                      onChange={(e) => updateItem(item.key, "sellPrice", parseFloat(e.target.value) || 0)}
                      placeholder="₹ MRP"
                      className="h-8 text-xs border-slate-200 text-right w-24 ml-auto"
                    />
                  </td>

                  {/* Free Good Checkbox */}
                  <td className="px-3 py-2 text-center">
                    <div className="flex items-center justify-center h-8">
                      <Checkbox
                        checked={item.isFreeGood}
                        onCheckedChange={(checked) => {
                          updateItemMulti(item.key, {
                            isFreeGood: !!checked,
                            freeQuantity: checked ? 0 : item.freeQuantity,
                          })
                        }}
                        className="data-[state=checked]:bg-violet-600 data-[state=checked]:border-violet-600"
                      />
                    </div>
                  </td>

                  {/* Remove */}
                  <td className="px-3 py-2 text-center">
                    <button
                      onClick={() => removeLine(item.key)}
                      className="text-slate-300 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Free goods info banner */}
        {items.some(i => i.freeQuantity > 0) && (
          <div className="mx-4 mb-4 p-3 bg-emerald-50 border border-emerald-200 rounded-lg flex items-start gap-2">
            <Gift className="h-4 w-4 text-emerald-600 mt-0.5 shrink-0" />
            <div className="text-xs text-emerald-800">
              <strong>Free / Bonus goods</strong> from supplier schemes (e.g., Buy 10 Get 2 Free) will be added to inventory stock.
              These will be factored in when converting to a purchase invoice.
            </div>
          </div>
        )}
        {items.some(i => i.isFreeGood) && (
          <div className="mx-4 mb-4 p-3 bg-violet-50 border border-violet-200 rounded-lg flex items-start gap-2">
            <Gift className="h-4 w-4 text-violet-600 mt-0.5 shrink-0" />
            <div className="text-xs text-violet-800">
              <strong>{items.filter(i => i.isFreeGood).length} Supplier Free Good{items.filter(i => i.isFreeGood).length > 1 ? 's' : ''}</strong> — Entire items given free by the supplier.
              Added to inventory at ₹0 cost. Will carry over when converting to purchase invoice.
            </div>
          </div>
        )}
      </div>

      {/* Footer Actions */}
      <div className="flex items-center justify-between">
        <p className="text-xs text-slate-400">
          {isEdit ? "Inventory will be reversed and re-added with the updated items." : "Stock will be added to inventory immediately. Purchase prices can be added later when converting to invoice."}
        </p>
        <div className="flex items-center gap-3">
          <Link href="/dashboard/pharmacy/challans">
            <Button variant="outline" className={`${neo.shadowSm} border-none rounded-xl`}>
              Cancel
            </Button>
          </Link>
          <Button
            onClick={handleSubmit}
            disabled={isPending}
            className="bg-amber-600 hover:bg-amber-700 text-white rounded-xl shadow-md px-6"
          >
            {isPending ? (
              <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Saving...</>
            ) : (
              <><CheckCircle2 className="h-4 w-4 mr-2" /> {isEdit ? "Update Challan" : "Create Challan & Add Stock"}</>
            )}
          </Button>
        </div>
      </div>
    </div>
  )
}
