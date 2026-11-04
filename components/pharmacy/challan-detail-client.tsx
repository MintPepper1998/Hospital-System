"use client"

import { useState, useTransition, useMemo } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { format } from "date-fns"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  ArrowLeft,
  ArrowRight,
  Loader2,
  CheckCircle2,
  Clock,
  ClipboardList,
  Receipt,
  IndianRupee,
  Pencil,
  Gift,
} from "lucide-react"
import { toast } from "sonner"
import { convertChallanToInvoice, type ChallanDetailData } from "@/app/actions/challan"

// ============================================
// TYPES
// ============================================

interface Account {
  id: string
  name: string
  type: string
}

interface ConversionItem {
  challanItemId: string
  itemName: string
  quantity: number
  packSize: number
  sellPrice: number
  rate: number        // Purchase price per strip (to be filled)
  taxPercent: number
  discountPercent: number
  isFreeGood: boolean
}

interface Props {
  challan: ChallanDetailData
  accounts: Account[]
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

function formatINR(n: number): string {
  return `₹${n.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

function round2(n: number): number {
  return Number(n.toFixed(2))
}

// ============================================
// COMPONENT
// ============================================

export function ChallanDetailClient({ challan, accounts }: Props) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [showConvert, setShowConvert] = useState(false)

  // Conversion form state
  const [invoiceNumber, setInvoiceNumber] = useState("")
  const [invoiceDate, setInvoiceDate] = useState(new Date().toISOString().split("T")[0])
  const [amountPaid, setAmountPaid] = useState(0)
  const [accountId, setAccountId] = useState("")
  const [paymentMethod, setPaymentMethod] = useState("CASH")

  const [convItems, setConvItems] = useState<ConversionItem[]>(
    challan.items.map((item) => ({
      challanItemId: item.id,
      itemName: item.itemName,
      quantity: item.quantity,
      packSize: item.packSize,
      sellPrice: item.sellPrice,
      rate: item.isFreeGood ? 0 : 0,
      taxPercent: 0,
      discountPercent: 0,
      isFreeGood: item.isFreeGood,
    }))
  )

  // ── Calculate totals ──
  const totals = useMemo(() => {
    let subTotal = 0
    let taxTotal = 0
    for (const item of convItems) {
      if (item.isFreeGood) continue // Free goods excluded from totals
      const base = round2(item.quantity * item.rate)
      const disc = round2(base * (item.discountPercent / 100))
      const taxable = round2(base - disc)
      const tax = round2(taxable * (item.taxPercent / 100))
      subTotal += taxable
      taxTotal += tax
    }
    subTotal = round2(subTotal)
    taxTotal = round2(taxTotal)
    const grandTotal = round2(subTotal + taxTotal)
    const balance = round2(grandTotal - amountPaid)
    return { subTotal, taxTotal, grandTotal, balance }
  }, [convItems, amountPaid])

  // ── Update conversion item ──
  function updateConvItem(idx: number, field: keyof ConversionItem, value: number) {
    setConvItems((prev) =>
      prev.map((item, i) => (i === idx ? { ...item, [field]: value } : item))
    )
  }

  // ── Submit conversion ──
  function handleConvert() {
    if (!invoiceNumber.trim()) return toast.error("Enter invoice number")
    if (amountPaid > 0 && !accountId) return toast.error("Select a payment account")

    const hasZeroRate = convItems.some((i) => !i.isFreeGood && i.rate <= 0)
    if (hasZeroRate) return toast.error("All paid items must have a purchase price")

    startTransition(async () => {
      const result = await convertChallanToInvoice({
        challanId: challan.id,
        invoiceNumber: invoiceNumber.trim(),
        date: invoiceDate,
        items: convItems.map((item) => ({
          challanItemId: item.challanItemId,
          rate: item.rate,
          taxPercent: item.taxPercent || undefined,
          discountPercent: item.discountPercent || undefined,
        })),
        amountPaid,
        accountId: accountId || undefined,
        paymentMethod,
      })

      if (result.success) {
        toast.success(result.message)
        router.push("/dashboard/pharmacy/challans")
      } else {
        toast.error(result.message)
      }
    })
  }

  const isConverted = challan.status === "CONVERTED"

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
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
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-extrabold text-slate-800">Challan #{challan.challanNumber}</h1>
                <Badge
                  variant="outline"
                  className={
                    isConverted
                      ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                      : "bg-orange-50 text-orange-700 border-orange-200"
                  }
                >
                  {isConverted ? (
                    <><CheckCircle2 className="h-3 w-3 mr-1" /> Converted</>
                  ) : (
                    <><Clock className="h-3 w-3 mr-1" /> Pending</>
                  )}
                </Badge>
              </div>
              <p className="text-xs text-slate-400">
                {challan.supplierName} &bull; {format(new Date(challan.date), "dd MMM yyyy")}
              </p>
            </div>
          </div>
        </div>

        {!isConverted && !showConvert && (
          <div className="flex items-center gap-2">
            <Link href={`/dashboard/pharmacy/challans/${challan.id}/edit`}>
              <Button variant="outline" className={`${neo.shadowSm} border-none rounded-xl px-4`}>
                <Pencil className="h-4 w-4 mr-2" />
                Edit
              </Button>
            </Link>
            <Button
              onClick={() => setShowConvert(true)}
              className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl shadow-md px-5"
            >
              <ArrowRight className="h-4 w-4 mr-2" />
              Convert to Purchase Invoice
            </Button>
          </div>
        )}
      </div>

      {/* Challan Items (Read-only) */}
      <div className={`${neo.card} ${neo.shadow} overflow-hidden`}>
        <div className="p-4 border-b border-slate-200/50 flex items-center gap-2">
          <h2 className="font-bold text-slate-700">Challan Items</h2>
          {challan.items.some(i => i.isFreeGood) && (
            <span className="inline-flex items-center gap-1 text-[10px] bg-violet-50 text-violet-700 border border-violet-200 rounded-full px-2 py-0.5">
              <Gift className="h-3 w-3" /> {challan.items.filter(i => i.isFreeGood).length} free good{challan.items.filter(i => i.isFreeGood).length > 1 ? 's' : ''}
            </span>
          )}
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-100/50">
              <tr>
                <th className="text-left px-4 py-2.5 font-semibold text-slate-500 text-xs">#</th>
                <th className="text-left px-4 py-2.5 font-semibold text-slate-500 text-xs">Medicine</th>
                <th className="text-left px-4 py-2.5 font-semibold text-slate-500 text-xs">Batch</th>
                <th className="text-left px-4 py-2.5 font-semibold text-slate-500 text-xs">Expiry</th>
                <th className="text-center px-4 py-2.5 font-semibold text-slate-500 text-xs">Qty</th>
                <th className="text-center px-4 py-2.5 font-semibold text-slate-500 text-xs">
                  <span className="flex items-center justify-center gap-1">
                    <Gift className="h-3 w-3 text-emerald-600" /> Free
                  </span>
                </th>
                <th className="text-center px-4 py-2.5 font-semibold text-slate-500 text-xs">Pack</th>
                <th className="text-right px-4 py-2.5 font-semibold text-slate-500 text-xs">MRP/Strip</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {challan.items.map((item, i) => (
                <tr key={item.id} className={`hover:bg-slate-50/50 ${item.isFreeGood ? 'bg-violet-50/50' : ''}`}>
                  <td className="px-4 py-3 text-slate-400">{i + 1}</td>
                  <td className="px-4 py-3 font-medium text-slate-800">
                    {item.itemName}
                    {item.isFreeGood && (
                      <span className="ml-2 inline-flex items-center gap-1 text-[9px] font-bold bg-violet-100 text-violet-700 rounded px-1.5 py-0.5 tracking-wide">FREE GOOD</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-slate-600">{item.batchNumber || "—"}</td>
                  <td className="px-4 py-3 text-slate-600">
                    {item.expiryDate ? format(new Date(item.expiryDate), "MMM yyyy") : "—"}
                  </td>
                  <td className="px-4 py-3 text-center font-medium">{item.quantity}</td>
                  <td className="px-4 py-3 text-center text-emerald-600 font-medium">
                    {item.isFreeGood ? "—" : (item.freeQuantity > 0 ? item.freeQuantity : "—")}
                  </td>
                  <td className="px-4 py-3 text-center text-slate-500">{item.packSize}</td>
                  <td className="px-4 py-3 text-right font-medium">{formatINR(item.sellPrice)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {challan.notes && (
          <div className="p-4 border-t border-slate-200/50">
            <p className="text-xs text-slate-500"><span className="font-semibold">Notes:</span> {challan.notes}</p>
          </div>
        )}
      </div>

      {/* ═════════════════════════════════════════ */}
      {/* CONVERSION FORM (only when converting)   */}
      {/* ═════════════════════════════════════════ */}
      {showConvert && !isConverted && (
        <div className="space-y-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-100 flex items-center justify-center">
              <Receipt className="h-5 w-5 text-indigo-600" />
            </div>
            <div>
              <h2 className="text-lg font-extrabold text-slate-800">Convert to Purchase Invoice</h2>
              <p className="text-xs text-slate-400">Enter purchase prices, tax, and payment details</p>
            </div>
          </div>

          {/* Invoice Header */}
          <div className={`${neo.card} ${neo.shadow} p-6`}>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label className="text-xs font-semibold text-slate-500 mb-1.5 block">Invoice Number *</Label>
                <Input
                  value={invoiceNumber}
                  onChange={(e) => setInvoiceNumber(e.target.value)}
                  placeholder="Purchase invoice #"
                  className={`${neo.inset} border-none h-10`}
                />
              </div>
              <div>
                <Label className="text-xs font-semibold text-slate-500 mb-1.5 block">Invoice Date</Label>
                <Input
                  type="date"
                  value={invoiceDate}
                  onChange={(e) => setInvoiceDate(e.target.value)}
                  className={`${neo.inset} border-none h-10`}
                />
              </div>
              <div>
                <Label className="text-xs font-semibold text-slate-500 mb-1.5 block">Supplier</Label>
                <Input value={challan.supplierName} disabled className={`${neo.inset} border-none h-10 opacity-60`} />
              </div>
            </div>
          </div>

          {/* Pricing Table */}
          <div className={`${neo.card} ${neo.shadow} overflow-hidden`}>
            <div className="p-4 border-b border-slate-200/50">
              <h3 className="font-bold text-slate-700">Enter Purchase Prices</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm table-fixed">
                <thead className="bg-slate-100/50">
                  <tr>
                    <th className="text-left px-3 py-2.5 font-semibold text-slate-500 text-xs w-[22%]">Medicine</th>
                    <th className="text-center px-3 py-2.5 font-semibold text-slate-500 text-xs w-[7%]">Qty</th>
                    <th className="text-right px-3 py-2.5 font-semibold text-slate-500 text-xs w-[12%]">MRP/Strip</th>
                    <th className="text-center px-3 py-2.5 font-semibold text-slate-500 text-xs w-[18%]">Purchase Price/Strip *</th>
                    <th className="text-center px-3 py-2.5 font-semibold text-slate-500 text-xs w-[12%]">Tax %</th>
                    <th className="text-center px-3 py-2.5 font-semibold text-slate-500 text-xs w-[12%]">Disc %</th>
                    <th className="text-right px-3 py-2.5 font-semibold text-slate-500 text-xs w-[17%]">Line Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {convItems.map((item, idx) => {
                    const base = round2(item.quantity * item.rate)
                    const disc = round2(base * (item.discountPercent / 100))
                    const taxable = round2(base - disc)
                    const tax = round2(taxable * (item.taxPercent / 100))
                    const total = round2(taxable + tax)

                    return (
                      <tr key={item.challanItemId} className={`hover:bg-slate-50/50 ${item.isFreeGood ? 'bg-violet-50/50' : ''}`}>
                        <td className="px-3 py-2 font-medium text-slate-800 truncate">
                          {item.itemName}
                          {item.isFreeGood && (
                            <span className="ml-1.5 text-[9px] font-bold text-violet-600">FREE</span>
                          )}
                        </td>
                        <td className="px-3 py-2 text-center">{item.quantity}</td>
                        <td className="px-3 py-2 text-right text-slate-500">{formatINR(item.sellPrice)}</td>
                        <td className="px-3 py-2">
                          {item.isFreeGood ? (
                            <div className="h-8 flex items-center justify-end text-xs text-violet-500 font-medium">₹0 (Free)</div>
                          ) : (
                            <Input
                              type="number"
                              min={0}
                              step={0.01}
                              value={item.rate || ""}
                              onChange={(e) => updateConvItem(idx, "rate", parseFloat(e.target.value) || 0)}
                              placeholder="₹ Price"
                              className="h-8 text-xs border-slate-200 text-right w-full"
                            />
                          )}
                        </td>
                        <td className="px-3 py-2">
                          {item.isFreeGood ? (
                            <div className="h-8 flex items-center justify-center text-xs text-muted-foreground">—</div>
                          ) : (
                            <Input
                              type="number"
                              min={0}
                              step={0.5}
                              value={item.taxPercent || ""}
                              onChange={(e) => updateConvItem(idx, "taxPercent", parseFloat(e.target.value) || 0)}
                              placeholder="%"
                              className="h-8 text-xs border-slate-200 text-center w-full"
                            />
                          )}
                        </td>
                        <td className="px-3 py-2">
                          {item.isFreeGood ? (
                            <div className="h-8 flex items-center justify-center text-xs text-muted-foreground">—</div>
                          ) : (
                            <Input
                              type="number"
                              min={0}
                              step={0.5}
                              value={item.discountPercent || ""}
                              onChange={(e) => updateConvItem(idx, "discountPercent", parseFloat(e.target.value) || 0)}
                              placeholder="%"
                              className="h-8 text-xs border-slate-200 text-center w-full"
                            />
                          )}
                        </td>
                        <td className="px-3 py-2 text-right font-semibold text-slate-800">
                          {item.isFreeGood ? (
                            <span className="text-violet-600">FREE</span>
                          ) : (
                            item.rate > 0 ? formatINR(total) : "—"
                          )}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>

            {/* Totals */}
            <div className="p-4 border-t border-slate-200/50 flex justify-end">
              <div className="w-72 space-y-2 text-sm">
                <div className="flex justify-between text-slate-500">
                  <span>Sub Total</span>
                  <span className="font-medium">{formatINR(totals.subTotal)}</span>
                </div>
                <div className="flex justify-between text-slate-500">
                  <span>Tax Total</span>
                  <span className="font-medium">{formatINR(totals.taxTotal)}</span>
                </div>
                <div className="flex justify-between text-slate-800 font-bold text-base border-t pt-2">
                  <span>Grand Total</span>
                  <span>{formatINR(totals.grandTotal)}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Payment */}
          <div className={`${neo.card} ${neo.shadow} p-6`}>
            <h3 className="font-bold text-slate-700 mb-4 flex items-center gap-2">
              <IndianRupee className="h-4 w-4" />
              Payment (Optional)
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label className="text-xs font-semibold text-slate-500 mb-1.5 block">Amount Paid</Label>
                <Input
                  type="number"
                  min={0}
                  step={0.01}
                  value={amountPaid || ""}
                  onChange={(e) => setAmountPaid(parseFloat(e.target.value) || 0)}
                  placeholder="₹ 0.00"
                  className={`${neo.inset} border-none h-10`}
                />
              </div>
              <div>
                <Label className="text-xs font-semibold text-slate-500 mb-1.5 block">Payment Account</Label>
                <Select value={accountId} onValueChange={setAccountId}>
                  <SelectTrigger className={`${neo.inset} border-none h-10`}>
                    <SelectValue placeholder="Select account" />
                  </SelectTrigger>
                  <SelectContent>
                    {accounts.map((a) => (
                      <SelectItem key={a.id} value={a.id}>
                        {a.name} ({a.type})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs font-semibold text-slate-500 mb-1.5 block">Payment Method</Label>
                <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                  <SelectTrigger className={`${neo.inset} border-none h-10`}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="CASH">Cash</SelectItem>
                    <SelectItem value="BANK_TRANSFER">Bank Transfer</SelectItem>
                    <SelectItem value="UPI">UPI</SelectItem>
                    <SelectItem value="CHEQUE">Cheque</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            {totals.grandTotal > 0 && (
              <div className="mt-4 p-3 rounded-xl bg-slate-100/70 flex justify-between items-center">
                <span className="text-sm text-slate-500">Balance Due</span>
                <span className={`text-lg font-bold ${totals.balance > 0 ? "text-red-600" : "text-emerald-600"}`}>
                  {formatINR(totals.balance)}
                </span>
              </div>
            )}
          </div>

          {/* Submit */}
          <div className="flex items-center justify-end gap-3">
            <Button
              variant="outline"
              onClick={() => setShowConvert(false)}
              className={`${neo.shadowSm} border-none rounded-xl`}
            >
              Cancel
            </Button>
            <Button
              onClick={handleConvert}
              disabled={isPending}
              className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl shadow-md px-6"
            >
              {isPending ? (
                <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Converting...</>
              ) : (
                <><CheckCircle2 className="h-4 w-4 mr-2" /> Convert to Invoice</>
              )}
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
