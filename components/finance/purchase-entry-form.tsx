"use client"

import { useState, useTransition, useCallback, useEffect, useRef } from "react"
import Link from "next/link"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
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
import {
  ArrowLeft,
  Plus,
  Trash2,
  Loader2,
  CheckCircle2,
  ShoppingCart,
  Search,
  Package,
  IndianRupee,
  Pill,
  Boxes,
} from "lucide-react"
import { toast } from "sonner"
import { createPurchaseInvoice } from "@/app/actions/purchase"
import { searchMedicines } from "@/app/actions/search"
import { searchGeneralItems } from "@/app/actions/general-inventory"
import { useRouter } from "next/navigation"
import type { FinancialAccountData } from "@/app/actions/finance"

// ============================================
// TYPES
// ============================================

type ItemCategory = "PHARMACY" | "GENERAL"

interface SupplierOption {
  id: string
  name: string
}

interface LineItem {
  key: string
  category: ItemCategory
  itemName: string
  medicineId: string | null
  generalItemId: string | null
  batchNumber: string
  expiryDate: string
  hsnCode: string
  quantity: number
  packSize: number         // units per strip/pack (e.g., 10 tablets per strip)
  purchasePrice: number  // cost price per strip
  sellPrice: number      // MRP / selling price per strip
  taxPercent: number
}

interface SearchResult {
  id: string
  name: string
  label: string
  unitPrice?: number
}

// ============================================
// HELPERS
// ============================================

function generateKey(): string {
  return Math.random().toString(36).slice(2, 10)
}

function emptyLine(): LineItem {
  return {
    key: generateKey(),
    category: "PHARMACY",
    itemName: "",
    medicineId: null,
    generalItemId: null,
    batchNumber: "",
    expiryDate: "",
    hsnCode: "",
    quantity: 1,
    packSize: 1,
    purchasePrice: 0,
    sellPrice: 0,
    taxPercent: 0,
  }
}

// Round to 2 decimal places to avoid floating-point drift
function round2(n: number): number {
  return Number(n.toFixed(2))
}

function lineTotal(item: LineItem): number {
  const base = round2(item.quantity * item.purchasePrice)
  const tax = round2(base * (item.taxPercent / 100))
  return round2(base + tax)
}

function lineMargin(item: LineItem): number {
  if (item.purchasePrice <= 0 || item.sellPrice <= 0) return 0
  return round2(((item.sellPrice - item.purchasePrice) / item.purchasePrice) * 100)
}

function formatINR(n: number): string {
  return `₹${n.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

// ============================================
// MAIN FORM
// ============================================

interface Props {
  suppliers: SupplierOption[]
  accounts: FinancialAccountData[]
}

export function PurchaseEntryForm({ suppliers, accounts }: Props) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  const [supplierId, setSupplierId] = useState("")
  const [invoiceNumber, setInvoiceNumber] = useState("")
  const [invoiceDate, setInvoiceDate] = useState(new Date().toISOString().split("T")[0])
  const [items, setItems] = useState<LineItem[]>([emptyLine()])
  const [amountPaid, setAmountPaid] = useState("")
  const [accountId, setAccountId] = useState("")
  const [paymentMethod, setPaymentMethod] = useState("CASH")

  const [searchResults, setSearchResults] = useState<Record<string, SearchResult[]>>({})
  const [searching, setSearching] = useState<Record<string, boolean>>({})
  const searchDebounceRef = useRef<Record<string, ReturnType<typeof setTimeout>>>({})

  // ── Item mutations ──────────────────────────
  const updateItem = (key: string, field: keyof LineItem, value: any) => {
    setItems((prev) => prev.map((item) => item.key === key ? { ...item, [field]: value } : item))
  }

  const updateItemMulti = (key: string, patch: Partial<LineItem>) => {
    setItems((prev) => prev.map((item) => item.key === key ? { ...item, ...patch } : item))
  }

  const addRow = () => setItems((prev) => [...prev, emptyLine()])

  const removeRow = (key: string) => {
    if (items.length <= 1) return
    setItems((prev) => prev.filter((item) => item.key !== key))
  }

  const switchCategory = (key: string, cat: ItemCategory) => {
    updateItemMulti(key, { category: cat, itemName: "", medicineId: null, generalItemId: null, purchasePrice: 0, sellPrice: 0 })
    setSearchResults((prev) => ({ ...prev, [key]: [] }))
  }

  // ── Unified search ──────────────────────────
  const handleItemSearch = useCallback(async (key: string, query: string, category: ItemCategory) => {
    setItems((prev) =>
      prev.map((item) =>
        item.key === key
          ? { ...item, itemName: query, medicineId: null, generalItemId: null }
          : item
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
    searchDebounceRef.current[key] = setTimeout(async () => {
      setSearching((prev) => ({ ...prev, [key]: true }))
      try {
        const results = category === "PHARMACY"
          ? await searchMedicines(query)
          : await searchGeneralItems(query)
        setSearchResults((prev) => ({ ...prev, [key]: results }))
      } catch {
        setSearchResults((prev) => ({ ...prev, [key]: [] }))
      } finally {
        setSearching((prev) => ({ ...prev, [key]: false }))
      }
    }, 300)
  }, [])

  useEffect(() => {
    return () => {
      for (const key of Object.keys(searchDebounceRef.current)) {
        clearTimeout(searchDebounceRef.current[key])
      }
    }
  }, [])

  const selectSearchResult = (key: string, result: SearchResult, category: ItemCategory) => {
    const patch: Partial<LineItem> = { itemName: result.name }
    if (category === "PHARMACY") {
      patch.medicineId = result.id
      patch.generalItemId = null
      // Auto-fill sell price from medicine catalog MRP
      if (result.unitPrice && result.unitPrice > 0) {
        patch.sellPrice = result.unitPrice
      }
    } else {
      patch.generalItemId = result.id
      patch.medicineId = null
    }
    updateItemMulti(key, patch)
    setSearchResults((prev) => ({ ...prev, [key]: [] }))
  }

  // ── Totals ──────────────────────────────────
  const subTotal = items.reduce((sum, item) => sum + item.quantity * item.purchasePrice, 0)
  const taxTotal = items.reduce((sum, item) => sum + item.quantity * item.purchasePrice * (item.taxPercent / 100), 0)
  const grandTotal = subTotal + taxTotal
  const paidAmount = parseFloat(amountPaid) || 0
  const balanceDue = grandTotal - paidAmount

  // Count pharmacy items for the summary badge
  const pharmaItemCount = items.filter(i => i.category === "PHARMACY" && i.medicineId).length

  // ── Submit ──────────────────────────────────
  const handleSubmit = () => {
    if (!supplierId) return toast.error("Please select a supplier")
    if (!invoiceNumber.trim()) return toast.error("Please enter the invoice number")
    if (!invoiceDate) return toast.error("Please select invoice date")

    const validItems = items.filter((i) => i.itemName.trim() && i.quantity > 0 && i.purchasePrice > 0)
    if (validItems.length === 0) return toast.error("Add at least one item with quantity and purchase price")

    // Warn if pharmacy items are missing sell price
    const missingMRP = validItems.filter(i => i.category === "PHARMACY" && i.medicineId && i.sellPrice <= 0)
    if (missingMRP.length > 0) {
      const proceed = confirm(`${missingMRP.length} pharmacy item(s) have no Sell Price (MRP). A default 20% markup will be applied. Continue?`)
      if (!proceed) return
    }

    if (paidAmount > 0 && !accountId) return toast.error("Select a payment account")

    startTransition(async () => {
      const result = await createPurchaseInvoice({
        invoiceNumber: invoiceNumber.trim(),
        date: new Date(invoiceDate).toISOString(),
        supplierId,
        items: validItems.map((i) => ({
          itemName: i.itemName,
          medicineId: i.medicineId || undefined,
          generalItemId: i.generalItemId || undefined,
          batchNumber: i.batchNumber || undefined,
          expiryDate: i.expiryDate ? new Date(i.expiryDate).toISOString() : undefined,
          quantity: i.quantity,
          packSize: i.packSize || 1,
          hsnCode: i.hsnCode || undefined,
          rate: i.purchasePrice,
          sellPrice: i.category === "PHARMACY" && i.sellPrice > 0 ? i.sellPrice : undefined,
          taxPercent: i.taxPercent,
          totalAmount: lineTotal(i),
        })),
        amountPaid: paidAmount,
        accountId: paidAmount > 0 ? accountId : undefined,
        paymentMethod: paidAmount > 0 ? paymentMethod : undefined,
      })

      if (result.success) {
        toast.success(result.message)
        if (pharmaItemCount > 0) {
          toast.success(`✅ ${pharmaItemCount} medicine(s) synced to Pharmacy stock`, { duration: 5000 })
        }
        router.push("/dashboard/finance/purchases")
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
          <Link href="/dashboard/finance/purchases"><ArrowLeft className="h-4 w-4" /></Link>
        </Button>
        <div>
          <h2 className="text-xl font-bold tracking-tight text-gray-900 flex items-center gap-2">
            <ShoppingCart className="h-5 w-5 text-teal-600" />
            New Purchase Bill
          </h2>
          <p className="text-sm text-muted-foreground">Record a supplier purchase with automatic ledger &amp; inventory updates</p>
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
            <Package className="h-4 w-4 text-gray-500" />
            Items ({items.length})
            {pharmaItemCount > 0 && (
              <span className="ml-2 inline-flex items-center gap-1 text-[10px] bg-teal-50 text-teal-700 border border-teal-200 rounded-full px-2 py-0.5">
                <Pill className="h-3 w-3" /> {pharmaItemCount} medicine{pharmaItemCount > 1 ? "s" : ""} → Pharmacy Stock
              </span>
            )}
          </CardTitle>
          <Button type="button" size="sm" variant="outline" onClick={addRow}>
            <Plus className="h-3.5 w-3.5 mr-1" /> Add Row
          </Button>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-xs text-muted-foreground">
                  <th className="text-left py-2 px-1 w-[80px]">Type</th>
                  <th className="text-left py-2 px-1 w-[200px]">Item Name</th>
                  <th className="text-left py-2 px-1 w-[90px]">Batch No</th>
                  <th className="text-left py-2 px-1 w-[110px]">Expiry</th>
                  <th className="text-left py-2 px-1 w-[80px]">HSN Code</th>
                  <th className="text-right py-2 px-1 w-[55px]">Qty</th>
                  <th className="text-right py-2 px-1 w-[50px]">Pack</th>
                  <th className="text-right py-2 px-1 w-[90px]">Purchase ₹</th>
                  <th className="text-right py-2 px-1 w-[90px]">Sell/MRP ₹</th>
                  <th className="text-right py-2 px-1 w-[55px]">Tax %</th>
                  <th className="text-right py-2 px-1 w-[90px]">Total</th>
                  <th className="py-2 px-1 w-[36px]"></th>
                </tr>
              </thead>
              <tbody>
                {items.map((item) => {
                  const margin = lineMargin(item)
                  return (
                    <tr key={item.key} className="border-b border-dashed align-top">
                      {/* Category Toggle */}
                      <td className="py-1.5 px-1">
                        <Select
                          value={item.category}
                          onValueChange={(v: ItemCategory) => switchCategory(item.key, v)}
                        >
                          <SelectTrigger className="h-8 text-[10px] w-[75px] px-1.5">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="PHARMACY">
                              <span className="flex items-center gap-1 text-xs"><Pill className="h-3 w-3" /> Pharma</span>
                            </SelectItem>
                            <SelectItem value="GENERAL">
                              <span className="flex items-center gap-1 text-xs"><Boxes className="h-3 w-3" /> General</span>
                            </SelectItem>
                          </SelectContent>
                        </Select>
                      </td>
                      {/* Item Name + Search */}
                      <td className="py-1.5 px-1 relative">
                        <div className="relative">
                          <Input
                            value={item.itemName}
                            onChange={(e) => handleItemSearch(item.key, e.target.value, item.category)}
                            placeholder={item.category === "PHARMACY" ? "Type medicine name..." : "Type item name..."}
                            className="h-8 text-xs pr-7"
                          />
                          {searching[item.key] && (
                            <Loader2 className="h-3 w-3 animate-spin absolute right-2 top-2.5 text-muted-foreground" />
                          )}
                          {!searching[item.key] && item.itemName.length >= 2 && (
                            <Search className="h-3 w-3 absolute right-2 top-2.5 text-muted-foreground" />
                          )}
                        </div>
                        {(item.medicineId || item.generalItemId) && (
                          <span className={`text-[9px] mt-0.5 block ${item.medicineId ? "text-teal-600" : "text-indigo-600"}`}>
                            {item.medicineId ? "✓ Linked to Pharmacy inventory" : "✓ Linked to General inventory"}
                          </span>
                        )}
                        {(searchResults[item.key]?.length ?? 0) > 0 && (
                          <div className="absolute z-20 top-full left-0 right-0 mt-0.5 bg-white border rounded-lg shadow-lg max-h-36 overflow-y-auto">
                            {searchResults[item.key].map((r) => (
                              <button
                                key={r.id}
                                type="button"
                                className="w-full text-left px-3 py-1.5 hover:bg-gray-50 text-xs border-b last:border-0"
                                onClick={() => selectSearchResult(item.key, r, item.category)}
                              >
                                {r.label}
                                {r.unitPrice ? <span className="ml-1 text-muted-foreground">(MRP: ₹{r.unitPrice})</span> : null}
                              </button>
                            ))}
                          </div>
                        )}
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
                        <Input value={item.hsnCode} onChange={(e) => updateItem(item.key, "hsnCode", e.target.value)} placeholder="e.g., 3004" className="h-8 text-xs" />
                      </td>
                      {/* Qty */}
                      <td className="py-1.5 px-1">
                        <Input type="number" min="1" value={item.quantity || ""} onChange={(e) => updateItem(item.key, "quantity", parseInt(e.target.value) || 0)} placeholder="1" className="h-8 text-xs text-right" />
                      </td>
                      {/* Pack Size */}
                      <td className="py-1.5 px-1">
                        <Input type="number" min="1" value={item.packSize || ""} onChange={(e) => updateItem(item.key, "packSize", parseInt(e.target.value) || 1)} placeholder="1" className="h-8 text-xs text-right" />
                      </td>
                      {/* Purchase Price */}
                      <td className="py-1.5 px-1">
                        <Input type="number" min="0" step="0.01" value={item.purchasePrice || ""} onChange={(e) => updateItem(item.key, "purchasePrice", parseFloat(e.target.value) || 0)} placeholder="0.00" className="h-8 text-xs text-right" />
                      </td>
                      {/* Sell Price / MRP */}
                      <td className="py-1.5 px-1">
                        <Input
                          type="number" min="0" step="0.01"
                          value={item.sellPrice || ""}
                          onChange={(e) => updateItem(item.key, "sellPrice", parseFloat(e.target.value) || 0)}
                          placeholder={item.category === "PHARMACY" ? "MRP" : "—"}
                          className={`h-8 text-xs text-right ${item.category === "PHARMACY" ? "" : "bg-gray-50 text-gray-400"}`}
                          disabled={item.category !== "PHARMACY"}
                        />
                        {item.category === "PHARMACY" && item.purchasePrice > 0 && item.sellPrice > 0 && (
                          <span className={`text-[9px] mt-0.5 block text-right ${margin >= 0 ? "text-green-600" : "text-red-500"}`}>
                            {margin >= 0 ? "↑" : "↓"} {Math.abs(margin).toFixed(1)}% margin
                          </span>
                        )}
                      </td>
                      {/* Tax */}
                      <td className="py-1.5 px-1">
                        <Input type="number" min="0" step="0.01" value={item.taxPercent || ""} onChange={(e) => updateItem(item.key, "taxPercent", parseFloat(e.target.value) || 0)} placeholder="0" className="h-8 text-xs text-right" />
                      </td>
                      {/* Total */}
                      <td className="py-1.5 px-1 text-right font-semibold text-xs whitespace-nowrap">
                        {formatINR(lineTotal(item))}
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

          <Button type="button" variant="ghost" size="sm" className="mt-2 text-teal-600 hover:text-teal-700" onClick={addRow}>
            <Plus className="h-3.5 w-3.5 mr-1" /> Add another row
          </Button>

          {/* Pharmacy sync info */}
          {pharmaItemCount > 0 && (
            <div className="mt-3 p-3 bg-teal-50 border border-teal-200 rounded-lg flex items-start gap-2">
              <Pill className="h-4 w-4 text-teal-600 mt-0.5 shrink-0" />
              <div className="text-xs text-teal-800">
                <strong>{pharmaItemCount} medicine item{pharmaItemCount > 1 ? "s" : ""}</strong> will automatically update Pharmacy stock.
                The <strong>Purchase Price</strong> and <strong>Sell Price (MRP)</strong> will be synced to the inventory batch for accurate billing &amp; margin tracking.
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
              <Input type="number" min="0" step="0.01" value={amountPaid} onChange={(e) => setAmountPaid(e.target.value)} placeholder="Enter amount paid to supplier" />
            </div>
            {paidAmount > 0 && (
              <>
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium">Pay From Account <span className="text-red-500">*</span></Label>
                  <Select value={accountId} onValueChange={setAccountId}>
                    <SelectTrigger><SelectValue placeholder="Select account..." /></SelectTrigger>
                    <SelectContent>
                      {accounts.map((acc) => (
                        <SelectItem key={acc.id} value={acc.id}>
                          {acc.type === "CASH" ? "💵" : "🏦"} {acc.name} ({formatINR(acc.currentBalance)})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium">Payment Method</Label>
                  <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="CASH">Cash</SelectItem>
                      <SelectItem value="UPI">UPI</SelectItem>
                      <SelectItem value="CARD">Card</SelectItem>
                      <SelectItem value="BANK_TRANSFER">Bank Transfer</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Bill Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Sub Total</span>
                <span>{formatINR(subTotal)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Tax Total (GST)</span>
                <span>{formatINR(taxTotal)}</span>
              </div>
              <Separator />
              <div className="flex justify-between text-base font-bold">
                <span>Grand Total</span>
                <span className="text-teal-700">{formatINR(grandTotal)}</span>
              </div>
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
          <Link href="/dashboard/finance/purchases">Cancel</Link>
        </Button>
        <Button onClick={handleSubmit} disabled={isPending} className="bg-teal-600 hover:bg-teal-700 px-8">
          {isPending ? (
            <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Saving...</>
          ) : (
            <><CheckCircle2 className="h-4 w-4 mr-2" /> Save Purchase Bill</>
          )}
        </Button>
      </div>
    </div>
  )
}
