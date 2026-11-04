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
  Tag,
  IndianRupee,
} from "lucide-react"
import { toast } from "sonner"
import { updatePurchaseInvoiceFull } from "@/lib/actions/purchase-invoices"

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
  medicineStrength: string // Display-only: e.g. "500mg", "10ml"
  batchNumber: string
  expiryDate: string
  hsnCode: string
  quantity: number        // Strips/Boxes received (paid)
  freeQuantity: number    // Free/Bonus strips
  packSize: number        // Medicines per strip/box
  purchasePrice: number   // Rate per strip/box
  sellingPrice: number    // MRP per strip/box
  discountPercent: number // Per-item discount % from supplier
  taxPercent: number
  // Original DB values in total units — used to prevent rounding drift on save
  _dbQuantityUnits?: number
  _dbFreeQuantityUnits?: number
  isFreeGood: boolean     // Entire item is a supplier free good (₹0 cost)
}

interface Props {
  invoice: any
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
    medicineStrength: "",
    batchNumber: "",
    expiryDate: "",
    hsnCode: "",
    quantity: 1,
    freeQuantity: 0,
    packSize: 1,
    purchasePrice: 0,
    sellingPrice: 0,
    discountPercent: 0,
    taxPercent: 0,
    isFreeGood: false,
  }
}

// Round to 2 decimal places — uses toFixed to avoid Number.EPSILON bias
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

// Taxable = Amount - Discount
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

function invoiceItemsToLineItems(items: any[]): StockLineItem[] {
  if (!items || items.length === 0) return [emptyLine()]
  return items.map((item) => {
    // PurchaseItem stores per-unit values (rate, sellPrice) and total units (quantity, freeQuantity)
    // We reverse-convert to strip-level for the form (matching how add-stock-entry-form works)
    const packSize = item.packSize || 1
    // Use ceil to prevent 0 strips when there are loose units (e.g., 5 units / 10 pack = 1 strip displayed)
    // _dbQuantityUnits preserves the exact count so save won't lose precision
    const strips = packSize > 1 ? Math.max(1, Math.ceil(item.quantity / packSize)) : item.quantity
    const freeStrips = packSize > 1 ? Math.ceil((item.freeQuantity || 0) / packSize) : (item.freeQuantity || 0)
    // Round to 2 decimals to prevent floating-point drift on each edit cycle
    const stripPrice = round2((item.rate || 0) * packSize)       // per-unit rate × packSize = strip price
    const stripMRP = round2((item.sellPrice || 0) * packSize)    // per-unit MRP × packSize = strip MRP

    return {
      key: generateKey(),
      medicineId: item.medicineId || "",
      medicineName: item.itemName || "",
      medicineType: item.medicine?.type || (item.medicineId ? "—" : ""),
      medicineStrength: item.medicine?.strength || "",
      batchNumber: item.batchNumber || "",
      expiryDate: item.expiryDate ? new Date(item.expiryDate).toISOString().split("T")[0] : "",
      hsnCode: item.hsnCode || "",
      quantity: strips || 1,
      freeQuantity: freeStrips,
      packSize,
      purchasePrice: stripPrice,
      sellingPrice: stripMRP,
      discountPercent: item.discountPercent || 0,
      taxPercent: item.taxPercent || 0,
      // Preserve original DB total-unit values so save doesn't lose loose units
      _dbQuantityUnits: item.quantity,
      _dbFreeQuantityUnits: item.freeQuantity || 0,
      isFreeGood: item.isFreeGood || false,
    }
  })
}

// ============================================
// MAIN FORM
// ============================================

export function PurchaseInvoiceEditForm({ invoice, medicines, suppliers }: Props) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  // Invoice header
  const [supplierId, setSupplierId] = useState(invoice.supplierId || "")
  const [invoiceNumber, setInvoiceNumber] = useState(invoice.invoiceNumber || "")
  const [invoiceDate, setInvoiceDate] = useState(
    invoice.date ? new Date(invoice.date).toISOString().split("T")[0] : new Date().toISOString().split("T")[0]
  )

  // Line items
  const [items, setItems] = useState<StockLineItem[]>(invoiceItemsToLineItems(invoice.items))

  // Medicine search state
  const [searchQuery, setSearchQuery] = useState<Record<string, string>>({})
  const [searchResults, setSearchResults] = useState<Record<string, Medicine[]>>({})
  const [searching, setSearching] = useState<Record<string, boolean>>({})
  const searchDebounceRef = useRef<Record<string, ReturnType<typeof setTimeout>>>({})

  // Payment
  const [amountPaid, setAmountPaid] = useState(invoice.amountPaid?.toString() || "")

  // Note: LocalStorage draft auto-restore intentionally disabled so invoice items from DB are never overwritten with stale drafts
  const clearDraft = () => {
    try { localStorage.removeItem(`sk-edit-invoice-draft-${invoice.id}`) } catch { /* ignore */ }
  }

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
      medicineStrength: med.strength || "",
      hsnCode: med.hsnCode || "",
      sellingPrice: med.unitPrice || 0,
    })
    // Remove the search query entry entirely so input falls back to item.medicineName
    setSearchQuery((prev) => {
      const next = { ...prev }
      delete next[key]
      return next
    })
    setSearchResults((prev) => ({ ...prev, [key]: [] }))
  }

  useEffect(() => {
    return () => {
      for (const key of Object.keys(searchDebounceRef.current)) {
        clearTimeout(searchDebounceRef.current[key])
      }
    }
  }, [])

  // ── Round Off (manual) ──
  const [roundOff, setRoundOff] = useState(invoice.roundOff?.toString() || "0")

  // ── Totals ──
  const paidItems = items.filter((i) => !i.isFreeGood)
  const taxableTotal = round2(paidItems.reduce((sum, item) => sum + lineTaxable(item), 0))
  const taxTotal = round2(paidItems.reduce((sum, item) => sum + lineTax(item), 0))
  const computedTotal = round2(taxableTotal + taxTotal)
  const roundOffValue = parseFloat(roundOff) || 0
  const grandTotal = round2(computedTotal + roundOffValue)
  const paidAmount = parseFloat(amountPaid) || 0
  const balanceDue = round2(grandTotal - paidAmount)
  const freeItemsCount = items.filter((i) => i.freeQuantity > 0).length
  const freeGoodsCount = items.filter((i) => i.isFreeGood).length

  // ── Submit ──────────────────────────────────
  const handleSubmit = () => {
    if (!supplierId) return toast.error("Please select a supplier")
    if (!invoiceNumber.trim()) return toast.error("Please enter the invoice number")
    if (!invoiceDate) return toast.error("Please select invoice date")

    // Filter out rows that are completely empty
    const activeItems = items.filter(
      (i) => i.medicineName?.trim() || i.batchNumber?.trim() || i.medicineId || i.purchasePrice > 0
    )
    if (activeItems.length === 0) {
      return toast.error("Please enter at least one item.")
    }

    // Validate ALL active rows — never silently drop any row
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

    startTransition(async () => {
      const result = await updatePurchaseInvoiceFull(invoice.id, {
        invoiceNumber: invoiceNumber.trim(),
        date: new Date(invoiceDate).toISOString(),
        supplierId,
        amountPaid: paidAmount,
        roundOff: roundOffValue,
        items: activeItems.map((i) => {
          const dbStrips = i._dbQuantityUnits != null && i.packSize > 1
            ? Math.ceil(i._dbQuantityUnits / i.packSize) : null
          const dbFreeStrips = i._dbFreeQuantityUnits != null && i.packSize > 1
            ? Math.ceil(i._dbFreeQuantityUnits / i.packSize) : null

          const useOriginalQty = dbStrips !== null && i.quantity === dbStrips
          const useOriginalFree = dbFreeStrips !== null && i.freeQuantity === dbFreeStrips

          return {
            itemName: i.medicineName.trim(),
            medicineId: i.medicineId || undefined,
            batchNumber: i.batchNumber.trim(),
            expiryDate: i.expiryDate ? new Date(i.expiryDate).toISOString() : undefined,
            hsnCode: i.hsnCode,
            quantity: i.quantity,
            freeQuantity: i.freeQuantity || 0,
            packSize: i.packSize || 1,
            rate: i.isFreeGood ? 0 : i.purchasePrice,
            sellPrice: i.sellingPrice,
            taxPercent: i.isFreeGood ? 0 : i.taxPercent,
            discountPercent: i.isFreeGood ? 0 : i.discountPercent,
            totalAmount: i.isFreeGood ? 0 : lineTotal(i),
            _dbQuantityUnits: useOriginalQty ? i._dbQuantityUnits : undefined,
            _dbFreeQuantityUnits: useOriginalFree ? i._dbFreeQuantityUnits : undefined,
            isFreeGood: i.isFreeGood,
          }
        }),
      })

      if (result.success) {
        clearDraft()
        toast.success(result.message)
        router.push(`/dashboard/pharmacy/purchase-invoices/${invoice.id}`)
      } else {
        toast.error(result.message)
      }
    })
  }

  return (
    <div className="space-y-6 pb-8">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" asChild>
          <Link href={`/dashboard/pharmacy/purchase-invoices/${invoice.id}`}><ArrowLeft className="h-4 w-4" /></Link>
        </Button>
        <div>
          <h2 className="text-xl font-bold tracking-tight text-gray-900 flex items-center gap-2">
            <PackagePlus className="h-5 w-5 text-[#0066CC]" />
            Edit Stock / Purchase Entry
          </h2>
          <p className="text-sm text-muted-foreground">Editing invoice <strong>{invoice.invoiceNumber}</strong> with automatic inventory updates</p>
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
                  <th className="text-left py-2 px-1 w-[230px]">Medicine Name</th>
                  <th className="text-left py-2 px-1 w-[70px]">Type</th>
                  <th className="text-left py-2 px-1 w-[90px]">Strength</th>
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
                                onFocus={() => {
                                  if (item.medicineName && !item.medicineId) {
                                    handleMedicineSearch(item.key, item.medicineName)
                                  }
                                }}
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
                              {searchResults[item.key]?.map((r) => (
                                <button
                                  key={r.id}
                                  type="button"
                                  className="w-full text-left px-3 py-1.5 hover:bg-gray-50 text-xs border-b last:border-0"
                                  onClick={() => selectMedicine(item.key, r)}
                                >
                                  {r.name} {r.strength ? `(${r.strength})` : ""} — {r.type}
                                  {r.unitPrice ? <span className="ml-1 text-muted-foreground">(MRP: ₹{r.unitPrice})</span> : null}
                                </button>
                              ))}
                            </div>
                          </PopoverContent>
                        </Popover>
                        {item.medicineId ? (
                          <span className="text-[9px] mt-0.5 block text-teal-600 font-medium">
                            ✓ Linked ({item.medicineId.slice(-6)})
                          </span>
                        ) : item.medicineName.trim().length >= 2 ? (
                          <span className="text-[9px] mt-0.5 block text-amber-600 font-medium" title="Will be auto-created and linked on save">
                            ✨ New / Auto-create
                          </span>
                        ) : null}
                      </td>
                      {/* Type */}
                      <td className="py-1.5 px-1">
                        <Input value={item.medicineType} readOnly className="h-8 text-xs bg-gray-50 text-gray-500" placeholder="Auto" />
                      </td>
                      {/* Strength */}
                      <td className="py-1.5 px-1">
                        <Input value={item.medicineStrength} readOnly className="h-8 text-xs bg-gray-50 text-gray-500" placeholder="—" />
                      </td>
                      {/* Batch */}
                      <td className="py-1.5 px-1">
                        <Input value={item.batchNumber} onChange={(e) => updateItem(item.key, "batchNumber", e.target.value)} placeholder="e.g., B-001" className="h-8 text-xs" />
                      </td>
                      {/* Expiry */}
                      <td className="py-1.5 px-1">
                        <Input type="date" value={item.expiryDate} onChange={(e) => updateItem(item.key, "expiryDate", e.target.value)} className="h-8 text-xs" />
                      </td>
                      {/* HSN */}
                      <td className="py-1.5 px-1">
                        <Input value={item.hsnCode} onChange={(e) => updateItem(item.key, "hsnCode", e.target.value)} className="h-8 text-xs" />
                      </td>
                      {/* Qty */}
                      <td className="py-1.5 px-1">
                        <Input type="number" min="1" value={item.quantity || ""} onChange={(e) => updateItem(item.key, "quantity", parseInt(e.target.value) || 0)} className="h-8 text-xs text-right" />
                      </td>
                      {/* Free */}
                      <td className="py-1.5 px-1">
                        <Input type="number" min="0" value={item.freeQuantity || ""} onChange={(e) => updateItem(item.key, "freeQuantity", parseInt(e.target.value) || 0)} className="h-8 text-xs text-right" />
                      </td>
                      {/* Pack Size */}
                      <td className="py-1.5 px-1">
                        <Input type="number" min="1" value={item.packSize || ""} onChange={(e) => updateItem(item.key, "packSize", parseInt(e.target.value) || 0)} className="h-8 text-xs text-right" />
                      </td>
                      {/* Purchase Rate */}
                      <td className="py-1.5 px-1">
                        {item.isFreeGood ? (
                          <div className="h-8 flex items-center justify-end text-xs text-muted-foreground">₹0</div>
                        ) : (
                          <Input type="number" min="0" step="any" value={item.purchasePrice || ""} onChange={(e) => updateItem(item.key, "purchasePrice", e.target.value === "" ? 0 : Number(e.target.value))} className="h-8 text-xs text-right" />
                        )}
                      </td>
                      {/* Sell Price / MRP */}
                      <td className="py-1.5 px-1">
                        <Input type="number" min="0" step="any" value={item.sellingPrice || ""} onChange={(e) => updateItem(item.key, "sellingPrice", e.target.value === "" ? 0 : Number(e.target.value))} placeholder="MRP" className="h-8 text-xs text-right" />
                      </td>
                      {/* Discount % */}
                      <td className="py-1.5 px-1">
                        {item.isFreeGood ? (
                          <div className="h-8 flex items-center justify-end text-xs text-muted-foreground">—</div>
                        ) : (
                          <Input type="number" min="0" step="any" value={item.discountPercent || ""} onChange={(e) => updateItem(item.key, "discountPercent", e.target.value === "" ? 0 : Number(e.target.value))} className="h-8 text-xs text-right" />
                        )}
                      </td>
                      {/* Tax % */}
                      <td className="py-1.5 px-1">
                        {item.isFreeGood ? (
                          <div className="h-8 flex items-center justify-end text-xs text-muted-foreground">—</div>
                        ) : (
                          <Input type="number" min="0" step="any" value={item.taxPercent || ""} onChange={(e) => updateItem(item.key, "taxPercent", e.target.value === "" ? 0 : Number(e.target.value))} className="h-8 text-xs text-right" />
                        )}
                      </td>
                      {/* Amount (Total) */}
                      <td className="py-1.5 px-1 text-right font-semibold text-xs whitespace-nowrap pt-3">
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
                          <Button type="button" variant="ghost" size="icon" className="h-7 w-7 text-red-400 hover:text-red-600 mt-0.5" onClick={() => removeRow(item.key)}>
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

          <Button type="button" variant="ghost" size="sm" className="mt-2 text-[#0066CC] hover:text-[#0052a3]" onClick={addRow}>
            <Plus className="h-3.5 w-3.5 mr-1" /> Add another row
          </Button>
        </CardContent>
      </Card>

      {/* ── SUMMARY GRID ────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="border-0 shadow-none bg-transparent">
          <CardHeader className="px-0 pt-0">
            <CardTitle className="text-base flex items-center gap-2">
              <IndianRupee className="h-4 w-4 text-gray-500" />
              Payment
            </CardTitle>
          </CardHeader>
          <CardContent className="px-0 space-y-4">
            <div className="space-y-1.5 max-w-sm">
              <Label className="text-xs font-medium">Amount Paid Now (₹)</Label>
              <Input type="number" min="0" step="0.01" value={amountPaid} onChange={(e) => setAmountPaid(e.target.value)} placeholder="Enter amount paid to supplier" className="bg-white" />
            </div>
            {/* Note: In full implementation, selecting a financial account would happen here, 
                but keeping it simple matching the screenshot which only shows "Amount Paid Now". */}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3 bg-gray-50/50 rounded-t-xl">
            <CardTitle className="text-base">Bill Summary</CardTitle>
          </CardHeader>
          <CardContent className="pt-4">
            <div className="space-y-2.5 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Amount (Before Disc & Tax)</span>
                <span>{formatINR(items.reduce((sum, item) => sum + lineAmount(item), 0))}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Discount</span>
                <span className="text-emerald-600">-{formatINR(items.reduce((sum, item) => sum + lineDiscount(item), 0))}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Tot (Taxable)</span>
                <span>{formatINR(taxableTotal)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">GST</span>
                <span>{formatINR(taxTotal)}</span>
              </div>
              <Separator className="my-2" />
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Round Off (±)</span>
                <Input
                  type="number"
                  step="any"
                  value={roundOff}
                  onChange={(e) => setRoundOff(e.target.value)}
                  placeholder="0"
                  className="h-7 w-28 text-xs text-right"
                />
              </div>
              <Separator className="my-2" />
              <div className="flex justify-between text-base font-bold">
                <span>Grand Total</span>
                <span className="text-[#0066CC]">{formatINR(grandTotal)}</span>
              </div>
              <Separator className="my-2" />
              <div className="flex justify-between">
                <span className="text-muted-foreground">Amount Paid</span>
                <span className="text-emerald-600 font-medium">{formatINR(paidAmount)}</span>
              </div>
              <div className="flex justify-between font-semibold">
                <span className="text-muted-foreground">Balance Due</span>
                <span className={balanceDue > 0 ? "text-red-600" : "text-emerald-600"}>{formatINR(balanceDue)}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ── SAVE BUTTON ────────────────────── */}
      <div className="flex justify-end gap-3">
        <Button variant="outline" asChild>
          <Link href={`/dashboard/pharmacy/purchase-invoices/${invoice.id}`}>Cancel</Link>
        </Button>
        <Button onClick={handleSubmit} disabled={isPending} className="bg-[#0066CC] hover:bg-[#0052a3] px-8 shadow-md hover:shadow-lg transition-all">
          {isPending ? (
            <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Saving Changes...</>
          ) : (
            <><CheckCircle2 className="h-4 w-4 mr-2" /> Update Invoice</>
          )}
        </Button>
      </div>
    </div>
  )
}
