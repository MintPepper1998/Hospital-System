"use client"

import { useState, useEffect, useTransition } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
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
  Printer,
  MessageCircle,
  Save,
  Plus,
  Trash2,
  Loader2,
  IndianRupee,
  Percent,
  CheckCircle,
  Sparkles,
} from "lucide-react"
import { toast } from "sonner"
import { PAYMENT_METHOD_OPTIONS } from "@/lib/payment-routing"
import { PatientSearch, type PatientResult } from "./patient-search"
import type { BillLineItem, CreateBillInput } from "@/lib/actions/billing-counter"

// ============================================
// TYPES
// ============================================

type SelectedPatient = PatientResult

export interface BillingFormProps {
  billingType: string
  linkedEntityId?: string
  preselectedPatient?: SelectedPatient | null
  prefilledItems?: (BillLineItem & { isAutoDetected?: boolean })[]
  onSubmit: (
    data: CreateBillInput
  ) => Promise<{ success: boolean; billNumber?: string; data?: any; message?: string }>
  onWhatsApp?: (billingId: string) => Promise<any>
  showPatientSearch?: boolean
  title?: string
  pendingBillNumber?: string | null
}

// ============================================
// COMPONENT
// ============================================

export function BillingForm({
  billingType,
  linkedEntityId,
  preselectedPatient,
  prefilledItems,
  onSubmit,
  onWhatsApp,
  showPatientSearch = true,
  title,
  pendingBillNumber,
}: BillingFormProps) {
  const [isPending, startTransition] = useTransition()

  // Patient
  const [selectedPatient, setSelectedPatient] = useState<SelectedPatient | null>(
    preselectedPatient || null
  )

  // Line items
  const [items, setItems] = useState<(BillLineItem & { isAutoDetected?: boolean })[]>(
    prefilledItems || []
  )
  const [newItemDesc, setNewItemDesc] = useState("")
  const [newItemQty, setNewItemQty] = useState("1")
  const [newItemPrice, setNewItemPrice] = useState("")

  // Sync props when selected patient/visit changes from parent queue
  useEffect(() => {
    setSelectedPatient(preselectedPatient || null)
  }, [preselectedPatient])

  useEffect(() => {
    setItems(prefilledItems || [])
  }, [prefilledItems])

  useEffect(() => {
    setLastBill(null)
  }, [linkedEntityId, preselectedPatient?.id])

  // Discount
  const [discountMode, setDiscountMode] = useState<"flat" | "percent">("flat")
  const [discountValue, setDiscountValue] = useState("")

  // Payment
  const [paymentMethod, setPaymentMethod] = useState("CASH")
  const [transactionId, setTransactionId] = useState("")
  const [splitCash, setSplitCash] = useState("")
  const [splitUpi, setSplitUpi] = useState("")
  const [splitCard, setSplitCard] = useState("")

  // Notes
  const [notes, setNotes] = useState("")

  // Success state
  const [lastBill, setLastBill] = useState<{
    billNumber: string
    billingId: string
  } | null>(null)

  // Calculations
  const subtotal = items.reduce((sum, i) => sum + i.quantity * i.unitPrice, 0)
  const discountAmount =
    discountMode === "flat"
      ? parseFloat(discountValue) || 0
      : (subtotal * (parseFloat(discountValue) || 0)) / 100
  const netAmount = Math.max(0, subtotal - discountAmount)
  const isSplit = paymentMethod === "SPLIT"
  const splitTotal =
    (parseFloat(splitCash) || 0) +
    (parseFloat(splitUpi) || 0) +
    (parseFloat(splitCard) || 0)

  // Add line item
  const addItem = () => {
    if (!newItemDesc.trim() || !newItemPrice) {
      toast.error("Enter description and price")
      return
    }
    setItems([
      ...items,
      {
        description: newItemDesc.trim(),
        quantity: parseInt(newItemQty) || 1,
        unitPrice: parseFloat(newItemPrice) || 0,
        serviceCategory: "OTHER",
      },
    ])
    setNewItemDesc("")
    setNewItemQty("1")
    setNewItemPrice("")
  }

  const removeItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index))
  }

  // Build submit data
  const buildData = (): CreateBillInput | null => {
    if (!selectedPatient) {
      toast.error("Please select a patient")
      return null
    }
    if (items.length === 0) {
      toast.error("Add at least one line item")
      return null
    }
    if (isSplit && Math.abs(splitTotal - netAmount) > 1) {
      toast.error(
        `Split total (₹${splitTotal.toLocaleString("en-IN")}) doesn't match net amount (₹${netAmount.toLocaleString("en-IN")})`
      )
      return null
    }

    return {
      patientId: selectedPatient.id,
      billingType,
      linkedEntityId,
      items: items.map((i) => ({
        description: i.description,
        quantity: i.quantity,
        unitPrice: i.unitPrice,
        serviceCategory: i.serviceCategory,
      })),
      discountAmount: discountMode === "flat" ? parseFloat(discountValue) || 0 : 0,
      discountPercent: discountMode === "percent" ? parseFloat(discountValue) || 0 : 0,
      paymentMethod,
      splitPayments: isSplit
        ? {
            cash: parseFloat(splitCash) || 0,
            upi: parseFloat(splitUpi) || 0,
            card: parseFloat(splitCard) || 0,
          }
        : undefined,
      transactionId: transactionId || undefined,
      notes: notes || undefined,
    }
  }

  const handleSubmit = async (action: "save" | "print" | "whatsapp") => {
    const data = buildData()
    if (!data) return

    startTransition(async () => {
      const result = await onSubmit(data)
      if (result.success) {
        const billingId = result.data?.id
        const billNumber = result.billNumber || result.data?.billNumber

        setLastBill({ billNumber: billNumber || "", billingId: billingId || "" })
        toast.success(`Bill ${billNumber} created successfully!`)

        if (action === "print" && billingId) {
          window.open(`/dashboard/finance/billing/${billingId}`, "_blank")
        }

        if (action === "whatsapp" && billingId && onWhatsApp) {
          const waResult = await onWhatsApp(billingId)
          if (waResult?.success) {
            toast.success("Bill sent on WhatsApp")
          } else {
            toast.error(waResult?.message || "WhatsApp sending failed")
          }
        }

        // Reset form for next bill
        resetForm()
      } else {
        toast.error(result.message || "Failed to create bill")
      }
    })
  }

  const resetForm = () => {
    if (!preselectedPatient) setSelectedPatient(null)
    setItems(prefilledItems || [])
    setDiscountValue("")
    setPaymentMethod("CASH")
    setTransactionId("")
    setSplitCash("")
    setSplitUpi("")
    setSplitCard("")
    setNotes("")
  }

  // Extended payment options = standard + CREDIT
  const paymentOptions = [
    ...PAYMENT_METHOD_OPTIONS,
    { value: "SPLIT", label: "Split Payment" },
    { value: "CREDIT", label: "Credit / Due" },
  ]

  return (
    <Card className="border-gray-200">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <CardTitle className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <IndianRupee className="h-5 w-5 text-blue-600" />
            {title || `${billingType} Billing`}
          </CardTitle>
          {pendingBillNumber && (
            <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-300 font-semibold px-2.5 py-1 text-xs">
              Collecting Pending Bill: {pendingBillNumber}
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-5">
        {/* Success Banner */}
        {lastBill && (
          <div className="flex items-center gap-3 p-3 rounded-lg bg-green-50 border border-green-200">
            <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0" />
            <div className="flex-1">
              <p className="text-sm font-medium text-green-800">
                Bill <span className="font-bold">{lastBill.billNumber}</span>{" "}
                {pendingBillNumber ? "paid and settled successfully" : "processed successfully"}
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              className="border-green-300 text-green-700 hover:bg-green-100"
              onClick={() =>
                window.open(
                  `/dashboard/finance/billing/${lastBill.billingId}`,
                  "_blank"
                )
              }
            >
              <Printer className="h-3.5 w-3.5 mr-1" /> View Bill
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setLastBill(null)}
              className="text-green-600"
            >
              ✕
            </Button>
          </div>
        )}

        {/* Patient Selection */}
        {showPatientSearch && (
          <div>
            <Label className="text-sm font-medium text-gray-700 mb-1.5 block">
              Patient
            </Label>
            <PatientSearch
              selectedPatient={selectedPatient}
              onSelect={(p) => setSelectedPatient(p)}
              onClear={() => setSelectedPatient(null)}
              disabled={isPending}
            />
          </div>
        )}

        <Separator />

        {/* Line Items */}
        <div>
          <Label className="text-sm font-medium text-gray-700 mb-2 block">
            Line Items
          </Label>
          {items.length > 0 && (
            <div className="rounded-lg border border-gray-200 overflow-hidden mb-3">
              <Table>
                <TableHeader>
                  <TableRow className="bg-gray-50">
                    <TableHead className="text-xs font-semibold">Description</TableHead>
                    <TableHead className="text-xs font-semibold w-16 text-center">
                      Qty
                    </TableHead>
                    <TableHead className="text-xs font-semibold w-24 text-right">
                      Rate (₹)
                    </TableHead>
                    <TableHead className="text-xs font-semibold w-24 text-right">
                      Total (₹)
                    </TableHead>
                    <TableHead className="w-10"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items.map((item, i) => (
                    <TableRow key={i} className="text-sm">
                      <TableCell className="py-2">
                        <span className="flex items-center gap-1.5">
                          {item.description}
                          {item.isAutoDetected && (
                            <Badge
                              variant="outline"
                              className="text-[10px] px-1.5 py-0 border-blue-200 text-blue-600"
                            >
                              <Sparkles className="h-2.5 w-2.5 mr-0.5" />
                              Auto
                            </Badge>
                          )}
                        </span>
                      </TableCell>
                      <TableCell className="py-2 text-center">{item.quantity}</TableCell>
                      <TableCell className="py-2 text-right font-medium">
                        {item.unitPrice.toLocaleString("en-IN")}
                      </TableCell>
                      <TableCell className="py-2 text-right font-medium">
                        {(item.quantity * item.unitPrice).toLocaleString("en-IN")}
                      </TableCell>
                      <TableCell className="py-2">
                        <button
                          type="button"
                          onClick={() => removeItem(i)}
                          className="p-1 rounded hover:bg-red-50 text-gray-400 hover:text-red-500"
                          disabled={isPending}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}

          {/* Add Item Row */}
          <div className="flex items-end gap-2">
            <div className="flex-1">
              <Input
                placeholder="Item description"
                value={newItemDesc}
                onChange={(e) => setNewItemDesc(e.target.value)}
                className="text-sm"
                disabled={isPending}
                onKeyDown={(e) => e.key === "Enter" && addItem()}
              />
            </div>
            <div className="w-16">
              <Input
                placeholder="Qty"
                type="number"
                min="1"
                value={newItemQty}
                onChange={(e) => setNewItemQty(e.target.value)}
                className="text-sm text-center"
                disabled={isPending}
              />
            </div>
            <div className="w-28">
              <Input
                placeholder="Rate ₹"
                type="number"
                min="0"
                step="0.01"
                value={newItemPrice}
                onChange={(e) => setNewItemPrice(e.target.value)}
                className="text-sm text-right"
                disabled={isPending}
                onKeyDown={(e) => e.key === "Enter" && addItem()}
              />
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={addItem}
              disabled={isPending}
              className="border-blue-200 text-blue-600 hover:bg-blue-50"
            >
              <Plus className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <Separator />

        {/* Summary */}
        <div className="bg-gray-50 rounded-lg p-4 space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">Subtotal</span>
            <span className="font-medium">
              ₹{subtotal.toLocaleString("en-IN")}
            </span>
          </div>

          {/* Discount */}
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-600 w-20">Discount</span>
            <div className="flex-1 flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => setDiscountMode("flat")}
                className={`px-2 py-1 rounded text-xs font-medium transition-colors ${discountMode === "flat" ? "bg-blue-100 text-blue-700" : "bg-gray-200 text-gray-500"}`}
              >
                <IndianRupee className="h-3 w-3 inline" />
              </button>
              <button
                type="button"
                onClick={() => setDiscountMode("percent")}
                className={`px-2 py-1 rounded text-xs font-medium transition-colors ${discountMode === "percent" ? "bg-blue-100 text-blue-700" : "bg-gray-200 text-gray-500"}`}
              >
                <Percent className="h-3 w-3 inline" />
              </button>
              <Input
                type="number"
                min="0"
                placeholder="0"
                value={discountValue}
                onChange={(e) => setDiscountValue(e.target.value)}
                className="w-24 h-8 text-sm text-right"
                disabled={isPending}
              />
            </div>
            {discountAmount > 0 && (
              <span className="text-sm text-red-600 font-medium">
                -₹{discountAmount.toLocaleString("en-IN")}
              </span>
            )}
          </div>

          <Separator className="my-1" />

          <div className="flex justify-between text-base font-bold">
            <span className="text-gray-800">Net Amount</span>
            <span className="text-blue-700">
              ₹{netAmount.toLocaleString("en-IN")}
            </span>
          </div>
        </div>

        <Separator />

        {/* Payment Method */}
        <div className="space-y-3">
          <Label className="text-sm font-medium text-gray-700">
            Payment Method
          </Label>
          <Select value={paymentMethod} onValueChange={setPaymentMethod} disabled={isPending}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {paymentOptions.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Transaction ID for non-cash */}
          {["UPI", "CARD", "BANK_TRANSFER"].includes(paymentMethod) && (
            <div>
              <Label className="text-xs text-gray-500">Transaction ID / Ref</Label>
              <Input
                placeholder="Enter transaction reference"
                value={transactionId}
                onChange={(e) => setTransactionId(e.target.value)}
                className="mt-1"
                disabled={isPending}
              />
            </div>
          )}

          {/* Split Payment */}
          {isSplit && (
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 space-y-2">
              <p className="text-xs font-medium text-amber-700">
                Split total must equal ₹{netAmount.toLocaleString("en-IN")}
              </p>
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <Label className="text-xs text-gray-500">Cash ₹</Label>
                  <Input
                    type="number"
                    min="0"
                    placeholder="0"
                    value={splitCash}
                    onChange={(e) => setSplitCash(e.target.value)}
                    className="mt-0.5"
                    disabled={isPending}
                  />
                </div>
                <div>
                  <Label className="text-xs text-gray-500">UPI ₹</Label>
                  <Input
                    type="number"
                    min="0"
                    placeholder="0"
                    value={splitUpi}
                    onChange={(e) => setSplitUpi(e.target.value)}
                    className="mt-0.5"
                    disabled={isPending}
                  />
                </div>
                <div>
                  <Label className="text-xs text-gray-500">Card ₹</Label>
                  <Input
                    type="number"
                    min="0"
                    placeholder="0"
                    value={splitCard}
                    onChange={(e) => setSplitCard(e.target.value)}
                    className="mt-0.5"
                    disabled={isPending}
                  />
                </div>
              </div>
              <p
                className={`text-xs font-medium ${Math.abs(splitTotal - netAmount) <= 1 ? "text-green-600" : "text-red-600"}`}
              >
                Split Total: ₹{splitTotal.toLocaleString("en-IN")}
                {Math.abs(splitTotal - netAmount) <= 1 ? " ✓" : " ✗ Mismatch"}
              </p>
            </div>
          )}

          {/* Credit Warning */}
          {paymentMethod === "CREDIT" && (
            <div className="bg-orange-50 border border-orange-200 rounded-lg p-3">
              <p className="text-xs font-medium text-orange-700">
                ⚠ This bill will be marked as CREDIT / DUE. The patient will owe
                ₹{netAmount.toLocaleString("en-IN")}.
              </p>
            </div>
          )}
        </div>

        {/* Notes */}
        <div>
          <Label className="text-sm font-medium text-gray-700">Notes (optional)</Label>
          <Input
            placeholder="Add billing notes..."
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="mt-1"
            disabled={isPending}
          />
        </div>

        <Separator />

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-2">
          <Button
            className="flex-1 bg-blue-600 hover:bg-blue-700 text-white"
            onClick={() => handleSubmit("print")}
            disabled={isPending || items.length === 0 || !selectedPatient}
          >
            {isPending ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <Printer className="h-4 w-4 mr-2" />
            )}
            Bill & Print
          </Button>
          <Button
            variant="outline"
            className="flex-1 border-green-300 text-green-700 hover:bg-green-50"
            onClick={() => handleSubmit("whatsapp")}
            disabled={isPending || items.length === 0 || !selectedPatient}
          >
            {isPending ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <MessageCircle className="h-4 w-4 mr-2" />
            )}
            Bill & WhatsApp
          </Button>
          <Button
            variant="outline"
            className="flex-1"
            onClick={() => handleSubmit("save")}
            disabled={isPending || items.length === 0 || !selectedPatient}
          >
            {isPending ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <Save className="h-4 w-4 mr-2" />
            )}
            Save Only
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
