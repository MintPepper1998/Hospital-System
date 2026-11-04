"use client"

import { useState, useTransition, useCallback, useEffect, useRef } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
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
  PackagePlus,
  Gift,
  Search,
  IndianRupee,
  Tag,
} from "lucide-react"
import { toast } from "sonner"
import { addStockBatch } from "@/lib/actions"
import { createPurchaseInvoiceFromStock } from "@/lib/actions/purchase-invoices"

// ============================================
// TYPES
// ============================================

interface Medicine {
  id: string
  name: string
  strength: string | null
  type: string
  hsnCode?: string | null
  unitPrice: number
}

interface Supplier {
  id: string
  name: string
}

interface StockLineItem {
  key: string
  medicineId: string
  medicineName: string
  medicineType: string
  batchNumber: string
  expiryDate: string
  manufactureDate: string
  hsnCode: string
  quantity: number        // Strips/Boxes received (paid)
  freeQuantity: number    // Free/Bonus strips
  packSize: number        // Medicines per strip/box
  purchasePrice: number   // Rate per strip/box
  sellingPrice: number    // MRP per strip/box
  discountPercent: number // Per-item discount % from supplier
  taxPercent: number
  grnNumber: string
  isFreeGood: boolean     // Entire item is a supplier free good (₹0 cost)
}

interface Props {
  medicines: Medicine[]
  suppliers: Supplier[]
}

// ============================================
// HELPERS
// ============================================

function generateKey(): string {
  return Math.random().toString(36).slice(2, 10)
}

function emptyLine(): StockLineItem {
  return {
    key: generateKey(),
    medicineId: "",
    medicineName: "",
    medicineType: "",
    batchNumber: "",
    expiryDate: "",
    manufactureDate: "",
    hsnCode: "",
    quantity: 1,
    freeQuantity: 0,
    packSize: 1,
    purchasePrice: 0,
    sellingPrice: 0,
    discountPercent: 0,
    taxPercent: 0,
    grnNumber: "",
    isFreeGood: false,
  }
}

// Round to 2 decimal places to avoid floating-point drift
function round2(n: number): number {
  return Number(n.toFixed(2))
}

// Amount = Qty × Rate (before discount)
function lineAmount(item: StockLineItem): number {
  return round2(item.quantity * item.purchasePrice)
}

// Per-item discount in ₹
function lineDiscount(item: StockLineItem): number {
  return round2(lineAmount(item) * (item.discountPercent / 100))
}

// Taxable = Amount - Discount (GST base per Indian GST law Section 15)
function lineTaxable(item: StockLineItem): number {
  return round2(lineAmount(item) - lineDiscount(item))
}

// GST computed on taxable amount (after discount)
function lineTax(item: StockLineItem): number {
  return round2(lineTaxable(item) * (item.taxPercent / 100))
}

// Total = Taxable + GST
function lineTotal(item: StockLineItem): number {
  return round2(lineTaxable(item) + lineTax(item))
}

function formatINR(n: number): string {
  return `₹${n.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

// ============================================
// MAIN FORM
// ============================================

export function AddStockEntryForm({ medicines, suppliers }: Props) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const submittedRef = useRef(false)

  // Invoice header
  const [supplierId, setSupplierId] = useState("")
  const [invoiceNumber, setInvoiceNumber] = useState("")
  const [invoiceDate, setInvoiceDate] = useState(new Date().toISOString().split("T")[0])

  // Line items
  const [items, setItems] = useState<StockLineItem[]>([emptyLine()])

  // Medicine search state
  const [searchQuery, setSearchQuery] = useState<Record<string, string>>({})
  const [searchResults, setSearchResults] = useState<Record<string, Medicine[]>>({})
  const [searching, setSearching] = useState<Record<string, boolean>>({})
  const searchDebounceRef = useRef<Record<string, ReturnType<typeof setTimeout>>>({})

  // Payment
  const [amountPaid, setAmountPaid] = useState("")

  // Draft auto-save and recovery removed as per user request to always keep it blank on open.

  // ── Item mutations ──────────────────────
  const updateItem = (key: string, field: keyof StockLineItem, value: any) => {
    setItems((prev) => prev.map((item) => item.key === key ? { ...item, [field]: value } : item))
  }

  const updateItemMulti = (key: string, patch: Partial<StockLineItem>) => {
    setItems((prev) => prev.map((item) => item.key === key ? { ...item, ...patch } : item))
  }

  const addRow = () => setItems((prev) => [...prev, emptyLine()])

  const removeRow = (key: string) => {
    if (items.length <= 1) return
    setItems((prev) => prev.filter((item) => item.key !== key))
  }

  // ── Medicine search ──────────────────────
  const handleMedicineSearch = useCallback((key: string, query: string) => {
    setSearchQuery((prev) => ({ ...prev, [key]: query }))

    // Also update item name
    setItems((prev) =>
      prev.map((item) =>
        item.key === key ? { ...item, medicineName: query, medicineId: "", medicineType: "" } : item
      )
    )

    if (searchDebounceRef.current[key]) {
      clearTimeout(searchDebounceRef.current[key])
    }

    if (query.length < 2) {
      setSearchResults((prev) => ({ ...prev, [key]: [] }))
      setSearching((prev) => ({ ...prev, [key]: false }))
      return
    }

    searchDebounceRef.current[key] = setTimeout(() => {
      setSearching((prev) => ({ ...prev, [key]: true }))
      const q = query.trim().toLowerCase()
      const filtered = medicines.filter(
        (m) =>
          m.name.toLowerCase().includes(q) ||
          m.strength?.toLowerCase().includes(q)
      ).slice(0, 100)
      setSearchResults((prev) => ({ ...prev, [key]: filtered }))
      setSearching((prev) => ({ ...prev, [key]: false }))
    }, 200)
  }, [medicines])

  const selectMedicine = (key: string, med: Medicine) => {
    updateItemMulti(key, {
      medicineId: med.id,
      medicineName: `${med.name}${med.strength ? ` (${med.strength})` : ""}`,
      medicineType: med.type || "",
      hsnCode: med.hsnCode || "",
      sellingPrice: med.unitPrice || 0,
    })
    setSearchQuery((prev) => ({ ...prev, [key]: "" }))
    setSearchResults((prev) => ({ ...prev, [key]: [] }))
  }

  useEffect(() => {
    return () => {
      for (const key of Object.keys(searchDebounceRef.current)) {
        clearTimeout(searchDebounceRef.current[key])
      }
    }
  }, [])

  // ── Totals (Per-item discount, matching supplier invoice format) ──
  // Only count paid items (not free goods) for totals
  const paidItems = items.filter((i) => !i.isFreeGood)
  // Amount = Sum of (Qty × Rate) before any discount
  const totalAmount = paidItems.reduce((sum, item) => sum + lineAmount(item), 0)
  // Disc = Sum of per-item discounts
  const totalDiscount = paidItems.reduce((sum, item) => sum + lineDiscount(item), 0)
  // Tot = Taxable amount after discount
  const taxableTotal = paidItems.reduce((sum, item) => sum + lineTaxable(item), 0)
  // GST = Tax on taxable amount (per-item, after discount)
  const taxTotal = paidItems.reduce((sum, item) => sum + lineTax(item), 0)
  // Grand Total = Taxable + GST
  const grandTotal = taxableTotal + taxTotal
  const paidAmount = parseFloat(amountPaid) || 0
  const balanceDue = grandTotal - paidAmount

  // Count items with free qty
  const freeItemsCount = items.filter((i) => i.freeQuantity > 0).length
  // Count supplier free goods
  const freeGoodsCount = items.filter((i) => i.isFreeGood).length

  // ── Submit ──────────────────────────────────
  const handleSubmit = () => {
    if (submittedRef.current || isPending) return
    if (!supplierId) return toast.error("Please select a supplier")
    if (!invoiceNumber.trim()) return toast.error("Please enter the invoice number")
    if (!invoiceDate) return toast.error("Please select invoice date")

    // Filter out rows that are completely empty (e.g. user clicked "+ Add Row" extra times)
    const activeItems = items.filter(
      (i) => i.medicineName?.trim() || i.batchNumber?.trim() || i.medicineId || i.purchasePrice > 0
    )
    if (activeItems.length === 0) {
      return toast.error("Please enter at least one medicine item.")
    }

    // ═══ ALL-OR-NOTHING VALIDATION ═══
    // Validate EVERY single row. NEVER silently discard any row.
    const validationErrors: string[] = []
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    for (let idx = 0; idx < activeItems.length; idx++) {
      const item = activeItems[idx]
      const row = idx + 1
      const label = item.medicineName?.trim() ? `Row ${row} ("${item.medicineName}")` : `Row ${row}`

      if (!item.medicineName?.trim()) {
        validationErrors.push(`Row ${row}: Medicine name is required`)
      }
      if (!item.batchNumber?.trim()) {
        validationErrors.push(`${label}: Batch number is required`)
      }
      if (!item.expiryDate) {
        validationErrors.push(`${label}: Expiry date is required`)
      } else {
        const expiry = new Date(item.expiryDate)
        if (expiry < today) {
          validationErrors.push(`${label}: Expiry date must be in the future`)
        }
      }
      if (!item.quantity || item.quantity < 1) {
        validationErrors.push(`${label}: Quantity must be at least 1`)
      }
      if (!item.isFreeGood && (!item.purchasePrice || item.purchasePrice <= 0)) {
        validationErrors.push(`${label}: Purchase rate (₹) is required`)
      }
      if (!item.sellingPrice || item.sellingPrice <= 0) {
        validationErrors.push(`${label}: Selling price / MRP (₹) is required`)
      }
      if (!item.packSize || item.packSize < 1) {
        validationErrors.push(`${label}: Pack size must be at least 1`)
      }
    }

    if (validationErrors.length > 0) {
      validationErrors.slice(0, 3).forEach(err => toast.error(err))
      if (validationErrors.length > 3) {
        toast.error(`Plus ${validationErrors.length - 3} more errors. Please review all items.`)
      }
      return
    }

    // All items passed validation — save EVERYTHING in a single atomic batch
    startTransition(async () => {
      submittedRef.current = true

      // 1. Save ALL items to inventory in one transaction (atomic — all or nothing)
      const stockResult = await addStockBatch({
        supplierId,
        invoiceNumber: invoiceNumber.trim(),
        invoiceDate,
        items: activeItems.map(item => ({
          medicineId: item.medicineId || undefined,
          medicineName: item.medicineName.trim(),
          batchNumber: item.batchNumber.trim(),
          quantity: item.quantity,
          freeQuantity: item.freeQuantity || 0,
          packSize: item.packSize || 1,
          purchasePrice: item.purchasePrice,
          sellingPrice: item.sellingPrice,
          taxPercent: item.taxPercent || 0,
          discountPercent: item.discountPercent || 0,
          expiryDate: item.expiryDate,
          manufactureDate: item.manufactureDate || undefined,
          grnNumber: item.grnNumber || undefined,
          hsnCode: item.hsnCode || undefined,
          isFreeGood: item.isFreeGood,
        })),
      })

      if (!stockResult.success) {
        toast.error(stockResult.message || "Failed to add stock")
        submittedRef.current = false
        return
      }

      // Map resolved medicine IDs from batch result
      const resultMap = new Map<number, string>()
      if (stockResult.results && Array.isArray(stockResult.results)) {
        stockResult.results.forEach((r, idx) => {
          if (r?.medicineId) resultMap.set(idx, r.medicineId)
        })
      }

      // 2. Create purchase invoice for ALL items (stock already saved atomically)
      const round4 = (n: number) => Number(n.toFixed(4))
      await createPurchaseInvoiceFromStock({
        invoiceNumber: invoiceNumber.trim(),
        invoiceDate,
        supplierId,
        items: activeItems.map((item, idx) => ({
          medicineName: item.medicineName.trim(),
          medicineId: resultMap.get(idx) || item.medicineId || "",
          batchNumber: item.batchNumber.trim(),
          expiryDate: item.expiryDate,
          hsnCode: item.hsnCode,
          quantity: item.quantity * item.packSize,
          freeQuantity: (item.freeQuantity || 0) * item.packSize,
          packSize: item.packSize || 1,
          purchasePricePerUnit: item.isFreeGood ? 0 : round4(item.purchasePrice / item.packSize),
          sellingPricePerUnit: round4(item.sellingPrice / item.packSize),
          taxPercent: item.isFreeGood ? 0 : item.taxPercent,
          discountPercent: item.isFreeGood ? 0 : item.discountPercent,
          isFreeGood: item.isFreeGood,
        })),
      })

      toast.success(`✅ All ${activeItems.length} item(s) added to stock successfully!`)
      router.push("/dashboard/pharmacy/inventory")
    })
  }

  return (
    <div className="space-y-6 pb-8">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/dashboard/pharmacy/inventory"><ArrowLeft className="h-4 w-4" /></Link>
        </Button>
        <div>
          <h2 className="text-xl font-bold tracking-tight text-gray-900 flex items-center gap-2">
            <PackagePlus className="h-5 w-5 text-[#0066CC]" />
            Add Stock / Purchase Entry
          </h2>
          <p className="text-sm text-muted-foreground">Record incoming stock with automatic inventory & purchase invoice updates</p>
        </div>
      </div>

      {/* ── INVOICE HEADER ─────────────────── */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Invoice Details</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Supplier <span className="text-red-500">*</span></Label>
              <Select value={supplierId} onValueChange={setSupplierId}>
                <SelectTrigger><SelectValue placeholder="Select supplier..." /></SelectTrigger>
                <SelectContent>
                  {suppliers.map((s) => (
                    <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Invoice Number <span className="text-red-500">*</span></Label>
              <Input value={invoiceNumber} onChange={(e) => setInvoiceNumber(e.target.value)} placeholder="e.g., INV-2024-001" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Invoice Date <span className="text-red-500">*</span></Label>
              <Input type="date" value={invoiceDate} onChange={(e) => setInvoiceDate(e.target.value)} />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ── ITEM GRID ──────────────────────── */}
      <Card>
        <CardHeader className="pb-3 flex flex-row items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <PackagePlus className="h-4 w-4 text-gray-500" />
            Items ({items.length})
            {freeItemsCount > 0 && (
              <span className="ml-2 inline-flex items-center gap-1 text-[10px] bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-full px-2 py-0.5">
                <Gift className="h-3 w-3" /> {freeItemsCount} with free qty
              </span>
            )}
            {freeGoodsCount > 0 && (
              <span className="ml-1 inline-flex items-center gap-1 text-[10px] bg-violet-50 text-violet-700 border border-violet-200 rounded-full px-2 py-0.5">
                <Gift className="h-3 w-3" /> {freeGoodsCount} free good{freeGoodsCount > 1 ? 's' : ''}
              </span>
            )}
          </CardTitle>
          <Button type="button" size="sm" variant="outline" onClick={addRow}>
            <Plus className="h-3.5 w-3.5 mr-1" /> Add Row
          </Button>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[1200px]">
              <thead>
                <tr className="border-b text-xs text-muted-foreground">
                  <th className="text-left py-2 px-1 w-[260px]">Medicine Name</th>
                  <th className="text-left py-2 px-1 w-[70px]">Type</th>
                  <th className="text-left py-2 px-1 w-[90px]">Batch No</th>
                  <th className="text-left py-2 px-1 w-[115px]">Expiry</th>
                  <th className="text-left py-2 px-1 w-[85px]">HSN</th>
                  <th className="text-right py-2 px-1 w-[70px]">Qty</th>
                  <th className="text-right py-2 px-1 w-[65px]">
                    <span className="flex items-center justify-end gap-0.5">
                      <Gift className="h-3 w-3 text-emerald-600" /> Free
                    </span>
                  </th>
                  <th className="text-right py-2 px-1 w-[65px]">Pack</th>
                  <th className="text-right py-2 px-1 w-[105px]">Rate ₹</th>
                  <th className="text-right py-2 px-1 w-[105px]">MRP ₹</th>
                  <th className="text-right py-2 px-1 w-[70px]">
                    <span className="flex items-center justify-end gap-0.5">
                      <Tag className="h-3 w-3 text-orange-500" /> Dis%
                    </span>
                  </th>
                  <th className="text-right py-2 px-1 w-[70px]">GST%</th>
                  <th className="text-right py-2 px-1 w-[100px]">Amount</th>
                  <th className="text-center py-2 px-1 w-[44px]" title="Supplier Free Good (entire item at ₹0)">
                    <span className="flex items-center justify-center gap-0.5">
                      <Gift className="h-3 w-3 text-violet-500" />
                    </span>
                  </th>
                  <th className="py-2 px-1 w-[36px]"></th>
                </tr>
              </thead>
              <tbody>
                {items.map((item) => {
                  return (
                    <tr key={item.key} className={`border-b border-dashed align-top ${item.isFreeGood ? 'bg-violet-50/50' : ''}`}>
                      {/* Medicine Name + Search */}
                      <td className="py-1.5 px-1 relative">
                        <Popover
                          open={(searchResults[item.key]?.length ?? 0) > 0}
                          onOpenChange={(open) => {
                            if (!open) setSearchResults((prev) => ({ ...prev, [item.key]: [] }))
                          }}
                        >
                          <PopoverAnchor asChild>
                            <div className="relative">
                              <Input
                                value={item.medicineName}
                                onChange={(e) => handleMedicineSearch(item.key, e.target.value)}
                                placeholder="Type medicine name..."
                                className="h-8 text-xs pr-7"
                                title={item.medicineName}
                              />
                              {searching[item.key] && (
                                <Loader2 className="h-3 w-3 animate-spin absolute right-2 top-2.5 text-muted-foreground" />
                              )}
                              {!searching[item.key] && item.medicineName.length >= 2 && !item.medicineId && (
                                <Search className="h-3 w-3 absolute right-2 top-2.5 text-muted-foreground" />
                              )}
                            </div>
                          </PopoverAnchor>
                          <PopoverContent
                            asChild
                            onOpenAutoFocus={(e) => e.preventDefault()}
                            align="start"
                            className="p-0 w-[300px]"
                          >
                            <div className="max-h-56 overflow-y-auto">
                              {searchResults[item.key]?.map((med) => (
                                <button
                                  key={med.id}
                                  type="button"
                                  className="w-full text-left px-3 py-1.5 hover:bg-gray-50 text-xs border-b last:border-0"
                                  onClick={() => selectMedicine(item.key, med)}
                                >
                                  {med.name} {med.strength ? `(${med.strength})` : ""} — {med.type}
                                  {med.unitPrice ? <span className="ml-1 text-muted-foreground">(MRP: ₹{med.unitPrice})</span> : null}
                                </button>
                              ))}
                            </div>
                          </PopoverContent>
                        </Popover>
                        {item.medicineId ? (
                          <span className="text-[9px] mt-0.5 block text-teal-600 font-medium">
                            ✓ Linked
                          </span>
                        ) : item.medicineName.trim().length >= 2 ? (
                          <span className="text-[9px] mt-0.5 block text-amber-600 font-medium" title="Will be auto-created and linked on save">
                            ✨ New / Auto-create
                          </span>
                        ) : null}
                      </td>
                      {/* Type (auto-filled) */}
                      <td className="py-1.5 px-1">
                        <Input
                          value={item.medicineType}
                          readOnly
                          className="h-8 text-xs bg-muted text-muted-foreground"
                          placeholder="Auto"
                        />
                      </td>
                      {/* Batch */}
                      <td className="py-1.5 px-1">
                        <Input value={item.batchNumber} onChange={(e) => updateItem(item.key, "batchNumber", e.target.value)} placeholder="e.g., B-001" className="h-8 text-xs" />
                      </td>
                      {/* Expiry */}
                      <td className="py-1.5 px-1">
                        <Input type="date" value={item.expiryDate} onChange={(e) => updateItem(item.key, "expiryDate", e.target.value)} className="h-8 text-xs" />
                      </td>
                      {/* HSN Code */}
                      <td className="py-1.5 px-1">
                        <Input value={item.hsnCode} onChange={(e) => updateItem(item.key, "hsnCode", e.target.value)} placeholder="3004" className="h-8 text-xs" />
                      </td>
                      {/* Qty */}
                      <td className="py-1.5 px-1">
                        <Input type="number" min="1" value={item.quantity || ""} onChange={(e) => updateItem(item.key, "quantity", parseInt(e.target.value) || 0)} placeholder="1" className="h-8 text-xs text-right" />
                      </td>
                      {/* Free Qty */}
                      <td className="py-1.5 px-1">
                        <Input type="number" min="0" value={item.freeQuantity || ""} onChange={(e) => updateItem(item.key, "freeQuantity", parseInt(e.target.value) || 0)} placeholder="0" className="h-8 text-xs text-right" />
                      </td>
                      {/* Pack Size */}
                      <td className="py-1.5 px-1">
                        <Input type="number" min="1" value={item.packSize || ""} onChange={(e) => updateItem(item.key, "packSize", parseInt(e.target.value) || 1)} placeholder="1" className="h-8 text-xs text-right" />
                      </td>
                      {/* Rate (Purchase Price) */}
                      <td className="py-1.5 px-1">
                        {item.isFreeGood ? (
                          <div className="h-8 flex items-center justify-end text-xs text-muted-foreground">₹0</div>
                        ) : (
                          <Input type="number" min="0" step="0.01" value={item.purchasePrice || ""} onChange={(e) => updateItem(item.key, "purchasePrice", parseFloat(e.target.value) || 0)} placeholder="0.00" className="h-8 text-xs text-right" />
                        )}
                      </td>
                      {/* MRP */}
                      <td className="py-1.5 px-1">
                        <Input
                          type="number" min="0" step="0.01"
                          value={item.sellingPrice || ""}
                          onChange={(e) => updateItem(item.key, "sellingPrice", parseFloat(e.target.value) || 0)}
                          placeholder="MRP"
                          className="h-8 text-xs text-right"
                        />
                        {item.purchasePrice > 0 && item.sellingPrice > 0 && (
                          <span className={`text-[9px] mt-0.5 block text-right ${
                            ((item.sellingPrice - item.purchasePrice) / item.purchasePrice) * 100 >= 0
                              ? "text-green-600"
                              : "text-red-500"
                          }`}>
                            {((item.sellingPrice - item.purchasePrice) / item.purchasePrice) * 100 >= 0 ? "↑" : "↓"}{" "}
                            {Math.abs(((item.sellingPrice - item.purchasePrice) / item.purchasePrice) * 100).toFixed(1)}% margin
                          </span>
                        )}
                      </td>
                      {/* Dis% (Per-item discount) */}
                      <td className="py-1.5 px-1">
                        {item.isFreeGood ? (
                          <div className="h-8 flex items-center justify-end text-xs text-muted-foreground">—</div>
                        ) : (
                          <>
                            <Input type="number" min="0" max="100" step="0.01" value={item.discountPercent || ""} onChange={(e) => updateItem(item.key, "discountPercent", parseFloat(e.target.value) || 0)} placeholder="0" className="h-8 text-xs text-right" />
                            {item.discountPercent > 0 && lineDiscount(item) > 0 && (
                              <span className="text-[9px] mt-0.5 block text-right text-orange-600">
                                −₹{lineDiscount(item).toFixed(2)}
                              </span>
                            )}
                          </>
                        )}
                      </td>
                      {/* GST% */}
                      <td className="py-1.5 px-1">
                        {item.isFreeGood ? (
                          <div className="h-8 flex items-center justify-end text-xs text-muted-foreground">—</div>
                        ) : (
                          <Input type="number" min="0" step="0.01" value={item.taxPercent || ""} onChange={(e) => updateItem(item.key, "taxPercent", parseFloat(e.target.value) || 0)} placeholder="0" className="h-8 text-xs text-right" />
                        )}
                      </td>
                      {/* Amount (total after discount + tax) */}
                      <td className="py-1.5 px-1 text-right font-semibold text-xs whitespace-nowrap">
                        {item.isFreeGood ? (
                          <span className="text-violet-600 font-medium">FREE</span>
                        ) : (
                          formatINR(lineTotal(item))
                        )}
                      </td>
                      {/* Free Good Checkbox */}
                      <td className="py-1.5 px-1 text-center">
                        <div className="flex items-center justify-center h-8">
                          <Checkbox
                            checked={item.isFreeGood}
                            onCheckedChange={(checked) => {
                              updateItemMulti(item.key, {
                                isFreeGood: !!checked,
                                purchasePrice: checked ? 0 : item.purchasePrice,
                                discountPercent: checked ? 0 : item.discountPercent,
                                taxPercent: checked ? 0 : item.taxPercent,
                                freeQuantity: checked ? 0 : item.freeQuantity,
                              })
                            }}
                            className="data-[state=checked]:bg-violet-600 data-[state=checked]:border-violet-600"
                          />
                        </div>
                      </td>
                      {/* Delete */}
                      <td className="py-1.5 px-1">
                        {items.length > 1 && (
                          <Button type="button" variant="ghost" size="icon" className="h-7 w-7 text-red-400 hover:text-red-600" onClick={() => removeRow(item.key)}>
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          <Button type="button" variant="ghost" size="sm" className="mt-2 text-[#0066CC] hover:text-[#0052A3]" onClick={addRow}>
            <Plus className="h-3.5 w-3.5 mr-1" /> Add another row
          </Button>

          {/* Free goods info */}
          {freeItemsCount > 0 && (
            <div className="mt-3 p-3 bg-emerald-50 border border-emerald-200 rounded-lg flex items-start gap-2">
              <Gift className="h-4 w-4 text-emerald-600 mt-0.5 shrink-0" />
              <div className="text-xs text-emerald-800">
                <strong>Free / Bonus goods</strong> from supplier schemes (e.g., Buy 10 Get 2 Free) will be added to stock.
                The effective purchase cost per unit is automatically reduced for accurate margin tracking.
              </div>
            </div>
          )}
          {freeGoodsCount > 0 && (
            <div className="mt-3 p-3 bg-violet-50 border border-violet-200 rounded-lg flex items-start gap-2">
              <Gift className="h-4 w-4 text-violet-600 mt-0.5 shrink-0" />
              <div className="text-xs text-violet-800">
                <strong>{freeGoodsCount} Supplier Free Good{freeGoodsCount > 1 ? 's' : ''}</strong> — These items are given entirely free by the supplier.
                They will be added to inventory at ₹0 purchase cost and will not affect the invoice total.
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── TOTALS + PAYMENT ───────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <IndianRupee className="h-4 w-4 text-gray-500" />
              Payment
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Amount Paid Now (₹)</Label>
              <Input
                type="number"
                min="0"
                step="0.01"
                value={amountPaid}
                onChange={(e) => setAmountPaid(e.target.value)}
                placeholder="Enter amount paid to supplier"
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Bill Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Amount</span>
                <span>{formatINR(totalAmount)}</span>
              </div>
              {totalDiscount > 0 && (
                <div className="flex justify-between text-orange-600">
                  <span className="flex items-center gap-1">
                    <Tag className="h-3 w-3" />
                    Disc
                  </span>
                  <span>−{formatINR(totalDiscount)}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-muted-foreground">Tot (Taxable)</span>
                <span>{formatINR(taxableTotal)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">GST</span>
                <span>{formatINR(taxTotal)}</span>
              </div>
              <Separator />
              <div className="flex justify-between text-base font-bold">
                <span>Grand Total</span>
                <span className="text-[#0066CC]">{formatINR(grandTotal)}</span>
              </div>
              {totalDiscount > 0 && (
                <div className="text-[10px] text-muted-foreground text-right">
                  You save {formatINR(totalDiscount)} on this purchase
                </div>
              )}
              <Separator />
              <div className="flex justify-between">
                <span className="text-muted-foreground">Amount Paid</span>
                <span className="text-green-600 font-medium">{formatINR(paidAmount)}</span>
              </div>
              <div className="flex justify-between font-semibold">
                <span className="text-muted-foreground">Balance Due</span>
                <span className={balanceDue > 0 ? "text-red-600" : "text-green-600"}>{formatINR(balanceDue)}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ── SAVE BUTTON ────────────────────── */}
      <div className="flex justify-end gap-3">
        <Button variant="outline" asChild>
          <Link href="/dashboard/pharmacy/inventory">Cancel</Link>
        </Button>
        <Button onClick={handleSubmit} disabled={isPending} className="bg-[#0066CC] hover:bg-[#0052A3] px-8">
          {isPending ? (
            <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Saving...</>
          ) : (
            <><CheckCircle2 className="h-4 w-4 mr-2" /> Save Stock Entry</>
          )}
        </Button>
      </div>
    </div>
  )
}
